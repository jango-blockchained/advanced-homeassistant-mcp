import { z } from "zod";

// Test configuration schema
const testConfigSchema = z.object({
  // Test Environment
  TEST_PORT: z.number().default(3001),
  TEST_HOST: z.string().default("http://localhost"),
  TEST_WEBSOCKET_PORT: z.number().default(3002),

  // Mock Authentication
  TEST_JWT_SECRET: z.string().default("test_jwt_secret_key_that_is_at_least_32_chars"),
  TEST_TOKEN: z.string().default("test_token_that_is_at_least_32_chars_long"),
  TEST_INVALID_TOKEN: z.string().default("invalid_token"),

  // Mock Client Settings
  TEST_CLIENT_IP: z.string().default("127.0.0.1"),
  TEST_MAX_CLIENTS: z.number().default(10),
  TEST_PING_INTERVAL: z.number().default(100),
  TEST_CLEANUP_INTERVAL: z.number().default(200),
  TEST_MAX_CONNECTION_AGE: z.number().default(1000),

  // Mock Rate Limiting
  TEST_RATE_LIMIT_WINDOW: z.number().default(60000), // 1 minute
  TEST_RATE_LIMIT_MAX_REQUESTS: z.number().default(100),
  TEST_RATE_LIMIT_WEBSOCKET: z.number().default(1000),

  // Mock Events
  TEST_EVENT_TYPES: z
    .array(z.string())
    .default(["state_changed", "automation_triggered", "script_executed", "service_called"]),

  // Mock Entities
  TEST_ENTITIES: z
    .array(
      z.object({
        entity_id: z.string(),
        state: z.string(),
        attributes: z.record(z.any()),
        last_changed: z.string(),
        last_updated: z.string(),
      }),
    )
    .default([
      {
        entity_id: "light.test_light",
        state: "on",
        attributes: {
          brightness: 255,
          color_temp: 400,
        },
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
      {
        entity_id: "switch.test_switch",
        state: "off",
        attributes: {},
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
    ]),

  // Mock Services
  TEST_SERVICES: z
    .array(
      z.object({
        domain: z.string(),
        service: z.string(),
        data: z.record(z.any()),
      }),
    )
    .default([
      {
        domain: "light",
        service: "turn_on",
        data: {
          entity_id: "light.test_light",
          brightness: 255,
        },
      },
      {
        domain: "switch",
        service: "turn_off",
        data: {
          entity_id: "switch.test_switch",
        },
      },
    ]),

  // Mock Error Scenarios
  TEST_ERROR_SCENARIOS: z
    .array(
      z.object({
        type: z.string(),
        message: z.string(),
        code: z.number(),
      }),
    )
    .default([
      {
        type: "authentication_error",
        message: "Invalid token",
        code: 401,
      },
      {
        type: "rate_limit_error",
        message: "Too many requests",
        code: 429,
      },
      {
        type: "validation_error",
        message: "Invalid request body",
        code: 400,
      },
    ]),
});

// Parse environment variables or use defaults
const parseTestConfig = () => {
  const config = {
    TEST_PORT: parseInt(process.env.TEST_PORT || "3001"),
    TEST_HOST: process.env.TEST_HOST || "http://localhost",
    TEST_WEBSOCKET_PORT: parseInt(process.env.TEST_WEBSOCKET_PORT || "3002"),
    TEST_JWT_SECRET: process.env.TEST_JWT_SECRET || "test_jwt_secret_key_that_is_at_least_32_chars",
    TEST_TOKEN: process.env.TEST_TOKEN || "test_token_that_is_at_least_32_chars_long",
    TEST_INVALID_TOKEN: process.env.TEST_INVALID_TOKEN || "invalid_token",
    TEST_CLIENT_IP: process.env.TEST_CLIENT_IP || "127.0.0.1",
    TEST_MAX_CLIENTS: parseInt(process.env.TEST_MAX_CLIENTS || "10"),
    TEST_PING_INTERVAL: parseInt(process.env.TEST_PING_INTERVAL || "100"),
    TEST_CLEANUP_INTERVAL: parseInt(process.env.TEST_CLEANUP_INTERVAL || "200"),
    TEST_MAX_CONNECTION_AGE: parseInt(process.env.TEST_MAX_CONNECTION_AGE || "1000"),
    TEST_RATE_LIMIT_WINDOW: parseInt(process.env.TEST_RATE_LIMIT_WINDOW || "60000"),
    TEST_RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.TEST_RATE_LIMIT_MAX_REQUESTS || "100"),
    TEST_RATE_LIMIT_WEBSOCKET: parseInt(process.env.TEST_RATE_LIMIT_WEBSOCKET || "1000"),
  };

  return testConfigSchema.parse(config);
};

// Export the validated test configuration
export const TEST_CONFIG = parseTestConfig();

// Export types
export type TestConfig = z.infer<typeof testConfigSchema>;
