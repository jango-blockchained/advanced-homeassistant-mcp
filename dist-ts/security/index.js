import crypto from "crypto";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { Elysia } from "elysia";
// Security configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
// Rate limiting state
const rateLimitStore = new Map();
// Extracted rate limiting logic
export function checkRateLimit(ip, maxRequests = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW) {
    const now = Date.now();
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
// Rate limiting middleware for Elysia
export const rateLimiter = new Elysia().derive(({ request }) => {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip);
});
// Extracted security headers logic
export function applySecurityHeaders() {
    const config = {
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
    return helmet(config);
}
// Security headers middleware for Elysia
export const securityHeaders = new Elysia().derive(({ set }) => {
    const headers = applySecurityHeaders();
    Object.entries(headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
            set.headers[key] = value;
        }
    });
});
// Extracted request validation logic
export function validateRequestHeaders(request, requiredContentType = 'application/json') {
    // Validate content type for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
        const contentType = request.headers.get("content-type");
        if (!contentType?.includes(requiredContentType)) {
            throw new Error(`Content-Type must be ${requiredContentType}`);
        }
    }
    // Validate request size
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
        throw new Error("Request body too large");
    }
    // Validate authorization header if required
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
        const [type, token] = authHeader.split(" ");
        if (type !== "Bearer" || !token) {
            throw new Error("Invalid authorization header");
        }
        const ip = request.headers.get("x-forwarded-for");
        const validation = TokenManager.validateToken(token, ip || undefined);
        if (!validation.valid) {
            throw new Error(validation.error || "Invalid token");
        }
    }
    return true;
}
// Request validation middleware for Elysia
export const validateRequest = new Elysia().derive(({ request }) => {
    validateRequestHeaders(request);
});
// Extracted input sanitization logic
export function sanitizeValue(value) {
    if (typeof value === "string") {
        // Basic XSS protection
        return value
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;")
            .replace(/\//g, "&#x2F;");
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]));
    }
    return value;
}
// Input sanitization middleware for Elysia
export const sanitizeInput = new Elysia().derive(async ({ request }) => {
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
        const body = await request.json();
        request.json = () => Promise.resolve(sanitizeValue(body));
    }
});
// Extracted error handling logic
export function handleError(error, env = process.env.NODE_ENV || 'production') {
    console.error("Error:", error);
    const baseResponse = {
        error: true,
        message: "Internal server error",
        timestamp: new Date().toISOString(),
    };
    if (env === 'development') {
        return {
            ...baseResponse,
            error: error.message,
            stack: error.stack,
        };
    }
    return baseResponse;
}
// Error handling middleware for Elysia
export const errorHandler = new Elysia().onError(({ error, set }) => {
    set.status = error instanceof jwt.JsonWebTokenError ? 401 : 500;
    return handleError(error);
});
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
// Security configuration
const SECURITY_CONFIG = {
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    MAX_TOKEN_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
    MIN_TOKEN_LENGTH: 32,
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
};
// Track failed authentication attempts
const failedAttempts = new Map();
export class TokenManager {
    /**
     * Encrypts a token using AES-256-GCM
     */
    static encryptToken(token, key) {
        if (!token || typeof token !== "string") {
            throw new Error("Invalid token");
        }
        if (!key || typeof key !== "string" || key.length < 32) {
            throw new Error("Invalid encryption key");
        }
        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ALGORITHM, key.slice(0, 32), iv);
            const encrypted = Buffer.concat([
                cipher.update(token, "utf8"),
                cipher.final(),
            ]);
            const tag = cipher.getAuthTag();
            // Format: algorithm:iv:tag:encrypted
            return `${ALGORITHM}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
        }
        catch (error) {
            throw new Error("Failed to encrypt token");
        }
    }
    /**
     * Decrypts a token using AES-256-GCM
     */
    static decryptToken(encryptedToken, key) {
        if (!encryptedToken || typeof encryptedToken !== "string") {
            throw new Error("Invalid encrypted token");
        }
        if (!key || typeof key !== "string" || key.length < 32) {
            throw new Error("Invalid encryption key");
        }
        try {
            const [algorithm, ivBase64, tagBase64, encryptedBase64] = encryptedToken.split(":");
            if (algorithm !== ALGORITHM ||
                !ivBase64 ||
                !tagBase64 ||
                !encryptedBase64) {
                throw new Error("Invalid encrypted token format");
            }
            const iv = Buffer.from(ivBase64, "base64");
            const tag = Buffer.from(tagBase64, "base64");
            const encrypted = Buffer.from(encryptedBase64, "base64");
            const decipher = crypto.createDecipheriv(ALGORITHM, key.slice(0, 32), iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([
                decipher.update(encrypted),
                decipher.final(),
            ]).toString("utf8");
        }
        catch (error) {
            if (error instanceof Error &&
                error.message === "Invalid encrypted token format") {
                throw error;
            }
            throw new Error("Invalid encrypted token");
        }
    }
    /**
     * Validates a JWT token with enhanced security checks
     */
    static validateToken(token, ip) {
        // Check basic token format
        if (!token || typeof token !== "string") {
            return { valid: false, error: "Invalid token format" };
        }
        // Check for token length
        if (token.length < SECURITY_CONFIG.MIN_TOKEN_LENGTH) {
            if (ip)
                this.recordFailedAttempt(ip);
            return { valid: false, error: "Token length below minimum requirement" };
        }
        // Check for rate limiting
        if (ip && this.isRateLimited(ip)) {
            return {
                valid: false,
                error: "Too many failed attempts. Please try again later.",
            };
        }
        // Get JWT secret
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return { valid: false, error: "JWT secret not configured" };
        }
        try {
            // Verify token signature and decode
            const decoded = jwt.verify(token, secret, {
                algorithms: ["HS256"],
                clockTolerance: 0, // No clock skew tolerance
                ignoreExpiration: false, // Always check expiration
            });
            // Verify token structure
            if (!decoded || typeof decoded !== "object") {
                if (ip)
                    this.recordFailedAttempt(ip);
                return { valid: false, error: "Invalid token structure" };
            }
            // Check required claims
            if (!decoded.exp || !decoded.iat) {
                if (ip)
                    this.recordFailedAttempt(ip);
                return { valid: false, error: "Token missing required claims" };
            }
            const now = Math.floor(Date.now() / 1000);
            // Check expiration
            if (decoded.exp <= now) {
                if (ip)
                    this.recordFailedAttempt(ip);
                return { valid: false, error: "Token has expired" };
            }
            // Check token age
            const tokenAge = (now - decoded.iat) * 1000;
            if (tokenAge > SECURITY_CONFIG.MAX_TOKEN_AGE) {
                if (ip)
                    this.recordFailedAttempt(ip);
                return { valid: false, error: "Token exceeds maximum age limit" };
            }
            // Reset failed attempts on successful validation
            if (ip) {
                failedAttempts.delete(ip);
            }
            return { valid: true };
        }
        catch (error) {
            if (ip)
                this.recordFailedAttempt(ip);
            if (error instanceof jwt.TokenExpiredError) {
                return { valid: false, error: "Token has expired" };
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return { valid: false, error: "Invalid token signature" };
            }
            return { valid: false, error: "Token validation failed" };
        }
    }
    /**
     * Records a failed authentication attempt for rate limiting
     */
    static recordFailedAttempt(ip) {
        if (!ip)
            return;
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
    static isRateLimited(ip) {
        const attempt = failedAttempts.get(ip);
        if (!attempt)
            return false;
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
    static generateToken(payload) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT secret not configured");
        }
        // Add required claims
        const now = Math.floor(Date.now() / 1000);
        const tokenPayload = {
            ...payload,
            iat: now,
            exp: now + Math.floor(TOKEN_EXPIRY / 1000),
        };
        return jwt.sign(tokenPayload, secret, {
            algorithm: "HS256",
        });
    }
}
