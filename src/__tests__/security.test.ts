import { describe, expect, test, beforeEach } from "bun:test";
import express, { Request, Response } from "express";
import request from "supertest";
import { SecurityMiddleware } from "../security/enhanced-middleware";

describe("SecurityMiddleware", () => {
  const app = express();

  // Initialize security middleware
  SecurityMiddleware.initialize(app);

  // Test routes
  app.get("/test", (_req: Request, res: Response) => {
    res.status(200).json({ message: "Test successful" });
  });

  app.post("/test", (req: Request, res: Response) => {
    res.status(200).json(req.body);
  });

  app.post("/auth/login", (_req: Request, res: Response) => {
    res.status(200).json({ message: "Auth successful" });
  });

  describe("Security Headers", () => {
    test("should set security headers correctly", async () => {
      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["x-xss-protection"]).toBe("1; mode=block");
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(response.headers["strict-transport-security"]).toBe(
        "max-age=31536000; includeSubDomains; preload",
      );
      expect(response.headers["x-permitted-cross-domain-policies"]).toBe("none");
      expect(response.headers["cross-origin-embedder-policy"]).toBe("require-corp");
      expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin");
      expect(response.headers["cross-origin-resource-policy"]).toBe("same-origin");
      expect(response.headers["origin-agent-cluster"]).toBe("?1");
      expect(response.headers["x-powered-by"]).toBeUndefined();
    });

    test("should set Content-Security-Policy header correctly", async () => {
      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.headers["content-security-policy"]).toContain("default-src 'self'");
      expect(response.headers["content-security-policy"]).toContain(
        "script-src 'self' 'unsafe-inline'",
      );
      expect(response.headers["content-security-policy"]).toContain(
        "style-src 'self' 'unsafe-inline'",
      );
      expect(response.headers["content-security-policy"]).toContain("img-src 'self' data: https:");
      expect(response.headers["content-security-policy"]).toContain("font-src 'self'");
      expect(response.headers["content-security-policy"]).toContain("connect-src 'self'");
      expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(response.headers["content-security-policy"]).toContain("form-action 'self'");
    });
  });

  describe("Request Validation", () => {
    test("should reject requests with long URLs", async () => {
      const longUrl = "/test?" + "x".repeat(2500);
      const response = await request(app).get(longUrl);
      expect(response.status).toBe(413);
      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain("URL too long");
    });

    test("should reject large request bodies", async () => {
      const largeBody = { data: "x".repeat(2 * 1024 * 1024) }; // 2MB
      const response = await request(app)
        .post("/test")
        .set("Content-Type", "application/json")
        .send(largeBody);
      expect(response.status).toBe(413);
      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain("Request body too large");
    });

    test("should require correct content type for POST requests", async () => {
      const response = await request(app)
        .post("/test")
        .set("Content-Type", "text/plain")
        .send("test data");
      expect(response.status).toBe(415);
      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain("Content-Type must be application/json");
    });
  });

  describe("Input Sanitization", () => {
    test("should sanitize string input with HTML", async () => {
      const response = await request(app)
        .post("/test")
        .set("Content-Type", "application/json")
        .send({ text: '<script>alert("xss")</script>Hello<img src="x" onerror="alert(1)">' });
      expect(response.status).toBe(200);
      expect(response.body.text).toBe("Hello");
    });

    test("should sanitize nested object input", async () => {
      const response = await request(app)
        .post("/test")
        .set("Content-Type", "application/json")
        .send({
          user: {
            name: '<script>alert("xss")</script>John',
            bio: '<img src="x" onerror="alert(1)">Developer',
          },
        });
      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe("John");
      expect(response.body.user.bio).toBe("Developer");
    });

    test("should sanitize array input", async () => {
      const response = await request(app)
        .post("/test")
        .set("Content-Type", "application/json")
        .send({
          items: ["<script>alert(1)</script>Hello", '<img src="x" onerror="alert(1)">World'],
        });
      expect(response.status).toBe(200);
      expect(response.body.items[0]).toBe("Hello");
      expect(response.body.items[1]).toBe("World");
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      SecurityMiddleware.clearRateLimits();
    });

    test("should enforce regular rate limits", async () => {
      // Make 50 requests (should succeed)
      for (let i = 0; i < 50; i++) {
        const response = await request(app).get("/test");
        expect(response.status).toBe(200);
      }

      // 51st request should fail
      const response = await request(app).get("/test");
      expect(response.status).toBe(429);
      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain("Too many requests");
    });

    test("should enforce stricter auth rate limits", async () => {
      // Make 3 auth requests (should succeed)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post("/auth/login")
          .set("Content-Type", "application/json")
          .send({});
        expect(response.status).toBe(200);
      }

      // 4th auth request should fail
      const response = await request(app)
        .post("/auth/login")
        .set("Content-Type", "application/json")
        .send({});
      expect(response.status).toBe(429);
      expect(response.body.error).toBe(true);
      expect(response.body.message).toContain("Too many authentication requests");
    });
  });
});
