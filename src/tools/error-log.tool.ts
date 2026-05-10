/**
 * Error Log Tool for Home Assistant
 *
 * Retrieves and parses the Home Assistant error log into structured entries.
 * Supports filtering by severity, component, keyword search, and time range.
 * Falls back to the Supervisor core logs endpoint for HAOS / Supervised installs.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../utils/logger.js";
import { APP_CONFIG } from "../config/app.config.js";
import { Tool } from "../types/index.js";

const LEVEL_ORDER: Record<string, number> = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
};

const LOG_ENTRY_RE =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?) (ERROR|WARNING|INFO|DEBUG) \(([^)]+)\) \[([^\]]+)\] (.*)$/;

// eslint-disable-next-line no-control-regex -- the ESC byte is the literal start of ANSI color sequences emitted by Supervisor logs
const ANSI_RE = /\x1b\[[0-9;]*m/g;

interface LogEntry {
  timestamp: string;
  level: string;
  thread: string;
  component: string;
  message: string;
}

function parseLogEntries(text: string): LogEntry[] {
  const lines = text.split("\n");
  const entries: LogEntry[] = [];

  for (const line of lines) {
    const match = line.match(LOG_ENTRY_RE);
    if (match) {
      entries.push({
        timestamp: match[1],
        level: match[2],
        thread: match[3],
        component: match[4],
        message: match[5],
      });
    } else if (entries.length > 0 && line.length > 0) {
      // Continuation line (stack trace, etc.) — append to previous entry
      entries[entries.length - 1].message += "\n" + line;
    }
  }

  return entries;
}

interface TimestampRange {
  oldest: string | null;
  newest: string | null;
}

function getTimestampRange(entries: LogEntry[]): TimestampRange {
  if (entries.length === 0) return { oldest: null, newest: null };
  return {
    oldest: entries[0].timestamp,
    newest: entries[entries.length - 1].timestamp,
  };
}

const errorLogSchema = z.object({
  entries: z
    .number()
    .min(1)
    .optional()
    .default(50)
    .describe("Number of most recent entries to return (default: 50)"),
  level: z
    .enum(["ERROR", "WARNING", "INFO", "DEBUG"])
    .optional()
    .describe(
      "Minimum severity level. ERROR = only errors, WARNING = errors + warnings, etc.",
    ),
  component: z
    .string()
    .optional()
    .describe(
      'Filter by component name (case-insensitive substring match, e.g. "zwave", "mqtt")',
    ),
  search: z
    .string()
    .optional()
    .describe("Keyword search in message body (case-insensitive)"),
  oldest: z
    .string()
    .optional()
    .describe(
      'Only entries at or after this timestamp (e.g. "2026-04-05 10:00:00")',
    ),
  newest: z
    .string()
    .optional()
    .describe(
      'Only entries at or before this timestamp (e.g. "2026-04-05 12:00:00")',
    ),
});

type ErrorLogParams = z.infer<typeof errorLogSchema>;

type LogSource = "error_log" | "supervisor";

async function fetchLogText(): Promise<{ text: string; source: LogSource }> {
  const headers = { Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}` };

  // Standard HA installs expose /api/error_log (file-backed).
  let response = await fetch(`${APP_CONFIG.HASS_HOST}/api/error_log`, {
    headers,
  });

  if (response.ok) {
    return { text: await response.text(), source: "error_log" };
  }
  const firstStatus = response.status;

  // HAOS / Supervised installs only have the Supervisor core logs endpoint.
  response = await fetch(`${APP_CONFIG.HASS_HOST}/api/hassio/core/logs`, {
    headers: { ...headers, Accept: "text/plain" },
  });

  if (!response.ok) {
    throw new UserError(
      `Failed to fetch error log: /api/error_log -> ${firstStatus}, ` +
        `/api/hassio/core/logs -> ${response.status} ${response.statusText}`,
    );
  }

  // Supervisor logs include ANSI color codes; strip them before parsing.
  const text = (await response.text()).replace(ANSI_RE, "");
  return { text, source: "supervisor" };
}

async function executeGetErrorLog(rawParams: unknown): Promise<string> {
  const params: ErrorLogParams = errorLogSchema.parse(rawParams);
  try {
    const { text: logText, source } = await fetchLogText();
    const allEntries = parseLogEntries(logText);
    const totalRange = getTimestampRange(allEntries);
    const total = {
      count: allEntries.length,
      oldest: totalRange.oldest,
      newest: totalRange.newest,
    };

    let filtered = allEntries;
    const filtersApplied: string[] = [];

    // Filter by time range
    if (params.oldest) {
      filtersApplied.push("oldest");
      filtered = filtered.filter((e) => e.timestamp >= params.oldest!);
    }
    if (params.newest) {
      filtersApplied.push("newest");
      filtered = filtered.filter((e) => e.timestamp <= params.newest!);
    }

    // Filter by severity level
    if (params.level) {
      filtersApplied.push("level");
      const minLevel = LEVEL_ORDER[params.level];
      filtered = filtered.filter(
        (e) => (LEVEL_ORDER[e.level] ?? 0) >= minLevel,
      );
    }

    // Filter by component
    if (params.component) {
      filtersApplied.push("component");
      const comp = params.component.toLowerCase();
      filtered = filtered.filter((e) =>
        e.component.toLowerCase().includes(comp),
      );
    }

    // Filter by keyword search in message
    if (params.search) {
      filtersApplied.push("search");
      const keyword = params.search.toLowerCase();
      filtered = filtered.filter((e) =>
        e.message.toLowerCase().includes(keyword),
      );
    }

    const availableRange = getTimestampRange(filtered);
    const available = {
      count: filtered.length,
      oldest: availableRange.oldest,
      newest: availableRange.newest,
    };

    // Slice to last N entries
    const sliced = filtered.slice(-params.entries);
    const returnedRange = getTimestampRange(sliced);

    return JSON.stringify({
      source,
      total,
      available,
      returned: {
        count: sliced.length,
        oldest: returnedRange.oldest,
        newest: returnedRange.newest,
      },
      filters_applied: filtersApplied,
      entries: sliced,
    });
  } catch (error) {
    if (error instanceof UserError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get error log: ${message}`);
    throw new UserError(`Failed to retrieve error log: ${message}`);
  }
}

export const errorLogTool: Tool = {
  name: "get_error_log",
  description:
    "Retrieve the Home Assistant error log as structured entries. Each entry includes timestamp, severity level, thread, component, and message (including stack traces). Supports filtering by minimum severity level, component name, keyword search in message body, and time range. Works with both standard HA installations (/api/error_log) and HAOS/Supervisor setups (/api/hassio/core/logs).",
  parameters: errorLogSchema,
  execute: executeGetErrorLog,
  annotations: {
    title: "Get Error Log",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};
