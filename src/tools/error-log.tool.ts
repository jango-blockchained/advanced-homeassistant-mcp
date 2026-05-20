import { z } from "zod";
import { Tool } from "../types/index";
import { APP_CONFIG } from "../config/app.config";

const ErrorLogSchema = z.object({
  lines: z
    .number()
    .optional()
    .describe("Number of recent lines to return (default: all)"),
  search: z
    .string()
    .optional()
    .describe("Filter log lines containing this text (case-insensitive)"),
});

type ErrorLogParams = z.infer<typeof ErrorLogSchema>;

/**
 * Strip ANSI escape codes (color sequences) from log output.
 * The Supervisor logs endpoint returns ANSI-colored text.
 *
 * eslint-disable-next-line: the no-control-regex rule warns about \x1b
 * (ESC) in regexes because it's usually a typo. Here it's intentional and
 * load-bearing — that byte is exactly what an ANSI sequence starts with.
 */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

export const errorLogTool: Tool = {
  name: "get_error_log",
  description:
    "Get the Home Assistant error log. Useful for troubleshooting integrations, automations, and system issues. Works with both standard HA installations (/api/error_log) and HAOS/Supervisor setups (/api/hassio/core/logs).",
  annotations: {
    title: "Get Error Log",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  parameters: ErrorLogSchema,
  execute: async (params: unknown) => {
    try {
      const { lines, search } = params as ErrorLogParams;
      const headers = {
        Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
      };

      // Try /api/error_log first (standard HA with file-based logging)
      let response = await fetch(`${APP_CONFIG.HASS_HOST}/api/error_log`, {
        headers: { ...headers, "Content-Type": "text/plain" },
      });

      let source = "error_log";

      // Fall back to Supervisor core logs (HAOS / Supervised installs)
      if (!response.ok) {
        response = await fetch(
          `${APP_CONFIG.HASS_HOST}/api/hassio/core/logs`,
          { headers: { ...headers, Accept: "text/plain" } },
        );
        source = "supervisor";
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch error log: ${response.status} ${response.statusText}. ` +
            "Neither /api/error_log nor /api/hassio/core/logs are available.",
        );
      }

      let text = await response.text();

      // Supervisor logs contain ANSI color codes
      if (source === "supervisor") {
        text = stripAnsi(text);
      }

      if (search) {
        const needle = search.toLowerCase();
        text = text
          .split("\n")
          .filter((l) => l.toLowerCase().includes(needle))
          .join("\n");
      }

      if (lines) {
        const allLines = text.split("\n");
        text = allLines.slice(-lines).join("\n");
      }

      return JSON.stringify({ success: true, source, log: text });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return JSON.stringify({ success: false, error: errorMessage });
    }
  },
};
