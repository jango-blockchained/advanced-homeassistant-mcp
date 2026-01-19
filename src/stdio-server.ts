/**
 * MCP Server with stdio transport (using fastmcp)
 *
 * This module provides a standalone MCP server that communicates
 * over standard input/output using JSON-RPC 2.0 protocol,
 * implemented using the fastmcp framework.
 *
 * FastMCP 3.24.0 best practices:
 * - Use proper tool annotations for trust & safety
 * - Support Standard Schema (Zod, Valibot, ArkType)
 * - Proper error handling with UserError for user-facing errors
 * - Progress reporting and streaming output support
 * - Health-check endpoint configuration
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
import { AppConfig } from "./config/index";

import { logger } from "./utils/logger";
import { tools } from "./tools/index";
import { listResources, getResource } from "./mcp/resources";
import { getAllPrompts, renderPrompt } from "./mcp/prompts";

// Get version from package.json via environment variable
const VERSION = (process.env.npm_package_version ?? "1.2.3") as `${number}.${number}.${number}`;

/**
 * Tool annotations following MCP specification for trust & safety
 */
interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/**
 * Get MCP annotations for a tool based on its behavior
 */
function getToolAnnotations(toolName: string): ToolAnnotations {
  const title = toolName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Read-only tools (safe, no side effects)
  if (toolName.includes("list") || toolName.includes("get") || toolName === "system_info") {
    return { title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
  }

  // Potentially destructive tools
  if (toolName.includes("delete") || toolName.includes("uninstall") || toolName.includes("remove")) {
    return { title, readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };
  }

  // Default: control tools that modify state but aren't destructive
  return { title, readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
}

async function main(): Promise<void> {
  try {
    // Dynamically import FastMCP (ESM module)
    const { FastMCP } = await import("fastmcp");
    
    // Create the FastMCP server instance with proper metadata
    // FastMCP 3.24.0 best practices: configure ping and roots
    const server = new FastMCP({
      name: "Home Assistant MCP Server",
      version: VERSION,
      // Disable ping for stdio transport (unnecessary overhead)
      ping: {
        enabled: false,
      },
      // Disable roots support for simpler operation
      roots: {
        enabled: false,
      },
    });

    logger.info(`Initializing FastMCP server v${VERSION}...`);

    // Add tools from the tools registry with proper annotations
    for (const tool of tools) {
      const annotations = getToolAnnotations(tool.name);
      
      // Pass the Zod schema directly - FastMCP supports StandardSchemaV1
      server.addTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as never,
        annotations: annotations as never,
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
      logger.info(`Added tool: ${tool.name} (${annotations.title})`);
    }

    // Add system info tool with proper annotations
    server.addTool({
      name: "system_info",
      description: "Get basic information about this MCP server including version and capabilities",
      annotations: {
        title: "System Info",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      } as never,
      // eslint-disable-next-line @typescript-eslint/require-await
      execute: async (): Promise<string> => {
        const hasToken = Boolean(process.env.HASS_TOKEN);
        const hassHost = process.env.HASS_HOST || "not configured";
        return JSON.stringify({
          name: "Home Assistant MCP Server",
          version: VERSION,
          transport: "stdio",
          hassHost,
          connected: hasToken,
          toolCount: tools.length + 1,
          capabilities: ["tools", "resources", "prompts"],
        }, null, 2);
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
