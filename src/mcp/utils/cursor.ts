/**
 * Cursor Integration Utilities
 *
 * This file contains utilities for integrating with Cursor IDE.
 */

import { z } from "zod";
import { ToolDefinition } from "../types.js";

/**
 * Create Cursor-compatible tool definitions from MCP tools
 *
 * @param tools Array of MCP tool definitions
 * @returns Array of Cursor-compatible tool definitions
 */
export function createCursorToolDefinitions(tools: ToolDefinition[]): any[] {
  return tools.map((tool) => {
    // Convert parameters to Cursor format
    const parameters = tool.parameters ? extractParametersFromZod(tool.parameters) : {};

    return {
      name: tool.name,
      description: tool.description,
      parameters,
    };
  });
}

/**
 * Extract parameters from a Zod schema for Cursor integration
 */
function extractParametersFromZod(schema: z.ZodType<any>): Record<string, any> {
  if (!(schema instanceof z.ZodObject)) {
    return {};
  }

  const shape = (schema as any)._def.shape();
  const params: Record<string, any> = {};

  for (const [key, value] of Object.entries(shape)) {
    const isRequired = !(value instanceof z.ZodOptional);

    let type = "string";
    let description = "";

    // Get description if available
    try {
      description = value._def.description || "";
    } catch (e) {
      // Ignore if description is not available
    }

    // Determine the type
    if (value instanceof z.ZodString) {
      type = "string";
    } else if (value instanceof z.ZodNumber) {
      type = "number";
    } else if (value instanceof z.ZodBoolean) {
      type = "boolean";
    } else if (value instanceof z.ZodArray) {
      type = "array";
    } else if (value instanceof z.ZodEnum) {
      type = "string";
    } else if (value instanceof z.ZodObject) {
      type = "object";
    } else if (value instanceof z.ZodOptional) {
      // Get the inner type
      const innerValue = value._def.innerType;
      if (innerValue instanceof z.ZodString) {
        type = "string";
      } else if (innerValue instanceof z.ZodNumber) {
        type = "number";
      } else if (innerValue instanceof z.ZodBoolean) {
        type = "boolean";
      } else if (innerValue instanceof z.ZodArray) {
        type = "array";
      } else {
        type = "object";
      }
    }

    params[key] = {
      type,
      description,
      required: isRequired,
    };
  }

  return params;
}

/**
 * Format a tool response for Cursor
 */
export function formatCursorResponse(response: any): any {
  // For now, just return the response as-is
  // Cursor expects a specific format, which may need to be customized
  return response;
}

/**
 * Parse a Cursor tool execution request
 */
export function parseCursorRequest(request: any): {
  success: boolean;
  toolName?: string;
  params?: Record<string, any>;
  error?: string;
} {
  if (!request || typeof request !== "object") {
    return {
      success: false,
      error: "Invalid request format",
    };
  }

  if (!request.name || typeof request.name !== "string") {
    return {
      success: false,
      error: "Missing or invalid tool name",
    };
  }

  return {
    success: true,
    toolName: request.name,
    params: request.parameters || {},
  };
}
