/**
 * MCP Server with HTTP transport (using fastmcp)
 *
 * This module provides a standalone MCP server that communicates
 * over HTTP using JSON-RPC 2.0 protocol, implemented using the fastmcp framework.
 * This is used for hosted deployments on Smithery.ai
 *
 * FastMCP 3.24.0 best practices:
 * - Use httpStream transport for hosted deployments
 * - Enable stateless mode for serverless/load-balanced environments
 * - Configure health endpoint for container orchestration
 * - Proper tool annotations for trust & safety
 * - Progress notifications and streaming output
 * - CORS enabled by default
 */

import { logger } from "./utils/logger";
import { FastMCP } from "fastmcp";
import { tools } from "./tools/index";
import { listResources, getResource } from "./mcp/resources";
import { getAllPrompts, renderPrompt } from "./mcp/prompts";
import express, { type Request, type Response } from "express";
import http from "http";

const port = (process.env.PORT ?? "7123") ? parseInt(process.env.PORT ?? "7123", 10) : 7123;
const isScanning = process.env.SMITHERY_SCAN === "true";
const isStateless = process.env.FASTMCP_STATELESS === "true" || process.env.SMITHERY_STATELESS === "true";
const VERSION = "1.2.1";

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
    logger.info(`Starting server initialization on port ${port}`);
    logger.info(`Initializing FastMCP server with HTTP transport${isScanning ? " (scan mode)" : ""}${isStateless ? " (stateless mode)" : ""}...`);

    // Create the FastMCP server instance following v3.24.0 best practices
    const server = new FastMCP({
      name: "Home Assistant MCP Server",
      version: VERSION,
      // Configure health endpoint for container orchestration
      health: {
        enabled: true,
        message: "ok",
        path: "/health",
        status: 200,
      },
      // Configure ping behavior - enable for HTTP to maintain connection health
      ping: {
        enabled: true,
        intervalMs: 30000, // 30 seconds
        logLevel: "debug",
      },
      // Disable roots support for simpler operation
      roots: {
        enabled: false,
      },
    });

    logger.info(`FastMCP server instance created (v3.24.0)`);

    // Add tools from the tools registry with proper annotations
    const toolCount = tools.length;
    for (const tool of tools) {
      try {
        const annotations = getToolAnnotations(tool.name);
        
        server.addTool({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters as never,
          annotations: annotations as never,
          execute: async (args: unknown, context) => {
            try {
              const token = process.env.HASS_TOKEN ?? "";
              const hasToken = token.length > 0;
              if (!hasToken && !isScanning) {
                throw new Error("Home Assistant token not configured");
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

    logger.info(`Successfully added ${toolCount} tools`);

    // Add system_info tool with proper annotations
    server.addTool({
      name: "system_info",
      description: "Get basic information about this MCP server including version, transport, and connection status",
      annotations: {
        title: "System Info",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      } as never,
      execute: async (): Promise<string> => {
        const hasToken = Boolean(process.env.HASS_TOKEN);
        const hassHost = process.env.HASS_HOST || "not configured";
        return Promise.resolve(JSON.stringify({
          name: "Home Assistant MCP Server",
          version: VERSION,
          transport: "httpStream",
          stateless: isStateless,
          hassHost,
          connected: hasToken,
          toolCount: toolCount + 1,
          capabilities: ["tools", "resources", "prompts"],
        }, null, 2));
      },
    });
    logger.info("Added system_info tool");

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

    // Start the server with HTTP stream transport (FastMCP 3.24.0)
    logger.info(`Starting FastMCP with HTTP stream transport on port ${port}${isStateless ? " (stateless mode)" : ""}...`);

    try {
      // Start FastMCP with custom HTTP handler that includes config endpoints
      // Health endpoint is already configured via FastMCP options
      await server.start({
        transportType: "httpStream",
        httpStream: {
          port: port,
          endpoint: "/mcp",
          // Enable stateless mode for serverless/load-balanced deployments
          stateless: isStateless,
          middleware: (app: express.Application) => {
            // MCP config endpoint for Smithery discovery
            app.get("/.well-known/mcp-config", (_req, res) => {
              res.json({
                mcpServers: {
                  "homeassistant-mcp": {
                    url: "/mcp",
                    transport: "httpStream",
                  },
                },
              });
            });
            
            // Ready endpoint for orchestration
            app.get("/ready", (_req, res) => {
              res.json({
                status: "ready",
                ready: 1,
                total: 1,
                mode: isStateless ? "stateless" : "stateful",
              });
            });
          },
        },
      });
    } catch (startError) {
      logger.error(`Failed to start HTTP server: ${startError instanceof Error ? startError.message : String(startError)}`);
      throw startError;
    }

    logger.info(`✓ FastMCP HTTP server listening on port ${port}`);
    logger.info(`✓ Health check available at http://localhost:${port}/health`);
    logger.info(`✓ Ready check available at http://localhost:${port}/ready`);
    logger.info(`✓ MCP config available at http://localhost:${port}/.well-known/mcp-config`);
    logger.info(`✓ MCP endpoint available at http://localhost:${port}/mcp`);
    logger.info(`✓ SSE endpoint available at http://localhost:${port}/sse`);
    logger.info(`✓ Server transport: HTTP Stream (FastMCP 3.24.0${isStateless ? ", stateless" : ""})`);
    logger.info(`✓ Ready for Smithery.ai hosted deployment`);

    // Graceful shutdown handler
    const shutdown = (): void => {
      logger.info("Shutting down FastMCP server...");
      try {
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error("Error starting Home Assistant MCP HTTP server (fastmcp):", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Uncaught error in main (fastmcp):", error);
  process.exit(1);
});
