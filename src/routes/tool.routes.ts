import { Router } from "express";
import { APP_CONFIG } from "../config/app.config.ts";
import { Tool } from "../types/index.js";

const router = Router();

// Array to track tools
const tools: Tool[] = [];

// List devices endpoint
router.get("/devices", async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token || token !== APP_CONFIG.HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid token",
      });
    }

    const tool = tools.find((t) => t.name === "list_devices");
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    const result = await tool.execute({ token });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

// Control device endpoint
router.post("/control", async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token || token !== APP_CONFIG.HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid token",
      });
    }

    const tool = tools.find((t) => t.name === "control");
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: "Tool not found",
      });
    }

    const result = await tool.execute({
      ...req.body,
      token,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

export { router as toolRoutes };
