/**
 * Tests for src/security/enhanced-middleware.ts.
 *
 * The previous tests were written against a different API surface
 * (`applySecurityHeaders(req)`, `checkRateLimit(ip, isAuth)`, `rateLimitStore`)
 * that doesn't exist on the current `SecurityMiddleware` class. The class
 * keeps everything `private static`, so we reach in via `(SM as any).method`
 * to exercise the same behaviors against the real signatures.
 */

import { expect, test, describe, beforeEach } from "bun:test";
import { SecurityMiddleware } from "../enhanced-middleware";
import type { Request, Response } from "express";

interface SecurityMiddlewareInternal {
  validateRequest: (req: Request) => void;
  sanitizeInput: (input: unknown) => unknown;
  applySecurityHeaders: (res: Response) => void;
  checkRateLimit: (req: Request) => void;
  requestCounts: Map<string, { count: number; resetTime: number }>;
  authRequestCounts: Map<string, { count: number; resetTime: number }>;
}
const SM = SecurityMiddleware as unknown as SecurityMiddlewareInternal;

describe("Enhanced Security Middleware", () => {
  describe("Security Headers", () => {
    test("sets the expected headers on the response", () => {
      const headers: Record<string, string> = {};
      const fakeRes = {
        removeHeader: () => undefined,
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
      } as unknown as Response;

      SM.applySecurityHeaders(fakeRes);

      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
      expect(headers["Strict-Transport-Security"]).toBeDefined();
      expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    });
  });

  describe("Request Validation", () => {
    test("rejects URLs over MAX_URL_LENGTH", () => {
      const longUrl = "/" + "x".repeat(3000);
      const req = { originalUrl: longUrl, method: "GET", headers: {} } as unknown as Request;
      expect(() => SM.validateRequest(req)).toThrow("URL too long");
    });

    test("rejects POST without application/json content-type", () => {
      const req = {
        originalUrl: "/x",
        method: "POST",
        headers: { "content-type": "text/plain" },
      } as unknown as Request;
      expect(() => SM.validateRequest(req)).toThrow("Content-Type must be application/json");
    });

    test("accepts a well-formed POST", () => {
      const req = {
        originalUrl: "/x",
        method: "POST",
        headers: { "content-type": "application/json" },
      } as unknown as Request;
      expect(() => SM.validateRequest(req)).not.toThrow();
    });
  });

  describe("Input Sanitization", () => {
    test("strips tags from a string", () => {
      const sanitized = SM.sanitizeInput(
        '<script>alert("xss")</script>Hello<img src="x" onerror="alert(1)">',
      );
      expect(sanitized).toBe("Hello");
    });

    test("recurses into nested objects", () => {
      const sanitized = SM.sanitizeInput({
        name: '<script>alert("xss")</script>John',
        details: { bio: '<img src="x" onerror="alert(1)">Web Developer' },
      }) as { name: string; details: { bio: string } };
      expect(sanitized.name).toBe("John");
      expect(sanitized.details.bio).toBe("Web Developer");
    });

    test("recurses into arrays", () => {
      const sanitized = SM.sanitizeInput([
        "<script>alert(1)</script>Hello",
        '<img src="x" onerror="alert(1)">World',
      ]) as string[];
      expect(sanitized[0]).toBe("Hello");
      expect(sanitized[1]).toBe("World");
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      SM.requestCounts.clear();
      SM.authRequestCounts.clear();
    });

    function reqFor(ip: string, path = "/whatever"): Request {
      return { ip, path, socket: { remoteAddress: ip } } as unknown as Request;
    }

    test("regular requests block at the configured ceiling", () => {
      const ip = "10.0.0.1";
      // SECURITY_CONFIG.RATE_LIMIT.max = 50; first 50 succeed, 51st throws.
      for (let i = 0; i < 50; i++) {
        expect(() => SM.checkRateLimit(reqFor(ip))).not.toThrow();
      }
      expect(() => SM.checkRateLimit(reqFor(ip))).toThrow("Too many requests");
    });

    test("auth-prefixed requests use the stricter ceiling", () => {
      const ip = "10.0.0.2";
      // AUTH_RATE_LIMIT.max = 3; the 4th throws with the auth-specific message.
      for (let i = 0; i < 3; i++) {
        expect(() => SM.checkRateLimit(reqFor(ip, "/auth/login"))).not.toThrow();
      }
      expect(() => SM.checkRateLimit(reqFor(ip, "/auth/login"))).toThrow(
        "Too many authentication requests",
      );
    });

    test("expired window resets the count", () => {
      const ip = "10.0.0.3";
      for (let i = 0; i < 50; i++) {
        SM.checkRateLimit(reqFor(ip));
      }
      // Force the window to look expired.
      const record = SM.requestCounts.get(ip)!;
      record.resetTime = Date.now() - 1000;
      expect(() => SM.checkRateLimit(reqFor(ip))).not.toThrow();
    });
  });
});
