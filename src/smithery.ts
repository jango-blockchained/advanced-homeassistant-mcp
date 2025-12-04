/**
 * Smithery Entry Point for Home Assistant MCP Server
 *
 * This module provides the entry point required by Smithery's TypeScript runtime.
 * It exports a default function that creates and returns an MCP server instance.
 *
 * @see https://smithery.ai/docs/build/deployments/typescript
 */

import { FastMCP } from "fastmcp";
import { tools } from "./tools/index";
import { listResources, getResource } from "./mcp/resources";
import { getAllPrompts, renderPrompt } from "./mcp/prompts";
import { logger } from "./utils/logger";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Configuration schema for Smithery
 * All fields are optional to allow tool discovery without requiring configuration
 */
export const configSchema = z.object({
  hassToken: z
    .string()
    .optional()
    .describe("Long-lived access token for Home Assistant. Create one in your Home Assistant profile under Security > Long-lived access tokens"),
  hassHost: z
    .string()
    .optional()
    .default("http://homeassistant.local:8123")
    .describe("Home Assistant server URL (e.g., http://192.168.1.100:8123)"),
  hassSocketUrl: z
    .string()
    .optional()
    .describe("Home Assistant WebSocket URL. Auto-derived from hassHost if not provided"),
  debug: z
    .boolean()
    .optional()
    .default(false)
    .describe("Enable debug logging for troubleshooting connection issues"),
});

/**
 * Tool annotations following MCP specification for trust & safety
 */
interface ToolAnnotations {
  /** Human-readable title for the tool */
  title?: string;
  /** If true, the tool does not modify any state */
  readOnlyHint?: boolean;
  /** If true, the tool may perform destructive operations */
  destructiveHint?: boolean;
  /** If true, the tool may interact with external systems */
  openWorldHint?: boolean;
}

/**
 * Get MCP annotations for a tool based on its behavior
 */
function getToolAnnotations(toolName: string): ToolAnnotations {
  // Format name as title
  const title = toolName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

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

export default async function createServer({ config }: { config?: z.infer<typeof configSchema> } = {}): Promise<FastMCP> {
  // Set environment variables from config (only if provided)
  if (config?.hassToken) process.env.HASS_TOKEN = config.hassToken;
  if (config?.hassHost) process.env.HASS_HOST = config.hassHost;
  if (config?.hassSocketUrl) process.env.HASS_SOCKET_URL = config.hassSocketUrl;
  if (config?.debug) process.env.DEBUG = "true";

  // Check if we're in scan mode (Smithery discovery)
  const isScanning = process.env.SMITHERY_SCAN === "true" || !config?.hassToken;

  logger.info(`Initializing Home Assistant MCP Server for Smithery${isScanning ? " (discovery mode)" : ""}...`);

  // Create the FastMCP server instance
  const server = new FastMCP({
    name: "Home Assistant MCP Server",
    version: "1.2.1",
  });

  logger.info("FastMCP server instance created");

  // Add tools from the tools registry with proper annotations
  for (const tool of tools) {
    try {
      const annotations = getToolAnnotations(tool.name);
      
      // Convert Zod schema to JSON Schema for proper MCP tool description
      let inputSchema: Record<string, unknown>;
      try {
        const jsonSchema = zodToJsonSchema(tool.parameters, {
          name: tool.name,
          $refStrategy: "none",
        });
        inputSchema = jsonSchema as Record<string, unknown>;
      } catch {
        // Fallback to passing schema directly
        inputSchema = tool.parameters as unknown as Record<string, unknown>;
      }
      
      server.addTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as never,
        annotations: annotations as never,
        execute: async (args: unknown, context) => {
          try {
            // Check for token during execution, not registration
            if (!isScanning && !process.env.HASS_TOKEN) {
              throw new Error("Home Assistant token not configured. Please provide hassToken in server configuration.");
            }
            context.log.debug(`Executing tool ${tool.name}`);
            const result = await tool.execute(args as never);
            return result as never;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            context.log.error(`Error executing tool ${tool.name}: ${errorMsg}`);
            throw error;
          }
        },
      });
      logger.info(`Added tool: ${tool.name} (${annotations.title})`);
    } catch (error) {
      logger.error(`Failed to add tool ${tool.name}:`, error);
    }
  }

  // Add system_info tool with proper annotations
  server.addTool({
    name: "system_info",
    description: "Get basic information about this MCP server including version, capabilities, and Home Assistant connection status",
    annotations: {
      title: "System Info",
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    } as never,
    execute: async (): Promise<string> => {
      const hasToken = Boolean(process.env.HASS_TOKEN);
      const hassHost = process.env.HASS_HOST || "not configured";
      
      return JSON.stringify({
        name: "Home Assistant MCP Server",
        version: "1.2.1",
        description: "Control your smart home through AI assistants",
        hassHost,
        connected: hasToken,
        toolCount: tools.length + 1,
        capabilities: ["tools", "resources", "prompts"],
      }, null, 2);
    },
  });

  // Add resources
  try {
    const resources = await listResources();
    for (const resource of resources) {
      server.addResource({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        load: async () => {
          const content = await getResource(resource.uri);
          if (!content) {
            throw new Error(`Failed to get resource: ${resource.uri}`);
          }
          const text = content.text ?? "";
          return { text };
        },
      });
      logger.info(`Added resource: ${resource.uri}`);
    }
    logger.info(`Successfully added ${resources.length} resources`);
  } catch (error) {
    logger.error("Error adding resources:", error);
  }

  // Add prompts
  try {
    const prompts = getAllPrompts();
    for (const prompt of prompts) {
      server.addPrompt({
        name: prompt.name,
        description: prompt.description,
        arguments:
          prompt.arguments?.map((arg) => ({
            name: arg.name,
            description: arg.description,
            required: arg.required || false,
          })) || [],
        load: async (args) => {
          const rendered = await Promise.resolve(renderPrompt(prompt.name, args as Record<string, string>));
          return rendered;
        },
      });
      logger.info(`Added prompt: ${prompt.name}`);
    }
    logger.info(`Successfully added ${prompts.length} prompts`);
  } catch (error) {
    logger.error("Error adding prompts:", error);
  }

  logger.info("Home Assistant MCP Server initialized successfully");

  // Return the underlying MCP server object as required by Smithery
  // Note: FastMCP wraps the MCP SDK server, we need to return the raw server
  // @ts-expect-error - FastMCP internal server property
  return server.mcpServer || server;
}
