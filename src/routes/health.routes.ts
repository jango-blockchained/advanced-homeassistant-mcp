import { Router } from "express";
import { APP_CONFIG } from "../config/app.config";

const router = Router();

// Health check endpoint
router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: APP_CONFIG.VERSION,
  });
});

export { router as healthRoutes };
