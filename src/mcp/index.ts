/**
 * MCP - Model Context Protocol Implementation
 *
 * This is the main entry point for the MCP implementation.
 * It exports all the components needed to use the MCP.
 */

// Core MCP components
export * from "./MCPServer.js";
export * from "./types.js";
export * from "./BaseTool.js";

// Middleware
export * from "./middleware/index.js";

// Transports
export * from "./transports/stdio.transport.js";
export * from "./transports/http.transport.js";

// Utilities for AI assistants
export * from "./utils/claude.js";
export * from "./utils/cursor.js";
export * from "./utils/error.js";

// Helper function to create Claude-compatible tool definitions
export function createClaudeToolDefinitions(tools: any[]): any[] {
  return tools.map((tool) => {
    // Convert Zod schema to JSON Schema
    const parameters = tool.parameters
      ? {
          type: "object",
          properties: {},
          required: [],
        }
      : {
          type: "object",
          properties: {},
          required: [],
        };

    return {
      name: tool.name,
      description: tool.description,
      parameters,
    };
  });
}

// Helper function to create Cursor-compatible tool definitions
export function createCursorToolDefinitions(tools: any[]): any[] {
  return tools.map((tool) => {
    // Convert to Cursor format
    return {
      name: tool.name,
      description: tool.description,
      parameters: {},
    };
  });
}

/**
 * Model Context Protocol (MCP) Module
 *
 * This module provides the core MCP server implementation along with
 * tools, transports, and utilities for integrating with Claude and Cursor.
 */

// Export server implementation
export { MCPServer } from "./MCPServer.js";

// Export type definitions
export * from "./types.js";

// Export transport layers
export { StdioTransport } from "./transports/stdio.transport.js";

// Re-export tools base class
export { BaseTool } from "../tools/base-tool.js";

// Re-export middleware
export * from "./middleware/index.js";

// Import types for proper type definitions
import { MCPServer } from "./MCPServer.js";
import { StdioTransport } from "./transports/stdio.transport.js";
import { ToolDefinition } from "./types.js";

/**
 * Utility function to create Claude-compatible function definitions
 */
export function createClaudeFunctions(tools: ToolDefinition[]): any[] {
  return tools.map((tool) => {
    // If the tool has a toSchemaObject method, use it
    if ("toSchemaObject" in tool && typeof tool.toSchemaObject === "function") {
      return tool.toSchemaObject();
    }

    // Otherwise, manually convert the tool to a Claude function
    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: (tool as any).parameters?.properties || {},
        required: (tool as any).parameters?.required || [],
      },
    };
  });
}

/**
 * Utility function to create Cursor-compatible tool definitions
 */
export function createCursorTools(tools: ToolDefinition[]): any[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: Object.entries((tool as any).parameters?.properties || {}).reduce(
      (acc, [key, value]) => {
        const param = value as any;
        acc[key] = {
          type: param.type || "string",
          description: param.description || "",
          required: ((tool as any).parameters?.required || []).includes(key),
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  }));
}

/**
 * Create a standalone MCP server with stdio transport
 */
export function createStdioServer(
  options: {
    silent?: boolean;
    debug?: boolean;
    tools?: ToolDefinition[];
  } = {},
): { server: MCPServer; transport: StdioTransport } {
  // Create server instance
  const server = MCPServer.getInstance();

  // Create and register stdio transport
  const transport = new StdioTransport({
    silent: options.silent,
    debug: options.debug,
  });

  server.registerTransport(transport);

  // Register tools if provided
  if (options.tools && Array.isArray(options.tools)) {
    server.registerTools(options.tools);
  }

  return { server, transport };
}
