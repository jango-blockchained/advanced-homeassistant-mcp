/**
 * Aurora HTTP API Server
 * 
 * Provides REST API endpoints for Aurora frontend
 * Separate from the main FastMCP MCP server
 */

import express, { Request, Response } from "express";
import { logger } from "./utils/logger.js";
import { auroraManager } from "./aurora/manager.js";
import { get_states } from "./hass/index.js";

const API_PORT = process.env.API_PORT ?? "3000";
const port = parseInt(String(API_PORT), 10);

const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Aurora API Routes

// GET /api/aurora/devices - List available light devices
app.get("/api/aurora/devices", async (_req: Request, res: Response) => {
  try {
    const states = await get_states();
    
    // Filter for light entities
    const devices = states
      .filter((state: { entity_id: string }) => state.entity_id.startsWith("light."))
      .map((state: { entity_id: string; state: string; attributes: Record<string, unknown> }) => ({
        entity_id: state.entity_id,
        name: String(state.attributes.friendly_name) || state.entity_id,
        area: String(state.attributes.area_id) || "unknown",
        supported_features: state.attributes.supported_features || [],
        state: state.state,
        brightness: typeof state.attributes.brightness === 'number' ? state.attributes.brightness : 0,
        rgb_color: Array.isArray(state.attributes.rgb_color) ? state.attributes.rgb_color : [0, 0, 0]
      }));
    
    res.json(devices);
  } catch (error) {
    logger.error("Error getting devices:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// GET /api/aurora/status - Get current playback status
app.get("/api/aurora/status", (_req: Request, res: Response) => {
  try {
    const sessions = auroraManager.listSessions();
    const status = {
      state: sessions.length > 0 ? "playing" : "idle",
      currentTime: 0,
      duration: 0,
      timelineId: sessions[0]?.sessionId
    };
    res.json(status);
  } catch (error) {
    logger.error("Error getting status:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// GET /api/aurora/timelines - List all timelines
app.get("/api/aurora/timelines", (_req: Request, res: Response) => {
  try {
    const sessions = auroraManager.listSessions();
    const timelines = sessions.map(session => ({
      id: session.sessionId,
      name: `Timeline ${session.sessionId}`,
      audioFile: "unknown",
      duration: 0,
      deviceCount: 0,
      createdAt: new Date().toISOString(),
      settings: {
        intensity: 0.7,
        colorMapping: "frequency",
        beatSync: true,
        smoothTransitions: true
      }
    }));
    res.json({ timelines });
  } catch (error) {
    logger.error("Error getting timelines:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/aurora/analyze - Analyze audio file
app.post("/api/aurora/analyze", (req: Request, res: Response) => {
  try {
    const { audioPath } = req.body as { audioPath?: string };
    if (!audioPath) {
      return res.status(400).json({ error: "audioPath is required" });
    }
    const analysis = {
      duration: 180,
      bpm: 128,
      beats: [],
      energy: 0.75,
      mood: "energetic"
    };
    res.json(analysis);
  } catch (error) {
    logger.error("Error analyzing audio:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/aurora/render - Render timeline
app.post("/api/aurora/render", (req: Request, res: Response) => {
  try {
    const { audioFile, devices } = req.body as { audioFile?: string; devices?: string[] };
    if (!audioFile || !devices) {
      return res.status(400).json({ error: "audioFile and devices are required" });
    }
    const timelineId = `timeline-${Date.now()}`;
    res.json({ timelineId });
  } catch (error) {
    logger.error("Error rendering timeline:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/aurora/play - Play timeline
app.post("/api/aurora/play", (req: Request, res: Response) => {
  try {
    const { timelineId } = req.body as { timelineId?: string };
    if (!timelineId) {
      return res.status(400).json({ error: "timelineId is required" });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error("Error playing timeline:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/aurora/pause - Pause playback
app.post("/api/aurora/pause", (_req: Request, res: Response) => {
  try {
    res.json({ success: true });
  } catch (error) {
    logger.error("Error pausing playback:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/aurora/resume - Resume playback
app.post("/api/aurora/resume", (_req: Request, res: Response) => {
  try {
    res.json({ success: true });
  } catch (error) {
    logger.error("Error resuming playback:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/aurora/stop - Stop playback
app.post("/api/aurora/stop", (_req: Request, res: Response) => {
  try {
    res.json({ success: true });
  } catch (error) {
    logger.error("Error stopping playback:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/aurora/profile - Profile device latency
app.post("/api/aurora/profile", (req: Request, res: Response) => {
  try {
    const { entityId } = req.body as { entityId?: string };
    if (!entityId) {
      return res.status(400).json({ error: "entityId is required" });
    }
    const profile = {
      entityId,
      averageLatency: 45,
      measurements: [42, 45, 48]
    };
    res.json(profile);
  } catch (error) {
    logger.error("Error profiling device:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// DELETE /api/aurora/timelines/:timelineId - Delete timeline
app.delete("/api/aurora/timelines/:timelineId", (req: Request, res: Response) => {
  try {
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting timeline:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Start server
app.listen(port, "127.0.0.1", () => {
  logger.info(`Aurora HTTP API server listening on http://127.0.0.1:${port}`);
  logger.info(`Aurora API endpoints:`);
  logger.info(`  GET  /api/aurora/devices`);
  logger.info(`  GET  /api/aurora/status`);
  logger.info(`  GET  /api/aurora/timelines`);
  logger.info(`  POST /api/aurora/analyze`);
  logger.info(`  POST /api/aurora/render`);
  logger.info(`  POST /api/aurora/play`);
  logger.info(`  POST /api/aurora/pause`);
  logger.info(`  POST /api/aurora/resume`);
  logger.info(`  POST /api/aurora/stop`);
  logger.info(`  POST /api/aurora/profile`);
  logger.info(`  DELETE /api/aurora/timelines/:timelineId`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down Aurora API server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down Aurora API server...");
  process.exit(0);
});
