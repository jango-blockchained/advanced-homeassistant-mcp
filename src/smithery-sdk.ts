/**
 * Smithery Entry Point for Home Assistant MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { tools } from "./tools/index";
import { listResources, getResource } from "./mcp/resources";
import { getAllPrompts, renderPrompt } from "./mcp/prompts";

/**
 * Configuration schema for Smithery (matching project env vars)
 */
export const configSchema = z.object({
  HASS_TOKEN: z.string().optional().describe("Long-lived access token for Home Assistant"),
  HASS_HOST: z
    .string()
    .optional()
    .default("http://homeassistant.local:8123")
    .describe("Home Assistant server URL"),
  HASS_SOCKET_URL: z.string().optional().describe("Optional: Home Assistant WebSocket URL"),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .optional()
    .default("info")
    .describe("Logging verbosity level"),
});

type ServerConfig = z.infer<typeof configSchema>;

/**
 * Creates the MCP server instance
 */
export default function createServer({ config }: { config?: ServerConfig } = {}) {
  // Apply configuration to environment variables
  if (config?.HASS_TOKEN) process.env.HASS_TOKEN = config.HASS_TOKEN;
  if (config?.HASS_HOST) process.env.HASS_HOST = config.HASS_HOST;
  if (config?.HASS_SOCKET_URL) process.env.HASS_SOCKET_URL = config.HASS_SOCKET_URL;
  if (config?.LOG_LEVEL) process.env.LOG_LEVEL = config.LOG_LEVEL;

  const server = new McpServer({
    name: "Home Assistant MCP Server",
    version: "1.2.3",
  });

  // Register all tools
  for (const tool of tools) {
    let inputSchema: any;
    try {
      const schema = zodToJsonSchema(tool.parameters);
      const { $schema, definitions, ...cleanedSchema } = schema as any;
      inputSchema = cleanedSchema;
    } catch {
      inputSchema = { type: "object", properties: {}, additionalProperties: true };
    }

    server.tool(
      tool.name,
      tool.description,
      {
        type: "object",
        properties: inputSchema.properties || {},
        required: inputSchema.required || [],
      },
      async (args: any) => {
        try {
          if (!process.env.HASS_TOKEN) {
            return {
              content: [{ type: "text", text: "Error: HASS_TOKEN is not configured." }],
              isError: true,
            };
          }
          const result = await tool.execute(args as never);
          return {
            content: [
              {
                type: "text",
                text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Patch annotations
    const toolInstance = (server as any)._tools?.get(tool.name);
    if (toolInstance && tool.annotations) {
      toolInstance.annotations = tool.annotations;
    }
  }

  // Register resources
  const resourceList = [
    {
      uri: "ha://devices/all",
      name: "All Devices",
      description: "Complete list of all devices",
      mimeType: "application/json",
    },
    {
      uri: "ha://config/areas",
      name: "Areas/Rooms",
      description: "Configured areas",
      mimeType: "application/json",
    },
    {
      uri: "ha://summary/dashboard",
      name: "Dashboard Summary",
      description: "Home status overview",
      mimeType: "application/json",
    },
  ];

  for (const res of resourceList) {
    server.resource(res.name, res.uri, async (uri: URL) => {
      const content = await getResource(uri.href);
      return { contents: [content || { uri: uri.href, mimeType: "application/json", text: "{}" }] };
    });
  }

  // Register prompts
  for (const prompt of getAllPrompts()) {
    server.prompt(
      prompt.name,
      prompt.description,
      prompt.arguments?.map((a) => ({
        name: a.name,
        description: a.description,
        required: a.required,
      })) || [],
      async (args: any) => ({
        messages: [
          { role: "user", content: { type: "text", text: renderPrompt(prompt.name, args) } },
        ],
      }),
    );
  }

  return server.server;
}
