/**
 * Claude Integration Utilities
 *
 * This file contains utilities for integrating with Claude AI models.
 */

import { z } from "zod";
import { ToolDefinition } from "../types.js";

/**
 * Convert a Zod schema to a JSON Schema for Claude
 */
export function zodToJsonSchema(schema: z.ZodType<any>): any {
  if (!schema) return { type: "object", properties: {} };

  // Handle ZodObject
  if (schema instanceof z.ZodObject) {
    const shape = (schema as any)._def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }

      properties[key] = zodTypeToJsonSchema(value as z.ZodType<any>);
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  // Handle other schema types
  return { type: "object", properties: {} };
}

/**
 * Convert a Zod type to JSON Schema type
 */
export function zodTypeToJsonSchema(zodType: z.ZodType<any>): any {
  if (zodType instanceof z.ZodString) {
    return { type: "string" };
  } else if (zodType instanceof z.ZodNumber) {
    return { type: "number" };
  } else if (zodType instanceof z.ZodBoolean) {
    return { type: "boolean" };
  } else if (zodType instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodTypeToJsonSchema((zodType as any)._def.type),
    };
  } else if (zodType instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: (zodType as any)._def.values,
    };
  } else if (zodType instanceof z.ZodOptional) {
    return zodTypeToJsonSchema((zodType as any)._def.innerType);
  } else if (zodType instanceof z.ZodObject) {
    return zodToJsonSchema(zodType);
  }

  return { type: "object" };
}

/**
 * Create Claude-compatible tool definitions from MCP tools
 *
 * @param tools Array of MCP tool definitions
 * @returns Array of Claude-compatible tool definitions
 */
export function createClaudeToolDefinitions(tools: ToolDefinition[]): any[] {
  return tools.map((tool) => {
    const parameters = tool.parameters
      ? zodToJsonSchema(tool.parameters)
      : { type: "object", properties: {} };

    return {
      name: tool.name,
      description: tool.description,
      parameters,
    };
  });
}

/**
 * Format an MCP tool execution request for Claude
 */
export function formatToolExecutionRequest(toolName: string, params: Record<string, unknown>): any {
  return {
    type: "tool_use",
    name: toolName,
    parameters: params,
  };
}

/**
 * Parse a Claude tool execution response
 */
export function parseToolExecutionResponse(response: any): {
  success: boolean;
  result?: any;
  error?: string;
} {
  if (!response || typeof response !== "object") {
    return {
      success: false,
      error: "Invalid tool execution response",
    };
  }

  if ("error" in response) {
    return {
      success: false,
      error: typeof response.error === "string" ? response.error : JSON.stringify(response.error),
    };
  }

  return {
    success: true,
    result: response,
  };
}
