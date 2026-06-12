import crypto from "crypto";
import helmet from "helmet";
import { HelmetOptions } from "helmet";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "../utils/logger.js";

// Security configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting state with max size to prevent memory leaks
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_STORE_MAX_SIZE = 10000;

// Cleanup function to remove expired entries
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}

// Run cleanup periodically to prevent memory leaks
setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Every 5 minutes

// Extracted rate limiting logic
export function checkRateLimit(
  ip: string,
  maxRequests: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW,
): boolean {
  const now = Date.now();

  // Prevent memory leaks by limiting store size
  if (rateLimitStore.size >= RATE_LIMIT_STORE_MAX_SIZE) {
    cleanupRateLimitStore();
    // If still too large, remove oldest entries
    if (rateLimitStore.size >= RATE_LIMIT_STORE_MAX_SIZE) {
      const oldestKey = rateLimitStore.keys().next().value;
      if (oldestKey) {
        rateLimitStore.delete(oldestKey);
      }
    }
  }

  const record = rateLimitStore.get(ip) || {
    count: 0,
    resetTime: now + windowMs,
  };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count++;
  rateLimitStore.set(ip, record);

  if (record.count > maxRequests) {
    throw new Error("Too many requests from this IP, please try again later");
  }

  return true;
}

// Rate limiting middleware for Express
export const rateLimiterMiddleware: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
    checkRateLimit(ip);
    next();
  } catch (error) {
    _res.status(429).json({
      error: true,
      message: error instanceof Error ? error.message : "Too many requests",
    });
  }
};

// Extracted security headers logic
export function getSecurityHeaders(): HelmetOptions {
  const config: HelmetOptions = {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
      },
    },
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: {
      policy: ["no-referrer", "strict-origin-when-cross-origin"],
    },
  };

  return config;
}

// Security headers middleware for Express (via helmet)
export const securityHeadersMiddleware = helmet(getSecurityHeaders());

// Extracted request validation logic
export async function validateRequestHeaders(
  request: Request,
  requiredContentType = "application/json",
): Promise<boolean> {
  // Validate content type for POST/PUT/PATCH requests
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentType = request.headers["content-type"];
    if (!contentType || !contentType.includes(requiredContentType)) {
      throw new Error(`Content-Type must be ${requiredContentType}`);
    }
  }

  // Validate request size
  const contentLength = request.headers["content-length"];
  if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
    throw new Error("Request body too large");
  }

  // Validate authorization header if required
  const authHeader = request.headers["authorization"];
  if (authHeader) {
    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer" || !token) {
      throw new Error("Invalid authorization header");
    }

    const ip = request.headers["x-forwarded-for"] as string | undefined;
    const validation = await TokenManager.validateToken(token, ip);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid token");
    }
  }

  return true;
}

// Request validation middleware for Express
export const validateRequestMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await validateRequestHeaders(req);
    next();
  } catch (error) {
    res.status(400).json({
      error: true,
      message: error instanceof Error ? error.message : "Invalid request",
    });
  }
};

// OWASP-recommended HTML escape: covers the six characters that can break out
// of element content or attribute context. Using a dedicated escape (rather
// than a tag-stripping sanitizer) keeps round-tripping predictable: the user's
// original text is preserved verbatim, just rendered inert when interpreted as
// HTML. Order matters: escape & first so we don't double-encode subsequent
// entity references.
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

// Extracted input sanitization logic
export function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return escapeHtml(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]));
  }

  return value;
}

// Input sanitization middleware for Express
export const sanitizeInputMiddleware: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeValue(req.body);
    }
  }
  next();
};

// Extracted error handling logic
export function handleError(error: Error, env?: string): Record<string, unknown> {
  logger.error("Error:", error);

  const nodeEnv = env || process.env.NODE_ENV || "production";
  const baseResponse = {
    error: true,
    message: "Internal server error",
    timestamp: new Date().toISOString(),
  };

  if (nodeEnv === "development") {
    return {
      ...baseResponse,
      error: error.message,
      stack: error.stack,
    };
  }

  return baseResponse;
}

// Error handling middleware for Express
export const errorHandlerMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof joseErrors.JWTInvalid) {
    res.status(401).json(handleError(error));
    return;
  }
  res.status(500).json(handleError(error));
};

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

// Security configuration
const SECURITY_CONFIG = {
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  MAX_TOKEN_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
  MIN_TOKEN_LENGTH: 32,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
};

// Track failed authentication attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

/**
 * Get a Uint8Array key for jose from the JWT_SECRET env variable.
 * jose requires keys as Uint8Array; the secret is encoded as UTF-8.
 */
function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT secret not configured");
  }
  return new TextEncoder().encode(secret);
}

export class TokenManager {
  /**
   * Test/admin hook: returns the live failed-attempts map. Mutating the
   * returned Map directly is supported (tests need to reset between cases),
   * which is why this returns the underlying instance rather than a copy.
   */
  static get failedAttempts(): Map<string, { count: number; lastAttempt: number }> {
    return failedAttempts;
  }

  /**
   * Encrypts a token using AES-256-GCM
   */
  static encryptToken(token: string, key: string): string {
    if (!token || typeof token !== "string") {
      throw new Error("Invalid token");
    }
    if (!key || typeof key !== "string" || key.length < 32) {
      throw new Error("Invalid encryption key");
    }

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key.slice(0, 32), iv);

      const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();

