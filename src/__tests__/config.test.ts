import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { MCPServerConfigSchema } from "../schemas/config.schema.js";

describe("Configuration Validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  test("validates default configuration", () => {
    const config = MCPServerConfigSchema.parse({});
    expect(config).toBeDefined();
    expect(config.port).toBe(3000);
    expect(config.environment).toBe("development");
  });

  test("validates custom port", () => {
    const config = MCPServerConfigSchema.parse({ port: 8080 });
    expect(config.port).toBe(8080);
  });

  test("rejects invalid port", () => {
    expect(() => MCPServerConfigSchema.parse({ port: 0 })).toThrow();
    expect(() => MCPServerConfigSchema.parse({ port: 70000 })).toThrow();
  });

  test("validates environment values", () => {
    expect(() => MCPServerConfigSchema.parse({ environment: "development" })).not.toThrow();
    expect(() => MCPServerConfigSchema.parse({ environment: "production" })).not.toThrow();
    expect(() => MCPServerConfigSchema.parse({ environment: "test" })).not.toThrow();
    expect(() => MCPServerConfigSchema.parse({ environment: "invalid" })).toThrow();
  });

  test("validates rate limiting configuration", () => {
    const config = MCPServerConfigSchema.parse({
      rateLimit: {
        maxRequests: 50,
        maxAuthRequests: 10,
      },
    });
    expect(config.rateLimit.maxRequests).toBe(50);
    expect(config.rateLimit.maxAuthRequests).toBe(10);
  });

  test("rejects invalid rate limit values", () => {
    expect(() =>
      MCPServerConfigSchema.parse({
        rateLimit: {
          maxRequests: 0,
          maxAuthRequests: 5,
        },
      }),
    ).toThrow();

    expect(() =>
      MCPServerConfigSchema.parse({
        rateLimit: {
          maxRequests: 100,
          maxAuthRequests: -1,
        },
      }),
    ).toThrow();
  });

  test("validates execution timeout", () => {
    const config = MCPServerConfigSchema.parse({ executionTimeout: 5000 });
    expect(config.executionTimeout).toBe(5000);
  });

  test("rejects invalid execution timeout", () => {
    expect(() => MCPServerConfigSchema.parse({ executionTimeout: 500 })).toThrow();
    expect(() => MCPServerConfigSchema.parse({ executionTimeout: 400000 })).toThrow();
  });

  test("validates transport settings", () => {
    const config = MCPServerConfigSchema.parse({
      useStdioTransport: true,
      useHttpTransport: false,
    });
    expect(config.useStdioTransport).toBe(true);
    expect(config.useHttpTransport).toBe(false);
  });

  test("validates CORS settings", () => {
    const config = MCPServerConfigSchema.parse({
      corsOrigin: "https://example.com",
    });
    expect(config.corsOrigin).toBe("https://example.com");
  });

  test("validates debug settings", () => {
    const config = MCPServerConfigSchema.parse({
      debugMode: true,
      debugStdio: true,
      debugHttp: true,
      silentStartup: false,
    });
    expect(config.debugMode).toBe(true);
    expect(config.debugStdio).toBe(true);
    expect(config.debugHttp).toBe(true);
    expect(config.silentStartup).toBe(false);
  });
});
