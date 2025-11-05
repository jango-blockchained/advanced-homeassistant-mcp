/**
 * MCP Server with HTTP transport (using fastmcp)
 *
 * This module provides a standalone MCP server that communicates
 * over HTTP using JSON-RPC 2.0 protocol, implemented using the fastmcp framework.
 * This is used for hosted deployments on Smithery.ai
 *
 * FastMCP 3.x best practices:
 * - Use httpStream transport for hosted deployments
 * - Proper error handling and logging
 * - Tool parameter validation
 * - Resource cleanup on shutdown
 */

import { logger } from "./utils/logger.js";
import { FastMCP } from "fastmcp";
import { tools } from "./tools/index.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7123;

async function main(): Promise<void> {
    try {
        logger.info("Initializing FastMCP server with HTTP transport...");

        // Create the FastMCP server instance following v3.x best practices
        const server = new FastMCP({
            name: "Home Assistant MCP Server",
            version: "1.0.0"
        });

        logger.info("FastMCP server instance created (v3.22.0+)");

        // Add tools from the tools registry
        const toolCount = tools.length;
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
                    }
                });
                logger.info(`Added tool: ${tool.name}`);
            } catch (error) {
                logger.error(`Failed to add tool ${tool.name}:`, error);
            }
        }

        logger.info(`Successfully added ${toolCount} tools`);

        // Add system_info tool following best practices
        server.addTool({
            name: "system_info",
            description: "Get basic information about this MCP server",
            execute: async (): Promise<string> => Promise.resolve(
                "Home Assistant MCP Server (HTTP Transport, FastMCP 3.x)"
            )
        });
        logger.info("Added system_info tool");

        // Start the server with HTTP stream transport (FastMCP 3.x)
        logger.info("Starting FastMCP with HTTP stream transport...");
        
        await server.start({
            transportType: "httpStream",
            httpStream: {
                port: port,
                endpoint: "/mcp"
            }
        });

        logger.info(`✓ FastMCP HTTP server listening on port ${port}`);
        logger.info(`✓ MCP endpoint available at http://localhost:${port}/mcp`);
        logger.info(`✓ Server transport: HTTP Stream (FastMCP 3.x)`);
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

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        logger.error("Error starting Home Assistant MCP HTTP server (fastmcp):", error);
        process.exit(1);
    }
}

main().catch(error => {
    logger.error("Uncaught error in main (fastmcp):", error);
    process.exit(1);
});
