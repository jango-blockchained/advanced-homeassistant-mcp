/**
 * Minimal stdio-only MCP server
 * No HTTP dependencies, only FastMCP and tools
 */

// Import fastmcp framework
import { FastMCP } from "fastmcp";

// Import only the tools we need (without any server infrastructure)
import { tools } from "./tools/index.js";

async function main(): Promise<void> {
    try {
        // Create the FastMCP server instance  
        const server = new FastMCP({
            name: "Home Assistant MCP Server",
            version: "1.0.6"
        });

        // Add tools from the tools registry
        for (const tool of tools) {
            server.addTool({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
                execute: tool.execute
            });
        }

        // Start the server in stdio mode
        await server.start();
    } catch (error) {
        console.error("Fatal error starting MCP server:", error);
        process.exit(1);
    }
}

// Run the server
main();
