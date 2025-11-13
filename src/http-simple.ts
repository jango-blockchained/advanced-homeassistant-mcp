/**
 * Simple HTTP server for Smithery deployment
 * Provides health and MCP config endpoints
 */

import express from "express";
import { logger } from "./utils/logger";

const port = parseInt(process.env.PORT ?? "7123", 10);

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

// MCP config endpoint for Smithery discovery
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

// MCP endpoint - placeholder for now
app.post("/mcp", (req, res) => {
  logger.info("Received MCP request:", JSON.stringify(req.body));
  const requestId = (req.body as { id?: unknown }).id ?? null;
  res.json({
    jsonrpc: "2.0",
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: "Home Assistant MCP Server",
        version: "1.2.1",
      },
    },
    id: requestId,
  });
});

app.listen(port, () => {
  logger.info(`✓ HTTP server listening on port ${port}`);
  logger.info(`✓ Health: http://localhost:${port}/health`);
  logger.info(`✓ MCP config: http://localhost:${port}/.well-known/mcp-config`);
  logger.info(`✓ MCP endpoint: http://localhost:${port}/mcp`);
});
