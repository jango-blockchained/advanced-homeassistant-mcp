import { z } from "zod";
/**
 * Application configuration object
 * Contains all configuration settings for the application
 */
export const AppConfigSchema = z.object({
    /** Server Configuration */
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    /** Home Assistant Configuration */
    HASS_HOST: z.string().default("http://homeassistant.local:8123"),
    HASS_TOKEN: z.string().optional(),
    /** Speech Features Configuration */
    SPEECH: z.object({
        ENABLED: z.boolean().default(false),
        WAKE_WORD_ENABLED: z.boolean().default(false),
        SPEECH_TO_TEXT_ENABLED: z.boolean().default(false),
        WHISPER_MODEL_PATH: z.string().default("/models"),
        WHISPER_MODEL_TYPE: z.string().default("base"),
    }).default({
        ENABLED: false,
        WAKE_WORD_ENABLED: false,
        SPEECH_TO_TEXT_ENABLED: false,
        WHISPER_MODEL_PATH: "/models",
        WHISPER_MODEL_TYPE: "base",
    }),
    /** Security Configuration */
    JWT_SECRET: z.string().default("your-secret-key-must-be-32-char-min"),
    RATE_LIMIT: z.object({
        /** Time window for rate limiting in milliseconds */
        windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
        /** Maximum number of requests per window */
        max: z.number().default(100), // limit each IP to 100 requests per windowMs
    }),
    /** Server-Sent Events Configuration */
    SSE: z.object({
        /** Maximum number of concurrent SSE clients */
        MAX_CLIENTS: z.number().default(1000),
        /** Ping interval in milliseconds to keep connections alive */
        PING_INTERVAL: z.number().default(30000), // 30 seconds
    }),
    /** Logging Configuration */
    LOGGING: z.object({
        /** Log level (error, warn, info, http, debug) */
        LEVEL: z.enum(["error", "warn", "info", "debug", "trace"]).default("info"),
        /** Directory for log files */
        DIR: z.string().default("logs"),
        /** Maximum log file size before rotation */
        MAX_SIZE: z.string().default("20m"),
        /** Maximum number of days to keep log files */
        MAX_DAYS: z.string().default("14d"),
        /** Whether to compress rotated logs */
        COMPRESS: z.boolean().default(false),
        /** Format for timestamps in logs */
        TIMESTAMP_FORMAT: z.string().default("YYYY-MM-DD HH:mm:ss:ms"),
        /** Whether to include request logging */
        LOG_REQUESTS: z.boolean().default(false),
    }),
    /** Application Version */
    VERSION: z.string().default("0.1.0"),
});
/** Required environment variables that must be set */
const requiredEnvVars = ["HASS_TOKEN"];
/**
 * Validate that all required environment variables are set
 * Throws an error if any required variable is missing
 */
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
// Fix NODE_ENV if it's set to "1"
if (process.env.NODE_ENV === "1") {
    console.log('Fixing NODE_ENV from "1" to "development"');
    process.env.NODE_ENV = "development";
}
// Load and validate configuration
export const APP_CONFIG = AppConfigSchema.parse({
    PORT: process.env.PORT || 4000,
    NODE_ENV: process.env.NODE_ENV,
    HASS_HOST: process.env.HASS_HOST || "http://192.168.178.63:8123",
    HASS_TOKEN: process.env.HASS_TOKEN,
    JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
    RATE_LIMIT: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
    },
    SSE: {
        MAX_CLIENTS: 1000,
        PING_INTERVAL: 30000, // 30 seconds
    },
    LOGGING: {
        LEVEL: process.env.LOG_LEVEL || "info",
        DIR: process.env.LOG_DIR || "logs",
        MAX_SIZE: process.env.LOG_MAX_SIZE || "20m",
        MAX_DAYS: process.env.LOG_MAX_DAYS || "14d",
        COMPRESS: process.env.LOG_COMPRESS === "true",
        TIMESTAMP_FORMAT: "YYYY-MM-DD HH:mm:ss:ms",
        LOG_REQUESTS: process.env.LOG_REQUESTS === "true",
    },
    VERSION: "0.1.0",
    SPEECH: {
        ENABLED: process.env.ENABLE_SPEECH_FEATURES === "true",
        WAKE_WORD_ENABLED: process.env.ENABLE_WAKE_WORD === "true",
        SPEECH_TO_TEXT_ENABLED: process.env.ENABLE_SPEECH_TO_TEXT === "true",
        WHISPER_MODEL_PATH: process.env.WHISPER_MODEL_PATH || "/models",
        WHISPER_MODEL_TYPE: process.env.WHISPER_MODEL_TYPE || "base",
    },
});
