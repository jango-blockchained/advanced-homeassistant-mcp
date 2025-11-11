import { config } from "dotenv";
import path from "path";
import { beforeAll, afterAll, beforeEach, describe, expect, it, mock, test } from "bun:test";

// Type definitions for mocks
type MockFn = ReturnType<typeof mock>;

interface MockInstance {
  mock: {
    calls: unknown[][];
    results: unknown[];
    instances: unknown[];
    lastCall?: unknown[];
  };
}

// Test configuration
const TEST_CONFIG = {
  TEST_JWT_SECRET: "test_jwt_secret_key_that_is_at_least_32_chars",
  TEST_TOKEN: "test_token_that_is_at_least_32_chars_long",
  TEST_CLIENT_IP: "127.0.0.1",
};

// Load test environment variables
config({ path: path.resolve(process.cwd(), ".env.test") });

// Global test setup
beforeAll(() => {
  // Set required environment variables
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = TEST_CONFIG.TEST_JWT_SECRET;
  process.env.TEST_TOKEN = TEST_CONFIG.TEST_TOKEN;

  // Configure console output for tests
  if (!process.env.DEBUG) {
    console.error = mock(() => {});
    console.warn = mock(() => {});
    console.log = mock(() => {});
  }
});

// Reset mocks between tests
beforeEach(() => {
  // Clear all mock function calls
  const mockFns = Object.values(mock).filter(
    (value): value is MockFn => typeof value === "function" && "mock" in value,
  );
  mockFns.forEach((mockFn) => {
    if (mockFn.mock) {
      mockFn.mock.calls = [];
      mockFn.mock.results = [];
      mockFn.mock.instances = [];
      mockFn.mock.lastCall = undefined;
    }
  });
});

// Custom test utilities
const testUtils = {
  // Mock WebSocket for SSE tests
  mockWebSocket: () => ({
    on: mock(() => {}),
    send: mock(() => {}),
    close: mock(() => {}),
    readyState: 1,
    OPEN: 1,
    removeAllListeners: mock(() => {}),
  }),

  // Mock HTTP response for API tests
  mockResponse: () => {
    const res = {
      status: mock(() => res),
      json: mock(() => res),
      send: mock(() => res),
      end: mock(() => res),
      setHeader: mock(() => res),
      writeHead: mock(() => res),
      write: mock(() => true),
      removeHeader: mock(() => res),
    };
    return res;
  },

  // Mock HTTP request for API tests
  mockRequest: (overrides: Record<string, unknown> = {}) => ({
    headers: { "content-type": "application/json" },
    body: {},
    query: {},
    params: {},
    ip: TEST_CONFIG.TEST_CLIENT_IP,
    method: "GET",
    path: "/api/test",
    is: mock((type: string) => type === "application/json"),
    ...overrides,
  }),

  // Create test client for SSE tests
  createTestClient: (id = "test-client") => ({
    id,
    ip: TEST_CONFIG.TEST_CLIENT_IP,
    connectedAt: new Date(),
    send: mock(() => {}),
    rateLimit: {
      count: 0,
      lastReset: Date.now(),
    },
    connectionTime: Date.now(),
  }),

  // Create test event for SSE tests
  createTestEvent: (type = "test_event", data: unknown = {}) => ({
    event_type: type,
    data,
    origin: "test",
    time_fired: new Date().toISOString(),
    context: { id: "test" },
  }),

  // Create test entity for Home Assistant tests
  createTestEntity: (entityId = "test.entity", state = "on") => ({
    entity_id: entityId,
    state,
    attributes: {},
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  }),

  // Helper to wait for async operations
  wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// Export test utilities and Bun test functions
export { beforeAll, afterAll, beforeEach, describe, expect, it, mock, test, testUtils };