      // Format: algorithm:iv:tag:encrypted
      return `${ALGORITHM}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
    } catch (error) {
      throw new Error("Failed to encrypt token");
    }
  }

  /**
   * Decrypts a token using AES-256-GCM
   */
  static decryptToken(encryptedToken: string, key: string): string {
    if (!encryptedToken || typeof encryptedToken !== "string") {
      throw new Error("Invalid encrypted token");
    }
    if (!key || typeof key !== "string" || key.length < 32) {
      throw new Error("Invalid encryption key");
    }

    try {
      const [algorithm, ivBase64, tagBase64, encryptedBase64] = encryptedToken.split(":");

      if (algorithm !== ALGORITHM || !ivBase64 || !tagBase64 || !encryptedBase64) {
        throw new Error("Invalid encrypted token format");
      }

      const iv = Buffer.from(ivBase64, "base64");
      const tag = Buffer.from(tagBase64, "base64");
      const encrypted = Buffer.from(encryptedBase64, "base64");

      const decipher = crypto.createDecipheriv(ALGORITHM, key.slice(0, 32), iv);
      decipher.setAuthTag(tag);

      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid encrypted token format") {
        throw error;
      }
      throw new Error("Invalid encrypted token");
    }
  }

  /**
   * Validates a JWT token with enhanced security checks
   */
  static async validateToken(
    token: string | undefined | null,
    ip?: string,
  ): Promise<{ valid: boolean; error?: string }> {
    // Check basic token format
    if (!token || typeof token !== "string") {
      return { valid: false, error: "Invalid token format" };
    }

    // Check for token length
    if (token.length < SECURITY_CONFIG.MIN_TOKEN_LENGTH) {
      if (ip) this.recordFailedAttempt(ip);
      return { valid: false, error: "Token length below minimum requirement" };
    }

    // Check for rate limiting
    if (ip && this.isRateLimited(ip)) {
      return {
        valid: false,
        error: "Too many failed attempts. Please try again later.",
      };
    }

    try {
      const secretKey = getJwtSecretKey();

      // Verify token signature and decode using jose
      const { payload } = await jwtVerify(token, secretKey);

      // Verify token structure
      if (!payload || typeof payload !== "object") {
        if (ip) this.recordFailedAttempt(ip);
        return { valid: false, error: "Invalid token structure" };
      }

      // Check required claims
      if (!payload.exp || !payload.iat) {
        if (ip) this.recordFailedAttempt(ip);
        return { valid: false, error: "Token missing required claims" };
      }

      const now = Math.floor(Date.now() / 1000);

      // Check expiration (jose handles this, but double-check for safety)
      if (payload.exp <= now) {
        if (ip) this.recordFailedAttempt(ip);
        return { valid: false, error: "Token has expired" };
      }

      // Check token age (iat is a number in jose's JWTPayload)
      const iat = payload.iat as number | undefined;
      if (iat) {
        const tokenAge = (now - iat) * 1000;
        if (tokenAge > SECURITY_CONFIG.MAX_TOKEN_AGE) {
          if (ip) this.recordFailedAttempt(ip);
          return { valid: false, error: "Token exceeds maximum age limit" };
        }
      }

      // Reset failed attempts on successful validation
      if (ip) {
        failedAttempts.delete(ip);
      }

      return { valid: true };
    } catch (error) {
      // jose throws JWTExpired for expired tokens
      if (error instanceof joseErrors.JWTExpired) {
        return { valid: false, error: "Token has expired" };
      }
      // JWSSignatureVerificationFailed is thrown when the signature doesn't match
      if (error instanceof joseErrors.JWSSignatureVerificationFailed) {
        if (ip) this.recordFailedAttempt(ip);
        return { valid: false, error: "Invalid token signature" };
      }
      // JWTInvalid is thrown for malformed/invalid JWT structures
      if (error instanceof joseErrors.JWTInvalid) {
        if (ip) this.recordFailedAttempt(ip);
        return { valid: false, error: "Invalid token signature" };
      }
      // JWSInvalid is thrown for invalid JWS format (e.g. no dots, bad base64)
      if (error instanceof joseErrors.JWSInvalid) {
        if (ip) this.recordFailedAttempt(ip);
        return { valid: false, error: "Invalid token signature" };
      }
      // getJwtSecretKey() throws a plain Error when JWT_SECRET is not set
      if (error instanceof Error && error.message === "JWT secret not configured") {
        return { valid: false, error: "JWT secret not configured" };
      }
      // Record failed attempts for other errors
      if (ip) this.recordFailedAttempt(ip);
      return { valid: false, error: "Token validation failed" };
    }
  }

  /**
   * Records a failed authentication attempt for rate limiting
   */
  private static recordFailedAttempt(ip?: string): void {
    if (!ip) return;

    const attempt = failedAttempts.get(ip) || {
      count: 0,
      lastAttempt: Date.now(),
    };
    attempt.count++;
    attempt.lastAttempt = Date.now();
    failedAttempts.set(ip, attempt);
  }

  /**
   * Checks if an IP is rate limited due to too many failed attempts
   */
  private static isRateLimited(ip: string): boolean {
    const attempt = failedAttempts.get(ip);
    if (!attempt) return false;

    // Reset if lockout duration has passed
    if (Date.now() - attempt.lastAttempt >= SECURITY_CONFIG.LOCKOUT_DURATION) {
      failedAttempts.delete(ip);
      return false;
    }

    return attempt.count >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS;
  }

  /**
   * Generates a new JWT token
   */
  static async generateToken(payload: Record<string, any>): Promise<string> {
    const secretKey = getJwtSecretKey();

    // Add required claims
    const now = Math.floor(Date.now() / 1000);

    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + Math.floor(TOKEN_EXPIRY / 1000))
      .sign(secretKey);
  }
}
