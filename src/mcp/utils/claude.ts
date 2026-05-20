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
    // _def.shape() is `any`-typed in zod's d.ts; pin to a typed record so
    // iteration produces ZodType values (not any).
    const shape = (schema as z.ZodObject<z.ZodRawShape>)._def.shape() as Record<string, z.ZodType<unknown>>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }

      properties[key] = zodTypeToJsonSchema(value);
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
    // ZodArray's _def is typed as any; type-assert to recover the element schema.
    const def = zodType._def as { type: z.ZodType<unknown> };
    return {
      type: "array",
      items: zodTypeToJsonSchema(def.type),
    };
  } else if (zodType instanceof z.ZodEnum) {
    const def = zodType._def as { values: readonly string[] };
    return {
      type: "string",
      enum: def.values,
    };
  } else if (zodType instanceof z.ZodOptional) {
    const def = zodType._def as { innerType: z.ZodType<unknown> };
    return zodTypeToJsonSchema(def.innerType);
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
