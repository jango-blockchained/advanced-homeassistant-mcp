/**
 * Code Mode tools: `search` and `execute`.
 *
 * These are the only two tools exposed when `CODE_MODE=only`. `search` runs
 * JavaScript against an in-memory spec of the server's tools; `execute` runs
 * JavaScript against a sandboxed Home Assistant SDK. Both take a single `code`
 * argument containing an async arrow function.
 */

import { z } from "zod";
import type { Tool } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { buildCodeModeSpec } from "./catalog.js";
import { getCodeModeConfig } from "./config.js";
import { createHostBridge, type HostBridge } from "./bridge.js";
import { CodeModeSandboxError, CodeModeTimeoutError, runInSandbox } from "./sandbox.js";

const codeSchema = z.object({
  code: z
    .string()
    .min(1)
    .describe(
      "JavaScript async arrow function to run. It receives no arguments; use the documented globals.",
    ),
});

type CodeModeParams = z.infer<typeof codeSchema>;

function parseParams(params: unknown): CodeModeParams {
  const parsed = codeSchema.safeParse(params);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid Code Mode parameters: ${issues}`);
  }
  return parsed.data;
}

function logConsoleOutput(tool: string, logs: string[]): void {
  if (logs.length === 0) return;
  logger.debug(`[code-mode] ${tool} console output:\n${logs.join("\n")}`);
}

function toUserFacingError(error: unknown): Error {
  if (error instanceof CodeModeTimeoutError) return error;
  if (error instanceof CodeModeSandboxError) return error;
  if (error instanceof Error) return error;
  return new Error(String(error));
}

/**
 * Tools return JSON strings so they work with every transport: the custom
 * MCPServer passes results through, while FastMCP expects a string or a
 * content array. Returning a raw object makes FastMCP try to validate it as a
 * CallToolResult.
 */
function serializeResult(value: unknown): string {
  if (value === undefined) return "null";
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({
      error: `Code Mode result is not JSON-serializable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

/**
 * `search` is intentionally offline. It gets the spec and nothing else, so a
 * search cannot accidentally mutate the house or make network calls.
 */
const offlineBridge: HostBridge = (operation) =>
  Promise.reject(new Error(`${operation} is not available in search(); use execute() instead`));

export const codeModeSearchTool: Tool = {
  name: "search",
  description: [
    "Search this server's MCP tool catalog and Home Assistant SDK by running JavaScript against `spec`.",
    "`spec.tools` is an array of { name, description, inputSchema, annotations }.",
    "`spec.hass`, `spec.toolsApi`, and `spec.helpers` document the `execute()` SDK.",
    "Pass an async arrow function; return only the data you need.",
    "Example: async () => spec.tools.filter(t => /light/i.test(t.name + ' ' + t.description)).map(({ name, description }) => ({ name, description }))",
  ].join(" "),
  parameters: codeSchema,
  annotations: {
    title: "Search Code Mode API",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  execute: async (params: CodeModeParams): Promise<unknown> => {
    const config = getCodeModeConfig();
    try {
      const { code } = parseParams(params);
      const { tools } = await import("../tools/index.js");
      const spec = buildCodeModeSpec(tools);

      const result = await runInSandbox({
        code,
        spec,
        bridge: offlineBridge,
        timeoutMs: config.timeoutMs,
        maxOutputBytes: config.maxOutputBytes,
        memoryLimitBytes: config.memoryLimitBytes,
        maxStackSizeBytes: config.maxStackSizeBytes,
      });

      logConsoleOutput("search", result.logs);
      return serializeResult(result.value);
    } catch (error) {
      logger.warn(
        `[code-mode] search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw toUserFacingError(error);
    }
  },
};

export const codeModeExecuteTool: Tool = {
  name: "execute",
  description: [
    "Execute JavaScript against Home Assistant in a sandboxed QuickJS VM.",
    "Globals: `hass` (getStates, getState, callService, request, getServices, getConfig, getHistory),",
    "`tools` (list, call), `sleep`, and `console`.",
    "Pass an async arrow function; it must return a JSON-serializable value.",
    "No filesystem, environment variables, or arbitrary network access.",
    "Example: async () => { const states = await hass.getStates(); return states.filter(s => s.entity_id.startsWith('light.')).map(s => s.entity_id); }",
  ].join(" "),
  parameters: codeSchema,
  annotations: {
    title: "Execute Code Mode",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  execute: async (params: CodeModeParams): Promise<unknown> => {
    const config = getCodeModeConfig();
    try {
      const { code } = parseParams(params);
      const result = await runInSandbox({
        code,
        bridge: createHostBridge(config),
        timeoutMs: config.timeoutMs,
        maxOutputBytes: config.maxOutputBytes,
        memoryLimitBytes: config.memoryLimitBytes,
        maxStackSizeBytes: config.maxStackSizeBytes,
      });

      logConsoleOutput("execute", result.logs);
      return serializeResult(result.value);
    } catch (error) {
      logger.warn(
        `[code-mode] execute failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw toUserFacingError(error);
    }
  },
};

/** Both Code Mode tools, in the order clients should discover them. */
export const codeModeTools: Tool[] = [codeModeSearchTool, codeModeExecuteTool];
