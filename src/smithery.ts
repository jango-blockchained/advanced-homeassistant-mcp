/**
 * Smithery Entry Point for Home Assistant MCP Server
 *
 * This module provides the entry point required by Smithery's TypeScript runtime.
 * It exports a default function that creates and returns an MCP server instance.
 */

import { FastMCP } from "fastmcp";
import { tools } from "./tools/index";
import { listResources, getResource } from "./mcp/resources";
import { getAllPrompts, renderPrompt } from "./mcp/prompts";
import { logger } from "./utils/logger";
import { z } from "zod";

// Configuration schema for Smithery
export const configSchema = z.object({
  hassToken: z.string().describe("Long-lived access token for Home Assistant"),
  hassHost: z.string().default("http://homeassistant.local:8123").describe("Home Assistant host URL"),
  hassSocketUrl: z.string().default("ws://homeassistant.local:8123").describe("Home Assistant WebSocket URL"),
  debug: z.boolean().default(false).describe("Enable debug logging"),
});

export default async function createServer({ config }: { config: z.infer<typeof configSchema> }) {
  // Set environment variables from config
  if (config.hassToken) process.env.HASS_TOKEN = config.hassToken;
  if (config.hassHost) process.env.HASS_HOST = config.hassHost;
  if (config.hassSocketUrl) process.env.HASS_SOCKET_URL = config.hassSocketUrl;
  if (config.debug) process.env.DEBUG = "true";

  logger.info("Initializing Home Assistant MCP Server for Smithery...");

  // Create the FastMCP server instance
  const server = new FastMCP({
    name: "Home Assistant MCP Server",
    version: "1.2.1",
  });

  logger.info("FastMCP server instance created");

  // Add tools from the tools registry
  for (const tool of tools) {
    try {
      server.addTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as never,
        execute: async (args: unknown, context) => {
          try {
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
      logger.info(`Added tool: ${tool.name}`);
    } catch (error) {
      logger.error(`Failed to add tool ${tool.name}:`, error);
    }
  }

  // Add system_info tool
  server.addTool({
    name: "system_info",
    description: "Get basic information about this MCP server",
    execute: async (): Promise<string> =>
      Promise.resolve("Home Assistant MCP Server v1.2.1 (Smithery)"),
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
          const rendered = renderPrompt(prompt.name, args as Record<string, string>);
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

  // Return the FastMCP server instance (Smithery CLI handles the rest)
  return server;
}
