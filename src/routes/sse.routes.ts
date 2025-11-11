import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { sseManager } from "../sse/index.js";
import { TokenManager } from "../security/index.js";
import { middleware } from "../middleware/index.js";

const router = Router();

// SSE endpoints
router.get("/subscribe_events", middleware.wsRateLimiter, (req, res) => {
  try {
    // Get token from query parameter and validate
    const token = req.query.token?.toString() || "";
    const clientIp = req.ip || req.socket.remoteAddress || "";
    const validationResult = TokenManager.validateToken(token, clientIp);

    if (!validationResult.valid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: validationResult.error,
        timestamp: new Date().toISOString(),
      });
    }

    // Set SSE headers with enhanced security
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
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
      ip: clientIp,
      connectedAt: new Date(),
      send: (data: string) => {
        res.write(`data: ${data}\n\n`);
      },
    };

    // Add client to SSE manager with enhanced tracking
    const sseClient = sseManager.addClient(client, token);
    if (!sseClient || !sseClient.authenticated) {
      const errorMessage = JSON.stringify({
        type: "error",
        message: sseClient ? "Authentication failed" : "Maximum client limit reached",
        timestamp: new Date().toISOString(),
      });
      res.write(`data: ${errorMessage}\n\n`);
      return res.end();
    }

    // Handle client disconnect
    req.on("close", () => {
      sseManager.removeClient(clientId);
      console.log(`Client ${clientId} disconnected at ${new Date().toISOString()}`);
    });

    // Handle errors
    req.on("error", (error) => {
      console.error(`SSE Error for client ${clientId}:`, error);
      const errorMessage = JSON.stringify({
        type: "error",
        message: "Connection error",
        timestamp: new Date().toISOString(),
      });
      res.write(`data: ${errorMessage}\n\n`);
      sseManager.removeClient(clientId);
      res.end();
    });
  } catch (error) {
    console.error("SSE Setup Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get SSE stats endpoint
router.get("/stats", async (req, res) => {
  try {
    const stats = await sseManager.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

export default router;
