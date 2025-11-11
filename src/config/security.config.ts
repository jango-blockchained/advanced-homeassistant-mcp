import { z } from "zod";

// Security configuration schema
const securityConfigSchema = z.object({
  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.number().default(24 * 60 * 60 * 1000), // 24 hours
  JWT_MAX_AGE: z.number().default(30 * 24 * 60 * 60 * 1000), // 30 days
  JWT_ALGORITHM: z.enum(["HS256", "HS384", "HS512"]).default("HS256"),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.number().default(100),
  RATE_LIMIT_WEBSOCKET: z.number().default(1000),

  // Token Security
  TOKEN_MIN_LENGTH: z.number().default(32),
  MAX_FAILED_ATTEMPTS: z.number().default(5),
  LOCKOUT_DURATION: z.number().default(15 * 60 * 1000), // 15 minutes

  // CORS Configuration
  CORS_ORIGINS: z.array(z.string()).default(["http://localhost:3000", "http://localhost:8123"]),
  CORS_METHODS: z.array(z.string()).default(["GET", "POST", "PUT", "DELETE", "OPTIONS"]),
  CORS_ALLOWED_HEADERS: z
    .array(z.string())
    .default(["Content-Type", "Authorization", "X-Requested-With"]),
  CORS_EXPOSED_HEADERS: z.array(z.string()).default([]),
  CORS_CREDENTIALS: z.boolean().default(true),
  CORS_MAX_AGE: z.number().default(24 * 60 * 60), // 24 hours

  // Content Security Policy
  CSP_ENABLED: z.boolean().default(true),
  CSP_REPORT_ONLY: z.boolean().default(false),
  CSP_REPORT_URI: z.string().optional(),

  // SSL/TLS Configuration
  REQUIRE_HTTPS: z.boolean().default(process.env.NODE_ENV === "production"),
  HSTS_MAX_AGE: z.number().default(31536000), // 1 year
  HSTS_INCLUDE_SUBDOMAINS: z.boolean().default(true),
  HSTS_PRELOAD: z.boolean().default(true),

  // Cookie Security
  COOKIE_SECRET: z.string().min(32).optional(),
  COOKIE_SECURE: z.boolean().default(process.env.NODE_ENV === "production"),
  COOKIE_HTTP_ONLY: z.boolean().default(true),
  COOKIE_SAME_SITE: z.enum(["Strict", "Lax", "None"]).default("Strict"),

  // Request Limits
  MAX_REQUEST_SIZE: z.number().default(1024 * 1024), // 1MB
  MAX_REQUEST_FIELDS: z.number().default(1000),
});

// Parse environment variables
const parseEnvConfig = () => {
  const config = {
    JWT_SECRET: process.env.JWT_SECRET || "default_secret_key_change_in_production",
    JWT_EXPIRY: parseInt(process.env.JWT_EXPIRY || "86400000"),
    JWT_MAX_AGE: parseInt(process.env.JWT_MAX_AGE || "2592000000"),
    JWT_ALGORITHM: process.env.JWT_ALGORITHM || "HS256",

    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || "900000"),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
    RATE_LIMIT_WEBSOCKET: parseInt(process.env.RATE_LIMIT_WEBSOCKET || "1000"),

    TOKEN_MIN_LENGTH: parseInt(process.env.TOKEN_MIN_LENGTH || "32"),
    MAX_FAILED_ATTEMPTS: parseInt(process.env.MAX_FAILED_ATTEMPTS || "5"),
    LOCKOUT_DURATION: parseInt(process.env.LOCKOUT_DURATION || "900000"),

    CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:8123")
      .split(",")
      .map((origin) => origin.trim()),
    CORS_METHODS: (process.env.CORS_METHODS || "GET,POST,PUT,DELETE,OPTIONS")
      .split(",")
      .map((method) => method.trim()),
    CORS_ALLOWED_HEADERS: (
      process.env.CORS_ALLOWED_HEADERS || "Content-Type,Authorization,X-Requested-With"
    )
      .split(",")
      .map((header) => header.trim()),
    CORS_EXPOSED_HEADERS: (process.env.CORS_EXPOSED_HEADERS || "")
      .split(",")
      .filter(Boolean)
      .map((header) => header.trim()),
    CORS_CREDENTIALS: process.env.CORS_CREDENTIALS !== "false",
    CORS_MAX_AGE: parseInt(process.env.CORS_MAX_AGE || "86400"),

    CSP_ENABLED: process.env.CSP_ENABLED !== "false",
    CSP_REPORT_ONLY: process.env.CSP_REPORT_ONLY === "true",
    CSP_REPORT_URI: process.env.CSP_REPORT_URI,

    REQUIRE_HTTPS: process.env.REQUIRE_HTTPS !== "false" && process.env.NODE_ENV === "production",
    HSTS_MAX_AGE: parseInt(process.env.HSTS_MAX_AGE || "31536000"),
    HSTS_INCLUDE_SUBDOMAINS: process.env.HSTS_INCLUDE_SUBDOMAINS !== "false",
    HSTS_PRELOAD: process.env.HSTS_PRELOAD !== "false",

    COOKIE_SECRET: process.env.COOKIE_SECRET,
    COOKIE_SECURE: process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
    COOKIE_HTTP_ONLY: process.env.COOKIE_HTTP_ONLY !== "false",
    COOKIE_SAME_SITE: (process.env.COOKIE_SAME_SITE || "Strict") as "Strict" | "Lax" | "None",

    MAX_REQUEST_SIZE: parseInt(process.env.MAX_REQUEST_SIZE || "1048576"),
    MAX_REQUEST_FIELDS: parseInt(process.env.MAX_REQUEST_FIELDS || "1000"),
  };

  return securityConfigSchema.parse(config);
};

// Export the validated configuration
export const SECURITY_CONFIG = parseEnvConfig();

// Export types
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
