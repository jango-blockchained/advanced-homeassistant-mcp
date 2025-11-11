import { Router } from "express";
import { MCP_SCHEMA } from "../mcp/schema.js";
import { middleware } from "../middleware/index.js";
import { sseManager } from "../sse/index.js";
import { v4 as uuidv4 } from "uuid";
import { TokenManager } from "../security/index.js";
import { tools } from "../tools/index.js";
import { Tool } from "../interfaces/index.js";

const router = Router();

// MCP schema endpoint - no auth required as it's just the schema
router.get("/mcp", (_req, res) => {
  res.json(MCP_SCHEMA);
});

// MCP execute endpoint - requires authentication
router.post("/mcp/execute", middleware.authenticate, async (req, res) => {
  try {
    const { tool: toolName, parameters } = req.body;

    // Find the requested tool
    const tool = tools.find((t: Tool) => t.name === toolName);
    if (!tool) {
      res.status(404).json({
        success: false,
        message: `Tool '${toolName}' not found`,
      });
      return;
    }

    // Execute the tool with the provided parameters
    const result = await tool.execute(parameters);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

// Health check endpoint
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
});

// List devices endpoint
router.get("/list_devices", middleware.authenticate, async (req, res) => {
  try {
    const tool = tools.find((t: Tool) => t.name === "list_devices");
    if (!tool) {
      res.status(404).json({
        success: false,
        message: "Tool not found",
      });
      return;
    }

    const result = await tool.execute({
      token: req.headers.authorization?.replace("Bearer ", ""),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

// Device control endpoint
router.post("/control", middleware.authenticate, async (req, res) => {
  try {
    const tool = tools.find((t: Tool) => t.name === "control");
    if (!tool) {
      res.status(404).json({
        success: false,
        message: "Tool not found",
      });
      return;
    }

    const result = await tool.execute({
      ...req.body,
      token: req.headers.authorization?.replace("Bearer ", ""),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

// SSE endpoints
router.get("/subscribe_events", middleware.wsRateLimiter, (req, res) => {
  try {
    // Get token from query parameter
    const token = req.query.token?.toString();

    if (!token || !TokenManager.validateToken(token)) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid token",
      });
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Send initial connection message
    res.write(
      `data: ${JSON.stringify({
        type: "connection",
        status: "connected",
        timestamp: new Date().toISOString(),
      })}\n\n`,
    );

    const clientId = uuidv4();
    const client = {
      id: clientId,
      send: (data: string) => {
        res.write(`data: ${data}\n\n`);
      },
    };

    // Add client to SSE manager
    const sseClient = sseManager.addClient(client, token);
    if (!sseClient || !sseClient.authenticated) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: sseClient ? "Authentication failed" : "Maximum client limit reached",
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );
      res.end();
      return;
    }

    // Subscribe to events if specified
    const events = req.query.events?.toString().split(",").filter(Boolean);
    if (events?.length) {
      events.forEach((event) => sseManager.subscribeToEvent(clientId, event));
    }

    // Subscribe to entity if specified
    const entityId = req.query.entity_id?.toString();
    if (entityId) {
      sseManager.subscribeToEntity(clientId, entityId);
    }

    // Subscribe to domain if specified
    const domain = req.query.domain?.toString();
    if (domain) {
      sseManager.subscribeToDomain(clientId, domain);
    }

    // Handle client disconnect
    req.on("close", () => {
      sseManager.removeClient(clientId);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

/**
 * SSE Statistics Endpoint
 * Returns detailed statistics about SSE connections and subscriptions.
 *
 * @route GET /get_sse_stats
 * @authentication Required - Bearer token
 * @returns {Object} Statistics object containing:
 *   - total_clients: Total number of connected clients
 *   - authenticated_clients: Number of authenticated clients
 *   - total_subscriptions: Total number of active subscriptions
 *   - clients_by_connection_time: Client counts by connection duration
 *   - total_entities_tracked: Number of entities being tracked
 *   - subscriptions: Lists of entity, event, and domain subscriptions
 */
router.get("/get_sse_stats", middleware.authenticate, (_req, res) => {
  try {
    const stats = sseManager.getStatistics();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
