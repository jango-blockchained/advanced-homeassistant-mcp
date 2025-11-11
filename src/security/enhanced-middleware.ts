import express, { Request, Response, NextFunction, Router } from "express";
import sanitizeHtml from "sanitize-html";

// Custom error type with status code
class SecurityError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "SecurityError";
  }
}

// Security configuration
const SECURITY_CONFIG = {
  FRAME_OPTIONS: "DENY",
  XSS_PROTECTION: "1; mode=block",
  REFERRER_POLICY: "strict-origin-when-cross-origin",
  HSTS_MAX_AGE: 31536000, // 1 year in seconds
  CSP: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
  },
  // Request validation config
  MAX_URL_LENGTH: 2048,
  MAX_BODY_SIZE: "50kb",
  // Rate limiting config
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000,
    max: 50,
  },
  AUTH_RATE_LIMIT: {
    windowMs: 15 * 60 * 1000,
    max: 3,
  },
};

export class SecurityMiddleware {
  private static app: express.Express;
  private static requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private static authRequestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  static initialize(app: express.Express): void {
    this.app = app;

    // Body parser middleware with size limit
    app.use(
      express.json({
        limit: SECURITY_CONFIG.MAX_BODY_SIZE,
      }),
    );

    // Error handling middleware for body-parser errors
    app.use(
      (error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (error) {
          return res.status(413).json({
            error: true,
            message: "Request body too large",
          });
        }
        next();
      },
    );

    // Main security middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      try {
        // Apply security headers
        SecurityMiddleware.applySecurityHeaders(res);

        // Check rate limits
        SecurityMiddleware.checkRateLimit(req);

        // Validate request
        SecurityMiddleware.validateRequest(req);

        // Sanitize input
        if (req.body) {
          req.body = SecurityMiddleware.sanitizeInput(req.body);
        }

        next();
      } catch (error) {
        if (error instanceof SecurityError) {
          res.status(error.statusCode).json({
            error: true,
            message: error.message,
          });
        } else {
          res.status(500).json({
            error: true,
            message: "Internal server error",
          });
        }
      }
    });
  }

  private static validateRequest(req: Request): void {
    // Check URL length
    if (req.originalUrl.length > SECURITY_CONFIG.MAX_URL_LENGTH) {
      throw new SecurityError("URL too long", 413);
    }

    // Check content type for POST requests
    if (req.method === "POST" && req.headers["content-type"] !== "application/json") {
      throw new SecurityError("Content-Type must be application/json", 415);
    }
  }

  private static sanitizeInput(input: unknown): unknown {
    if (typeof input === "string") {
      return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
      });
    } else if (Array.isArray(input)) {
      return input.map((item) => SecurityMiddleware.sanitizeInput(item));
    } else if (input && typeof input === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = SecurityMiddleware.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }

  private static applySecurityHeaders(res: Response): void {
    // Remove X-Powered-By header
    res.removeHeader("X-Powered-By");

    // Set security headers
    res.setHeader("X-Frame-Options", SECURITY_CONFIG.FRAME_OPTIONS);
    res.setHeader("X-XSS-Protection", SECURITY_CONFIG.XSS_PROTECTION);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", SECURITY_CONFIG.REFERRER_POLICY);
    res.setHeader(
      "Strict-Transport-Security",
      `max-age=${SECURITY_CONFIG.HSTS_MAX_AGE}; includeSubDomains; preload`,
    );
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Origin-Agent-Cluster", "?1");

    // Set Content-Security-Policy
    const cspDirectives = Object.entries(SECURITY_CONFIG.CSP)
      .map(([key, values]) => `${key} ${values.join(" ")}`)
      .join("; ");
    res.setHeader("Content-Security-Policy", cspDirectives);
  }

  private static checkRateLimit(req: Request): void {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const isAuth = req.path.startsWith("/auth");
    const store = isAuth ? SecurityMiddleware.authRequestCounts : SecurityMiddleware.requestCounts;
    const config = isAuth ? SECURITY_CONFIG.AUTH_RATE_LIMIT : SECURITY_CONFIG.RATE_LIMIT;

    let record = store.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + config.windowMs };
    } else {
      record.count++;
      if (record.count > config.max) {
        throw new SecurityError(
          isAuth ? "Too many authentication requests" : "Too many requests",
          429,
        );
      }
    }

    store.set(ip, record);
  }

  // For testing purposes
  public static clearRateLimits(): void {
    SecurityMiddleware.requestCounts.clear();
    SecurityMiddleware.authRequestCounts.clear();
  }
}
