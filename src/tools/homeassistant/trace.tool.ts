/**
 * Trace Tool for Home Assistant
 *
 * This tool provides access to automation and script execution traces via WebSocket API.
 * These operations are WebSocket-only in Home Assistant - no REST endpoints exist.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass_ws } from "../../hass/websocket-manager.js";
import { Tool } from "../../types/index.js";

// Define the schema for our tool parameters
const traceSchema = z.object({
  action: z.enum(["list", "get", "contexts"]).describe("Action to perform with traces"),
  domain: z
    .enum(["automation", "script"])
    .optional()
    .default("automation")
    .describe("Domain to query traces for (automation or script)"),
  item_id: z
    .string()
    .optional()
    .describe(
      "Internal automation/script ID (NOT entity_id). Use the 'id' field from automation list, e.g., 'office_carbon_filter_person_detection' or '1759324158284'. Do NOT include 'automation.' prefix.",
    ),
  run_id: z
    .string()
    .optional()
    .describe("Specific trace run_id from the list results (required for 'get' action)"),
});

// Infer the type from the schema
type TraceParams = z.infer<typeof traceSchema>;

// Shared execution logic
async function executeTraceLogic(params: TraceParams): Promise<string> {
  logger.debug(`Executing trace logic with params: ${JSON.stringify(params)}`);

  // Normalize item_id: strip domain prefix if accidentally included (e.g., 'automation.xyz' → 'xyz')
  if (params.item_id) {
    const domainPrefix = `${params.domain}.`;
    if (params.item_id.startsWith(domainPrefix)) {
      params.item_id = params.item_id.replace(domainPrefix, "");
    }
  }

  try {
    const hass = await get_hass_ws();

    switch (params.action) {
      case "list": {
        const traces = await hass.listTraces(params.domain, params.item_id);
        return JSON.stringify({
          success: true,
          traces,
          total_count: traces.length,
          domain: params.domain,
          ...(params.item_id && { item_id: params.item_id }),
        });
      }

      case "get": {
        if (!params.item_id || !params.run_id) {
          throw new Error("Both item_id and run_id are required for 'get' action");
        }
        const trace = await hass.getTrace(params.domain!, params.item_id, params.run_id);
        return JSON.stringify({
          success: true,
          trace,
          domain: params.domain,
          item_id: params.item_id,
          run_id: params.run_id,
        });
      }

      case "contexts": {
        const contexts = await hass.listTraceContexts(params.domain, params.item_id);
        return JSON.stringify({
          success: true,
          contexts,
          total_count: contexts.length,
          ...(params.domain && { domain: params.domain }),
          ...(params.item_id && { item_id: params.item_id }),
        });
      }

      default:
        throw new Error(`Unknown action: ${params.action}`);
    }
  } catch (error) {
    logger.error(`Error in trace logic: ${error instanceof Error ? error.message : String(error)}`);
    return JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

// Tool object export (for FastMCP)
export const traceTool: Tool = {
  name: "trace",
  description:
    "Access automation and script execution traces. List recent traces, get detailed trace data, or list trace contexts. Useful for debugging automation issues.",
  annotations: {
    title: "Automation Trace",
    description: "View execution traces for automations and scripts",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: traceSchema,
  execute: executeTraceLogic,
};

/**
 * TraceTool class extending BaseTool (for compatibility with src/index.ts)
 */
export class TraceTool extends BaseTool {
  constructor() {
    super({
      name: traceTool.name,
      description: traceTool.description,
      parameters: traceSchema,
      metadata: {
        category: "home_assistant",
        version: "1.0.0",
        tags: ["trace", "automation", "script", "debugging", "home_assistant"],
      },
    });
  }

  /**
   * Execute method for the BaseTool class
   */
  public async execute(params: TraceParams, _context: MCPContext): Promise<string> {
    logger.debug(`Executing TraceTool (BaseTool) with params: ${JSON.stringify(params)}`);
    const validatedParams = this.validateParams(params);
    return await executeTraceLogic(validatedParams);
  }
}
