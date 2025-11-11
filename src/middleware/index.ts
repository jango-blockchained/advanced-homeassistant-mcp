import { Request, Response, NextFunction } from "express";
import { HASS_CONFIG, RATE_LIMIT_CONFIG } from "../config/index.js";
import rateLimit from "express-rate-limit";
import { TokenManager } from "../security/index.js";
import sanitizeHtml from "sanitize-html";
import helmet from "helmet";
import { SECURITY_CONFIG } from "../config/security.config.ts";

// Rate limiter middleware with enhanced configuration
export const rateLimiter = rateLimit({
  windowMs: SECURITY_CONFIG.RATE_LIMIT_WINDOW,
  max: SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: "Too Many Requests",
    error: "Rate limit exceeded. Please try again later.",
    timestamp: new Date().toISOString(),
  },
});

// WebSocket rate limiter middleware with enhanced configuration
export const wsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: RATE_LIMIT_CONFIG.WEBSOCKET,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many WebSocket connections, please try again later.",
    reset_time: new Date(Date.now() + 60 * 1000).toISOString(),
  },
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
});

// Authentication middleware with enhanced security
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      error: "Missing or invalid authorization header",
      timestamp: new Date().toISOString(),
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const clientIp = req.ip || req.socket.remoteAddress || "";

  const validationResult = TokenManager.validateToken(token, clientIp);

  if (!validationResult.valid) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      error: validationResult.error || "Invalid token",
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

// Enhanced security headers middleware using helmet
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// Wrapper for helmet middleware to handle mock responses in tests
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Basic security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("X-Download-Options", "noopen");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self'",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  next();
};

/**
 * Validates incoming requests for proper authentication and content type
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void => {
  // Skip validation for health and MCP schema endpoints
  if (req.path === "/health" || req.path === "/mcp") {
    return next();
  }

  // Validate content type for non-GET requests
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return res.status(415).json({
        success: false,
        message: "Unsupported Media Type",
        error: "Content-Type must be application/json",
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Validate authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      error: "Missing or invalid authorization header",
      timestamp: new Date().toISOString(),
    });
  }

  // Validate token
  const token = authHeader.replace("Bearer ", "");
  const validationResult = TokenManager.validateToken(token, req.ip);
  if (!validationResult.valid) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      error: validationResult.error || "Invalid token",
      timestamp: new Date().toISOString(),
    });
  }

  // Validate request body structure
  if (req.method !== "GET" && req.body) {
    if (typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Bad Request",
        error: "Invalid request body structure",
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

/**
 * Sanitizes input data to prevent XSS attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    const sanitizeValue = (value: unknown): unknown => {
      if (typeof value === "string") {
        let sanitized = value;
        // Remove script tags and their content
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        // Remove style tags and their content
        sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
        // Remove remaining HTML tags
        sanitized = sanitized.replace(/<[^>]+>/g, "");
        // Remove javascript: protocol
        sanitized = sanitized.replace(/javascript:/gi, "");
        // Remove event handlers
        sanitized = sanitized.replace(/on\w+\s*=\s*(?:".*?"|'.*?'|[^"'>\s]+)/gi, "");
        // Trim whitespace
        return sanitized.trim();
      } else if (typeof value === "object" && value !== null) {
        const result: Record<string, unknown> = {};
        Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
          result[key] = sanitizeValue(val);
        });
        return result;
      }
      return value;
    };

    req.body = sanitizeValue(req.body) as Record<string, unknown>;
  }
  next();
};

/**
 * Handles errors in a consistent way
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): Response => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const response: Record<string, unknown> = {
    success: false,
    message: "Internal Server Error",
    timestamp: new Date().toISOString(),
  };

  if (isDevelopment) {
    response.error = err.message;
    response.stack = err.stack;
  }

  return res.status(500).json(response);
};

// Export all middleware
export const middleware = {
  rateLimiter,
  wsRateLimiter,
  securityHeaders,
  validateRequest,
  sanitizeInput,
  authenticate,
  errorHandler,
};
