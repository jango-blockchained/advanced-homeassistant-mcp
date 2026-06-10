import rateLimit from "express-rate-limit";
import { APP_CONFIG } from "../config/app.config.js";

// Create a limiter for API endpoints
export const apiLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT?.windowMs || 15 * 60 * 1000, // 15 minutes
  max: APP_CONFIG.RATE_LIMIT?.max || 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Create a stricter limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 login requests per hour (no separate auth setting in app.config.ts)
  message: {
    status: "error",
    message: "Too many login attempts from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
