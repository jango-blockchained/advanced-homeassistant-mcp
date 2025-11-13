/**
 * Simple HTTP server for Smithery deployment
 * Provides health and MCP config endpoints with proper MCP protocol handling
 */

import express from "express";
import { logger } from "./utils/logger";
import { tools } from "./tools/index";
import { listResources, getResource } from "./mcp/resources";
import { getAllPrompts, renderPrompt } from "./mcp/prompts";

const port = parseInt(process.env.PORT ?? "7123", 10);

const app = express();
app.use(express.json());

// Enable CORS for Smithery
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "1.2.1",
    timestamp: new Date().toISOString(),
  });
});

// MCP config endpoint for Smithery discovery (with multiple path formats)
const mcpConfigResponse = {
  mcpServers: {
    "homeassistant-mcp": {
      url: "/mcp",
      transport: "http",
    },
  },
};

app.get("/.well-known/mcp-config", (_req, res) => {
  res.json(mcpConfigResponse);
});

// Alternative path without dot
app.get("/well-known/mcp-config", (_req, res) => {
  res.json(mcpConfigResponse);
});

// MCP endpoint - proper JSON-RPC 2.0 implementation
app.post("/mcp", async (req, res) => {
  try {
    const request = req.body as { jsonrpc: string; method: string; params?: unknown; id?: unknown };
    logger.info(`MCP Request: ${request.method}`);

    const requestId = request.id ?? null;

    // Handle different MCP methods
    switch (request.method) {
      case "initialize": {
        res.json({
          jsonrpc: "2.0",
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {
                listChanged: false,
              },
              resources: {
                subscribe: false,
                listChanged: false,
              },
              prompts: {
                listChanged: false,
              },
            },
            serverInfo: {
              name: "Home Assistant MCP Server",
              version: "1.2.1",
            },
          },
          id: requestId,
        });
        break;
      }

      case "notifications/initialized": {
        // Notification - no response needed
        res.status(204).send();
        break;
      }

      case "tools/list": {
        const toolsList = tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
        }));
        res.json({
          jsonrpc: "2.0",
          result: {
            tools: toolsList,
          },
          id: requestId,
        });
        break;
      }

      case "tools/call": {
        const params = request.params as { name: string; arguments: unknown };
        const tool = tools.find((t) => t.name === params.name);
        if (!tool) {
          res.json({
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: `Tool not found: ${params.name}`,
            },
            id: requestId,
          });
          break;
        }

        try {
          const result = await tool.execute(params.arguments as never);
          res.json({
            jsonrpc: "2.0",
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            },
            id: requestId,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          res.json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: errorMsg,
            },
            id: requestId,
          });
        }
        break;
      }

      case "resources/list": {
        const resourcesList = await listResources();
        res.json({
          jsonrpc: "2.0",
          result: {
            resources: resourcesList,
          },
          id: requestId,
        });
        break;
      }

      case "resources/read": {
        const params = request.params as { uri: string };
        const resource = await getResource(params.uri);
        if (!resource) {
          res.json({
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: `Resource not found: ${params.uri}`,
            },
            id: requestId,
          });
          break;
        }
        res.json({
          jsonrpc: "2.0",
          result: {
            contents: [resource],
          },
          id: requestId,
        });
        break;
      }

      case "prompts/list": {
        const promptsList = getAllPrompts();
        res.json({
          jsonrpc: "2.0",
          result: {
            prompts: promptsList,
          },
          id: requestId,
        });
        break;
      }

      case "prompts/get": {
        const params = request.params as { name: string; arguments?: Record<string, string> };
        const prompt = renderPrompt(params.name, params.arguments ?? {});
        res.json({
          jsonrpc: "2.0",
          result: prompt,
          id: requestId,
        });
        break;
      }

      default: {
        res.json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
          id: requestId,
        });
      }
    }
  } catch (error) {
    logger.error("Error handling MCP request:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
      id: null,
    });
  }
});

app.listen(port, () => {
  logger.info(`✓ HTTP server listening on port ${port}`);
  logger.info(`✓ Health: http://localhost:${port}/health`);
  logger.info(`✓ MCP config: http://localhost:${port}/.well-known/mcp-config`);
  logger.info(`✓ MCP endpoint: http://localhost:${port}/mcp`);
  logger.info(`✓ Environment: PORT=${port}, NODE_ENV=${process.env.NODE_ENV ?? 'development'}`);
  logger.info(`✓ Home Assistant: ${process.env.HASS_HOST ?? 'not configured'}`);
});
