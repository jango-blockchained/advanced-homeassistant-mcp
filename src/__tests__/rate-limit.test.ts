import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import express from "express";
import { apiLimiter, authLimiter } from "../middleware/rate-limit.middleware.js";
import supertest from "supertest";

describe("Rate Limiting Middleware", () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    app = express();

    // Set up test routes with rate limiting
    app.use("/api", apiLimiter);
    app.use("/auth", authLimiter);

    // Test endpoints
    app.get("/api/test", (req, res) => {
      res.json({ message: "API test successful" });
    });

    app.post("/auth/login", (req, res) => {
      res.json({ message: "Login successful" });
    });

    request = supertest(app);
  });

  test("allows requests within API rate limit", async () => {
    // Make multiple requests within the limit
    for (let i = 0; i < 5; i++) {
      const response = await request.get("/api/test");
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("API test successful");
    }
  });

  test("enforces API rate limit", async () => {
    // Make more requests than the limit allows
    const requests = Array(150)
      .fill(null)
      .map(() => request.get("/api/test"));

    const responses = await Promise.all(requests);

    // Some requests should be successful, others should be rate limited
    const successfulRequests = responses.filter((r) => r.status === 200);
    const limitedRequests = responses.filter((r) => r.status === 429);

    expect(successfulRequests.length).toBeGreaterThan(0);
    expect(limitedRequests.length).toBeGreaterThan(0);
  });

  test("allows requests within auth rate limit", async () => {
    // Make multiple requests within the limit
    for (let i = 0; i < 3; i++) {
      const response = await request.post("/auth/login");
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
    }
  });

  test("enforces stricter auth rate limit", async () => {
    // Make more requests than the auth limit allows
    const requests = Array(10)
      .fill(null)
      .map(() => request.post("/auth/login"));

    const responses = await Promise.all(requests);

    // Some requests should be successful, others should be rate limited
    const successfulRequests = responses.filter((r) => r.status === 200);
    const limitedRequests = responses.filter((r) => r.status === 429);

    expect(successfulRequests.length).toBeLessThan(10);
    expect(limitedRequests.length).toBeGreaterThan(0);
  });

  test("includes rate limit headers", async () => {
    const response = await request.get("/api/test");
    expect(response.headers["ratelimit-limit"]).toBeDefined();
    expect(response.headers["ratelimit-remaining"]).toBeDefined();
    expect(response.headers["ratelimit-reset"]).toBeDefined();
  });
});
