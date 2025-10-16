/**
 * MCP Server with stdio transport (using fastmcp)
 *
 * This module provides a standalone MCP server that communicates
 * over standard input/output using JSON-RPC 2.0 protocol,
 * implemented using the fastmcp framework.
 */

// Potentially keep for logging within tools, if needed
import { logger } from "./utils/logger.js";

// Import fastmcp framework
import { FastMCP } from "fastmcp";

// Import refactored Home Assistant tools
import { tools } from "./tools/index.js";

// --- Removed old imports and setup ---
// import { createStdioServer, BaseTool } from "./mcp/index.js";
// import { MCPContext } from "./mcp/types.js";
// const isCursorMode = process.env.CURSOR_COMPATIBLE === 'true';
// const silentStartup = !isCursorMode;
// const debugMode = process.env.DEBUG_STDIO === 'true';
// function sendNotification(...) { ... }
// class InfoTool extends BaseTool { ... }

async function main(): Promise<void> {
    // --- Temporarily DISABLED Console Silencing --- 
    // let originalConsoleInfo: (...data: any[]) => void | null = null;
    // const isStdio = process.env.USE_STDIO_TRANSPORT === 'true';
    // const isDebug = process.env.DEBUG_STDIO === 'true';
    // if (isStdio && !isDebug) { 
    //     logger.info('Silencing console.info for stdio mode initialization.');
    //     originalConsoleInfo = console.info;
    //     console.info = () => {};
    // }

    try {
        // Create the FastMCP server instance
        const server = new FastMCP({
            name: "Home Assistant MCP Server (fastmcp)",
            version: "1.0.0"
        });

        logger.info("Initializing FastMCP server..."); // Goes to file log

        // Add tools from the tools registry
        for (const tool of tools) {
            // Pass the Zod schema directly - FastMCP supports StandardSchemaV1
            server.addTool({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters as never,
                execute: tool.execute
            });
            logger.info(`Added tool: ${tool.name}`);
        }

        // --- Temporarily removed system_info tool --- 
        server.addTool({
            name: "system_info",
            description: "Get basic information about this MCP server",
            execute: (): Promise<string> => {
                return Promise.resolve("Home Assistant MCP Server (fastmcp)");
            },
        });
        logger.info("Adding tool: system_info");

        // Start the server
        logger.info("Starting FastMCP server with stdio transport...");
        await server.start({
            transportType: "stdio",
        });

        // --- Temporarily DISABLED Console Restore ---
        // if (originalConsoleInfo) {
        //     console.info = originalConsoleInfo;
        //     logger.info('Restored console.info after stdio mode initialization.');
        // }

        logger.info("FastMCP server started successfully and listening on stdio.");

        // Keep process alive explicitly, in case fastmcp doesn't
        process.stdin.resume();
        logger.info("Called process.stdin.resume() to ensure process stays alive.");

    } catch (error) {
        // --- Temporarily DISABLED Console Restore on error ---
        // if (originalConsoleInfo) console.info = originalConsoleInfo;

        logger.error("Error starting Home Assistant MCP stdio server (fastmcp):", error);
        process.exit(1);
    }
}

main().catch(error => {
    logger.error("Uncaught error in main (fastmcp):", error);
    process.exit(1);
}); 