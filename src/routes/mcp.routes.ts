/**
 * MCP Routes Module
 *
 * This module provides routes for accessing and executing MCP functionality.
 * It includes endpoints for retrieving the MCP schema and executing MCP tools.
 *
 * @module mcp-routes
 */

import { Router } from "express";
import { MCP_SCHEMA } from "../mcp/schema.js";
import { APP_CONFIG } from "../config/app.config.ts";
import { Tool } from "../types/index.js";

/**
 * Create router instance for MCP routes
 */
const router = Router();

/**
 * Array to track registered tools
 * Tools are added to this array when they are registered with the MCP
 */
const tools: Tool[] = [];

/**
 * GET /mcp
 * Returns the MCP schema without requiring authentication
 * This endpoint allows clients to discover available tools and their parameters
 */
router.get("/", (_req, res) => {
  res.json(MCP_SCHEMA);
});

/**
 * POST /mcp/execute
 * Execute a tool with the provided parameters
 * Requires authentication via Bearer token
 *
 * @param {Object} req.body.tool - Name of the tool to execute
 * @param {Object} req.body.parameters - Parameters for the tool
 * @returns {Object} Tool execution result
 * @throws {401} If authentication fails
 * @throws {404} If tool is not found
 * @throws {500} If execution fails
 */
router.post("/execute", async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token || token !== APP_CONFIG.HASS_TOKEN) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid token",
      });
    }

    const { tool: toolName, parameters } = req.body;

    // Find the requested tool
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: `Tool '${toolName}' not found`,
      });
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

/**
 * Export the configured router
 * This will be mounted under /api/mcp in the main application
 */
export { router as mcpRoutes };
