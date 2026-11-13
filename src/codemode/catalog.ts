/**
 * The Code Mode "spec".
 *
 * `search` gives the model a JSON object (`spec`) describing the server's
 * capabilities. The model writes JavaScript to filter it, so the full catalog
 * never enters the model context. `execute` gives the model the same SDK
 * described here.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import type { Tool, ToolAnnotations } from "../types/index.js";

export interface CodeModeToolSpec {
  name: string;
  description: string;
  annotations?: ToolAnnotations;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface CodeModeSdkMethod {
  signature: string;
  description: string;
}

export interface CodeModeSpec {
  /** Every classic MCP tool exposed by this server. */
  tools: CodeModeToolSpec[];
  /** Methods available on the `hass` object inside `execute`. */
  hass: Record<string, CodeModeSdkMethod>;
  /** Methods available on the `tools` object inside `execute`. */
  toolsApi: Record<string, CodeModeSdkMethod>;
  /** Other globals available inside `execute`. */
  helpers: Record<string, CodeModeSdkMethod>;
  /** Short usage notes / examples. */
  notes: string[];
}

function cleanJsonSchema(schema: unknown): Record<string, unknown> {
  if (schema === null || schema === undefined || typeof schema !== "object") {
    return { type: "object", properties: {} };
  }
  // Keep `definitions`: zod-to-json-schema emits $ref pointers for nested
  // schemas, and dropping definitions would leave those pointers dangling.
  const { $schema: _schema, ...rest } = schema as Record<string, unknown>;
  return rest;
}

function schemaFor(schema: Tool["parameters"] | undefined): Record<string, unknown> {
  if (!schema) return { type: "object", properties: {} };
  try {
    return cleanJsonSchema(zodToJsonSchema(schema));
  } catch {
    // Some tools use schemas zod-to-json-schema cannot represent. The model
    // can still discover the tool by name/description and call it.
    return { type: "object", properties: {}, additionalProperties: true };
  }
}

/** Build a JSON-safe catalog entry for one tool. */
export function toToolSpec(tool: Tool): CodeModeToolSpec {
  const spec: CodeModeToolSpec = {
    name: tool.name,
    description: tool.description,
    inputSchema: schemaFor(tool.parameters),
  };

  if (tool.annotations !== undefined) spec.annotations = tool.annotations;
  if (tool.outputSchema) {
    try {
      spec.outputSchema = cleanJsonSchema(zodToJsonSchema(tool.outputSchema));
    } catch {
      // Output schema is advisory; omit it if it cannot be converted.
    }
  }

  return spec;
}

/**
 * Build the object exposed to `search` code as `spec`.
 *
 * Keep this deterministic and free of live HA data: `search` must stay
 * offline and cheap. Use `execute` + `hass.getStates()` for live data.
 */
export function buildCodeModeSpec(tools: Tool[]): CodeModeSpec {
  return {
    tools: tools.map(toToolSpec),
    hass: {
      getStates: {
        signature: "hass.getStates(): Promise<Entity[]>",
        description: "Return every Home Assistant entity state.",
      },
      getState: {
        signature: "hass.getState(entity_id: string): Promise<Entity>",
        description: "Return one entity by ID (e.g. 'light.kitchen').",
      },
      callService: {
        signature:
          "hass.callService(domain: string, service: string, data?: object): Promise<unknown>",
        description:
          "Call a Home Assistant service, e.g. hass.callService('light', 'turn_on', { entity_id: 'light.kitchen', brightness: 128 }).",
      },
      request: {
        signature:
          "hass.request({ method: string, path: string, body?: object }): Promise<unknown>",
        description:
          "Call any Home Assistant REST endpoint under /api/. path is relative, e.g. '/api/config'. Other hosts are rejected.",
      },
      getServices: {
        signature: "hass.getServices(): Promise<unknown>",
        description: "List every service domain/service (GET /api/services).",
      },
      getConfig: {
        signature: "hass.getConfig(): Promise<unknown>",
        description: "Return Home Assistant core configuration (GET /api/config).",
      },
      getHistory: {
        signature:
          "hass.getHistory({ entity_id: string, start_time?: string, end_time?: string }): Promise<unknown>",
        description: "Return state history for one entity.",
      },
    },
    toolsApi: {
      list: {
        signature: "tools.list(): Promise<Array<{ name: string, description: string }>>",
        description: "List the classic MCP tools available to tools.call().",
      },
      call: {
        signature: "tools.call(name: string, args?: object): Promise<unknown>",
        description:
          "Invoke any classic MCP tool by name. Arguments are validated with the tool's Zod schema. JSON-string results are parsed automatically.",
      },
    },
    helpers: {
      sleep: {
        signature: "sleep(ms: number): Promise<void>",
        description: "Wait between calls. Capped at 10 seconds and by the execution deadline.",
      },
      console: {
        signature: "console.log(...args): void",
        description: "Write a line to the server log. Output is not returned to the model.",
      },
    },
    notes: [
      "Pass an async arrow function, e.g. async () => { ... }.",
      "Use search to discover tools and their input schemas before calling them.",
      "Return only the data you need; large results are truncated at CODE_MODE_MAX_OUTPUT_BYTES.",
      "execute is sandboxed: no filesystem, no environment variables, no arbitrary network access.",
    ],
  };
}
