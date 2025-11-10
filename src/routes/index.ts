/**
 * API Routes Module
 *
 * This module exports the main router that combines all API routes
 * into a single router instance. Each route group is mounted under
 * its respective path prefix.
 *
 * @module routes
 */

import { Router } from "express";
import { mcpRoutes } from "./mcp.routes.js";
import sseRoutes from "./sse.routes.js";
import { toolRoutes } from "./tool.routes.js";
import { healthRoutes } from "./health.routes.js";

/**
 * Create main router instance
 * This router will be mounted at /api in the main application
 */
const router = Router();

/**
 * Mount all route groups
 * - /mcp: MCP schema and execution endpoints
 * - /sse: Server-Sent Events endpoints
 * - /tools: Tool management endpoints
 * - /health: Health check endpoint
 */
router.use("/mcp", mcpRoutes);
router.use("/sse", sseRoutes);
router.use("/tools", toolRoutes);
router.use("/health", healthRoutes);

/**
 * Export the configured router
 * This will be mounted in the main application
 */
export { router as apiRoutes };
