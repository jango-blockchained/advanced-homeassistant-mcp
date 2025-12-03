/**
 * Smithery Entry Point for Home Assistant MCP Server
 *
 * Simple entry point using @smithery/sdk for proper Smithery deployment.
 *
 * @see https://smithery.ai/docs/build/deployments/typescript
 */

import { z } from "zod";
import { tools } from "./tools/index";

/**
 * Configuration schema for Smithery session configuration
 * All fields are optional to allow tool discovery without requiring configuration
 */
export const configSchema = z.object({
  hassToken: z
    .string()
    .optional()
    .describe(
      "Long-lived access token for Home Assistant. Create one in your Home Assistant profile under Security > Long-lived access tokens"
    ),
  hassHost: z
    .string()
    .optional()
    .default("http://homeassistant.local:8123")
    .describe("Home Assistant server URL (e.g., http://192.168.1.100:8123)"),
  hassSocketUrl: z
    .string()
    .optional()
    .describe("Home Assistant WebSocket URL. Auto-derived from hassHost if not provided"),
  debug: z.boolean().optional().default(false).describe("Enable debug logging for troubleshooting connection issues"),
});

type ServerConfig = z.infer<typeof configSchema>;

/**
 * Tool annotations following MCP specification for trust & safety
 */
interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  openWorldHint?: boolean;
}

/**
 * Format tool name as human-readable title
 */
function formatToolTitle(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get MCP annotations for a tool based on its behavior
 */
function getToolAnnotations(toolName: string): ToolAnnotations {
  const title = formatToolTitle(toolName);

  // Read-only tools
  if (toolName.includes("list") || toolName.includes("get") || toolName === "system_info") {
    return { title, readOnlyHint: true, destructiveHint: false, openWorldHint: true };
  }

  // Potentially destructive tools
  if (toolName.includes("delete") || toolName.includes("uninstall") || toolName.includes("remove")) {
    return { title, readOnlyHint: false, destructiveHint: true, openWorldHint: true };
  }

  // Default: control tools that modify state
  return { title, readOnlyHint: false, destructiveHint: false, openWorldHint: true };
}

/**
 * Convert Zod schema to JSON Schema
 */
function zodSchemaToJson(schema: z.ZodType): Record<string, unknown> {
  // Simple conversion for basic types
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType;
      properties[key] = zodSchemaToJson(zodValue);
      
      // Check if not optional
      if (!(zodValue instanceof z.ZodOptional) && !(zodValue instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: "string", description: schema.description };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: "number", description: schema.description };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean", description: schema.description };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodSchemaToJson(schema.element),
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: schema.options,
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodSchemaToJson(schema.unwrap());
  }

  if (schema instanceof z.ZodDefault) {
    const inner = zodSchemaToJson(schema.removeDefault());
    return { ...inner, default: schema._def.defaultValue() };
  }

  // Fallback
  return { type: "object", additionalProperties: true };
}

/**
 * Creates the MCP server instance with all tools
 * Required by Smithery's TypeScript runtime
 */
export default function createServer({ config }: { config?: ServerConfig } = {}) {
  // Apply configuration to environment variables for downstream modules
  if (config?.hassToken) {
    process.env.HASS_TOKEN = config.hassToken;
  }
  if (config?.hassHost) {
    process.env.HASS_HOST = config.hassHost;
  }
  if (config?.hassSocketUrl) {
    process.env.HASS_SOCKET_URL = config.hassSocketUrl;
  }
  if (config?.debug) {
    process.env.DEBUG = "true";
  }

  // Dynamically import the SDK to avoid bundling issues
  const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");

  // Create the MCP server using the official SDK
  const server = new McpServer({
    name: "Home Assistant MCP Server",
    version: "1.2.1",
  });

  // Register all tools with proper MCP annotations and descriptions
  for (const tool of tools) {
    const annotations = getToolAnnotations(tool.name);
    const inputSchema = zodSchemaToJson(tool.parameters);

    server.tool(
      tool.name,
      tool.description,
      inputSchema,
      async (args: Record<string, unknown>) => {
        try {
          const hasToken = Boolean(process.env.HASS_TOKEN);
          if (!hasToken) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: "Home Assistant token not configured",
                    message: "Please configure hassToken in the server settings to use this tool.",
                  }),
                },
              ],
              isError: true,
            };
          }

          const result = await tool.execute(args as never);
          return {
            content: [
              {
                type: "text" as const,
                text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: errorMsg }),
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  // Add system_info tool
  server.tool(
    "system_info",
    "Get basic information about this MCP server including version, capabilities, and Home Assistant connection status",
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    async () => {
      const hasToken = Boolean(process.env.HASS_TOKEN);
      const hassHost = process.env.HASS_HOST || "not configured";

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                name: "Home Assistant MCP Server",
                version: "1.2.1",
                description: "Control your smart home through AI assistants",
                hassHost,
                connected: hasToken,
                toolCount: tools.length + 1,
                capabilities: ["tools", "resources", "prompts"],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Return the underlying server object as required by Smithery
  return server.server;
}
