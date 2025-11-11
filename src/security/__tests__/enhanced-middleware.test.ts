import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { SecurityMiddleware } from "../enhanced-middleware";

describe("Enhanced Security Middleware", () => {
  describe("Security Headers", () => {
    test("applies security headers correctly", () => {
      const request = new Request("http://localhost");
      SecurityMiddleware.applySecurityHeaders(request);

      expect(request.headers.get("content-security-policy")).toBeDefined();
      expect(request.headers.get("x-frame-options")).toBe("DENY");
      expect(request.headers.get("strict-transport-security")).toBeDefined();
      expect(request.headers.get("x-xss-protection")).toBe("1; mode=block");
    });
  });

  describe("Request Validation", () => {
    test("validates request size", async () => {
      const largeBody = "x".repeat(2 * 1024 * 1024); // 2MB
      const request = new Request("http://localhost", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": largeBody.length.toString(),
        },
        body: JSON.stringify({ data: largeBody }),
      });

      await expect(SecurityMiddleware.validateRequest(request)).rejects.toThrow(
        "Request body too large",
      );
    });

    test("validates URL length", async () => {
      const longUrl = "http://localhost/" + "x".repeat(3000);
      const request = new Request(longUrl);

      await expect(SecurityMiddleware.validateRequest(request)).rejects.toThrow("URL too long");
    });

    test("validates and sanitizes POST request body", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: '<script>alert("xss")</script>Hello',
          age: 25,
        }),
      });

      await SecurityMiddleware.validateRequest(request);
      const body = await request.json();
      expect(body.name).not.toContain("<script>");
      expect(body.age).toBe(25);
    });
  });

  describe("Input Sanitization", () => {
    test("sanitizes string input", () => {
      const input = '<script>alert("xss")</script>Hello<img src="x" onerror="alert(1)">';
      const sanitized = SecurityMiddleware.sanitizeInput(input);
      expect(sanitized).toBe("Hello");
    });

    test("sanitizes nested object input", () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        details: {
          bio: '<img src="x" onerror="alert(1)">Web Developer',
        },
      };
      const sanitized = SecurityMiddleware.sanitizeInput(input) as any;
      expect(sanitized.name).toBe("John");
      expect(sanitized.details.bio).toBe("Web Developer");
    });

    test("sanitizes array input", () => {
      const input = ["<script>alert(1)</script>Hello", '<img src="x" onerror="alert(1)">World'];
      const sanitized = SecurityMiddleware.sanitizeInput(input) as string[];
      expect(sanitized[0]).toBe("Hello");
      expect(sanitized[1]).toBe("World");
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      // Reset rate limit stores before each test
      (SecurityMiddleware as any).rateLimitStore.clear();
      (SecurityMiddleware as any).authLimitStore.clear();
    });

    test("enforces regular rate limits", () => {
      const ip = "127.0.0.1";

      // Should allow up to 100 requests
      for (let i = 0; i < 100; i++) {
        expect(() => SecurityMiddleware.checkRateLimit(ip, false)).not.toThrow();
      }

      // Should block the 101st request
      expect(() => SecurityMiddleware.checkRateLimit(ip, false)).toThrow("Too many requests");
    });

    test("enforces stricter auth rate limits", () => {
      const ip = "127.0.0.1";

      // Should allow up to 5 auth requests
      for (let i = 0; i < 5; i++) {
        expect(() => SecurityMiddleware.checkRateLimit(ip, true)).not.toThrow();
      }

      // Should block the 6th auth request
      expect(() => SecurityMiddleware.checkRateLimit(ip, true)).toThrow(
        "Too many authentication requests",
      );
    });

    test("resets rate limits after window expires", async () => {
      const ip = "127.0.0.1";

      // Make max requests
      for (let i = 0; i < 100; i++) {
        SecurityMiddleware.checkRateLimit(ip, false);
      }

      // Wait for rate limit window to expire
      const store = (SecurityMiddleware as any).rateLimitStore.get(ip);
      store.resetTime = Date.now() - 1000; // Set reset time to the past

      // Should allow requests again
      expect(() => SecurityMiddleware.checkRateLimit(ip, false)).not.toThrow();
    });
  });
});
