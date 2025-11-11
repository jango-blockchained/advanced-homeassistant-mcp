import { loadEnvironmentVariables } from "./loadEnv";

// Load environment variables from the appropriate files
// Execute synchronously at module import time to ensure all env vars are available
loadEnvironmentVariables();

// Export a marker to ensure the above call isn't tree-shaken
export const __envLoaded = true;

// Home Assistant Configuration
export const HASS_CONFIG = {
  HOST: process.env.HASS_HOST || "http://homeassistant.local:8123",
  TOKEN: process.env.HASS_TOKEN,
  SOCKET_URL: process.env.HASS_SOCKET_URL || "ws://homeassistant.local:8123/api/websocket",
  BASE_URL: process.env.HASS_HOST || "http://homeassistant.local:8123",
  SOCKET_TOKEN: process.env.HASS_TOKEN,
};

// Server Configuration
export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DEBUG: process.env.DEBUG === "true",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};

// AI Configuration
export const AI_CONFIG = {
  PROCESSOR_TYPE: process.env.PROCESSOR_TYPE || "claude",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  REGULAR: parseInt(process.env.RATE_LIMIT_REGULAR || "100", 10),
  WEBSOCKET: parseInt(process.env.RATE_LIMIT_WEBSOCKET || "1000", 10),
};

// Security Configuration
export const SECURITY_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || "default_secret_key_change_in_production",
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:8123")
    .split(",")
    .map((origin) => origin.trim()),
};

// Test Configuration
export const TEST_CONFIG = {
  HASS_HOST: process.env.TEST_HASS_HOST || "http://localhost:8123",
  HASS_TOKEN: process.env.TEST_HASS_TOKEN || "test_token",
  HASS_SOCKET_URL: process.env.TEST_HASS_SOCKET_URL || "ws://localhost:8123/api/websocket",
  PORT: parseInt(process.env.TEST_PORT || "3001", 10),
};

// Mock Configuration (for testing)
export const MOCK_CONFIG = {
  SERVICES: process.env.MOCK_SERVICES === "true",
  RESPONSES_DIR: process.env.MOCK_RESPONSES_DIR || "__tests__/mock-responses",
};

// Validate required configuration
function validateConfig() {
  const missingVars: string[] = [];

  if (!HASS_CONFIG.TOKEN) missingVars.push("HASS_TOKEN");
  if (!SECURITY_CONFIG.JWT_SECRET) missingVars.push("JWT_SECRET");

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }
}

// Export configuration validation
export const validateConfiguration = validateConfig;

// Export all configurations as a single object
export const AppConfig = {
  HASS: HASS_CONFIG,
  SERVER: SERVER_CONFIG,
  AI: AI_CONFIG,
  RATE_LIMIT: RATE_LIMIT_CONFIG,
  SECURITY: SECURITY_CONFIG,
  TEST: TEST_CONFIG,
  MOCK: MOCK_CONFIG,
};
