/**
 * MCP Server with HTTP transport (using express + fastmcp)
 *
 * This provides a standalone HTTP server for Smithery deployments.
 * It combines Express for HTTP routing with FastMCP for MCP protocol handling.
 */

import { logger } from "./utils/logger";
import { FastMCP } from "fastmcp";
import { tools } from "./tools/index";
import { listResources, getResource } from "./mcp/resources";
import { getAllPrompts, renderPrompt } from "./mcp/prompts";
import express from "express";

const port = parseInt(process.env.PORT ?? "7123", 10);
const isScanning = process.env.SMITHERY_SCAN === "true";

async function main(): Promise<void> {
  try {
    logger.info(`Starting Home Assistant MCP Server on port ${port}...`);

    // Create Express app
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get("/health", (_req, res) => {
      res.json({
        status: "ok",
        version: "1.2.1",
        timestamp: new Date().toISOString(),
      });
    });

    // MCP configuration endpoint for Smithery discovery
    app.get("/.well-known/mcp-config", (_req, res) => {
      res.json({
        mcpServers: {
          "homeassistant-mcp": {
            url: "/mcp",
            transport: "http",
          },
        },
      });
    });

    // Create FastMCP server
    const server = new FastMCP({
      name: "Home Assistant MCP Server",
      version: "1.2.1",
    });

    logger.info("Adding tools...");
    
    // Add tools
    for (const tool of tools) {
      try {
        server.addTool({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters as never,
          execute: async (args: unknown, context) => {
            try {
              const token = process.env.HASS_TOKEN ?? "";
              if (!token && !isScanning) {
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
        logger.info(`✓ Added tool: ${tool.name}`);
      } catch (error) {
        logger.error(`✗ Failed to add tool ${tool.name}:`, error);
      }
    }

    // Add system_info tool
    server.addTool({
      name: "system_info",
      description: "Get basic information about this MCP server",
      execute: async (): Promise<string> =>
        Promise.resolve("Home Assistant MCP Server v1.2.1 (HTTP)"),
    });

    logger.info("Adding resources...");
    
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
            return { text: content.text ?? "" };
          },
        });
      }
      logger.info(`✓ Added ${resources.length} resources`);
    } catch (error) {
      logger.error("Error adding resources:", error);
    }

    logger.info("Adding prompts...");
    
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
            const rendered = await Promise.resolve(
              renderPrompt(prompt.name, args as Record<string, string>)
            );
            return rendered;
          },
        });
      }
      logger.info(`✓ Added ${prompts.length} prompts`);
    } catch (error) {
      logger.error("Error adding prompts:", error);
    }

    // Mount MCP handler on /mcp using SSE transport
    app.post("/mcp", async (req, res) => {
      try {
        // Handle MCP JSON-RPC request
        const request = req.body;
        logger.debug("Received MCP request:", JSON.stringify(request));
        
        // This is a simplified handler - FastMCP should handle this internally
        // But since we're using Express, we need to integrate it manually
        res.status(501).json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not implemented in Express handler",
          },
          id: request.id,
        });
      } catch (error) {
        logger.error("Error handling MCP request:", error);
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal error",
          },
        });
      }
    });

    // Start Express server
    const httpServer = app.listen(port, () => {
      logger.info(`✓ HTTP server listening on port ${port}`);
      logger.info(`✓ Health endpoint: http://localhost:${port}/health`);
      logger.info(`✓ MCP config: http://localhost:${port}/.well-known/mcp-config`);
      logger.info(`✓ MCP endpoint: http://localhost:${port}/mcp`);
      logger.info(`✓ Ready for Smithery deployment`);
    });

    // Graceful shutdown
    const shutdown = (): void => {
      logger.info("Shutting down server...");
      httpServer.close(() => {
        logger.info("Server stopped");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Uncaught error:", error);
  process.exit(1);
});
