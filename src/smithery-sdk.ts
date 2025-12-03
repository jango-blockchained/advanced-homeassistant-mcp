/**
 * Smithery Entry Point for Home Assistant MCP Server
 *
 * This module provides the entry point required by Smithery's TypeScript runtime.
 * It exports a default createServer function and configSchema following Smithery's conventions.
 *
 * @see https://smithery.ai/docs/build/deployments/typescript
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { tools } from "./tools/index";
import { listResources, getResource } from "./mcp/resources";
import { getAllPrompts, renderPrompt } from "./mcp/prompts";

/**
 * Configuration schema for Smithery
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
function getToolAnnotations(toolName: string, existingAnnotations?: ToolAnnotations): ToolAnnotations {
  // Use existing annotations if provided by the tool
  if (existingAnnotations) {
    return {
      title: existingAnnotations.title || formatToolTitle(toolName),
      readOnlyHint: existingAnnotations.readOnlyHint,
      destructiveHint: existingAnnotations.destructiveHint,
      openWorldHint: existingAnnotations.openWorldHint ?? true,
    };
  }

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

type ServerConfig = z.infer<typeof configSchema>;

/**
 * Creates the MCP server instance with all tools, resources, and prompts
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

  // Create the MCP server using the official SDK
  const server = new McpServer({
    name: "Home Assistant MCP Server",
    version: "1.2.1",
  });

  // Register all tools with proper MCP annotations and descriptions
  for (const tool of tools) {
    // Use tool's annotations if provided, otherwise generate from name
    const annotations = getToolAnnotations(tool.name, tool.annotations as ToolAnnotations | undefined);

    // Convert Zod schema to JSON Schema for MCP
    let inputSchema: Record<string, unknown>;
    try {
      const schema = zodToJsonSchema(tool.parameters, {
        name: tool.name,
        $refStrategy: "none",
      });
      // Extract the definition if wrapped
      if (schema && typeof schema === "object" && "definitions" in schema) {
        const defs = schema.definitions as Record<string, unknown>;
        inputSchema = (defs[tool.name] as Record<string, unknown>) || schema;
      } else {
        inputSchema = schema as Record<string, unknown>;
      }
    } catch {
      // Fallback to a basic schema
      inputSchema = { type: "object", properties: {}, additionalProperties: true };
    }

    server.tool(
      tool.name,
      tool.description,
      inputSchema,
      async (args: Record<string, unknown>) => {
        try {
          // Check for token during execution if needed
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

  // Register all resources
  const resourceList = [
    { uri: "ha://devices/all", name: "All Devices", description: "Complete list of all Home Assistant devices and their current states", mimeType: "application/json" },
    { uri: "ha://devices/lights", name: "All Lights", description: "All light entities and their current states", mimeType: "application/json" },
    { uri: "ha://devices/climate", name: "Climate Devices", description: "All climate control devices (thermostats, HVAC)", mimeType: "application/json" },
    { uri: "ha://devices/media_players", name: "Media Players", description: "All media player entities and their states", mimeType: "application/json" },
    { uri: "ha://devices/covers", name: "Covers", description: "All cover entities (blinds, curtains, garage doors)", mimeType: "application/json" },
    { uri: "ha://devices/locks", name: "Locks", description: "All lock entities and their states", mimeType: "application/json" },
    { uri: "ha://devices/fans", name: "Fans", description: "All fan entities and their states", mimeType: "application/json" },
    { uri: "ha://devices/vacuums", name: "Vacuum Cleaners", description: "All vacuum entities and their states", mimeType: "application/json" },
    { uri: "ha://devices/alarms", name: "Alarm Panels", description: "All alarm control panel entities", mimeType: "application/json" },
    { uri: "ha://devices/sensors", name: "Sensors", description: "All sensor entities (temperature, humidity, etc.)", mimeType: "application/json" },
    { uri: "ha://devices/switches", name: "Switches", description: "All switch entities", mimeType: "application/json" },
    { uri: "ha://config/areas", name: "Areas/Rooms", description: "Configured areas and rooms in Home Assistant", mimeType: "application/json" },
    { uri: "ha://config/automations", name: "Automations", description: "List of all configured automations", mimeType: "application/json" },
    { uri: "ha://config/scenes", name: "Scenes", description: "List of all configured scenes", mimeType: "application/json" },
    { uri: "ha://summary/dashboard", name: "Dashboard Summary", description: "Quick overview of home status including active devices, temperatures, and security status", mimeType: "application/json" },
  ];

  for (const resource of resourceList) {
    server.resource(
      resource.uri,
      resource.name,
      async (uri: URL) => {
        try {
          const content = await getResource(uri.href);
          if (!content) {
            return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ error: "Resource not found" }) }] };
          }
          return { contents: [content] };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ error: errorMsg }) }] };
        }
      }
    );
  }

  // Register all prompts
  const allPrompts = getAllPrompts();
  for (const prompt of allPrompts) {
    const promptArgs = prompt.arguments?.map(arg => ({
      name: arg.name,
      description: arg.description,
      required: arg.required,
    })) || [];

    server.prompt(
      prompt.name,
      prompt.description,
      promptArgs,
      async (args: Record<string, string>) => {
        const rendered = renderPrompt(prompt.name, args);
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: rendered,
              },
            },
          ],
        };
      }
    );
  }

  // Return the underlying server object as required by Smithery
  return server.server;
}
