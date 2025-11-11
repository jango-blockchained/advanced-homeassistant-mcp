/**
 * MCP Server with stdio transport (using fastmcp)
 *
 * This module provides a standalone MCP server that communicates
 * over standard input/output using JSON-RPC 2.0 protocol,
 * implemented using the fastmcp framework.
 */

// CRITICAL: Load environment variables FIRST, before importing any other modules
// This must execute synchronously at module load time
import { config as dotenvConfig } from "dotenv";
import path from "path";
import fs from "fs";

// Load .env file if it exists - this is crucial for MCP to get HASS_HOST and other config
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenvConfig({ path: envPath, override: true });
} else {
  // Note: .env file not found, relying on environment variables
}

// Also load config module to ensure any additional env setup happens
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AppConfig } from "./config/index.js";

import { logger } from "./utils/logger.js";
import { FastMCP } from "fastmcp";
import { tools } from "./tools/index.js";
import { listResources, getResource } from "./mcp/resources.js";
import { getAllPrompts, renderPrompt } from "./mcp/prompts.js";

// Get version from package.json via environment variable
const VERSION = (process.env.npm_package_version ?? "1.0.7") as `${number}.${number}.${number}`;

async function main(): Promise<void> {
  try {
    // Create the FastMCP server instance with proper metadata
    const server = new FastMCP({
      name: "Home Assistant MCP Server",
      version: VERSION,
    });

    logger.info(`Initializing FastMCP server v${VERSION}...`);

    // Add tools from the tools registry
    for (const tool of tools) {
      // Pass the Zod schema directly - FastMCP supports StandardSchemaV1
      server.addTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as never,
        execute: tool.execute,
      });
      logger.info(`Added tool: ${tool.name}`);
    }

    // Add system info tool
    server.addTool({
      name: "system_info",
      description: "Get basic information about this MCP server",
      // eslint-disable-next-line @typescript-eslint/require-await
      execute: async (): Promise<string> => {
        return `Home Assistant MCP Server v${VERSION}`;
      },
    });
    logger.info("Added tool: system_info");

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
            return {
              text,
            };
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
          // eslint-disable-next-line @typescript-eslint/require-await
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

    // Start the server with stdio transport
    logger.info("Starting FastMCP server with stdio transport...");
    await server.start({
      transportType: "stdio",
    });

    logger.info("FastMCP server started successfully and listening on stdio.");
  } catch (error) {
    logger.error("Error starting Home Assistant MCP stdio server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Uncaught error in main:", error);
  process.exit(1);
});
