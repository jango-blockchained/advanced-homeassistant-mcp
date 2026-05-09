import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import express from "express";
import request from "supertest";
import type { AIResponse, AIError } from "../../../src/ai/types/index.js";

// Hoisted: replace `express-rate-limit` with a no-op pass-through. The
// router builds module-scoped limiters at import time; without this mock the
// "should handle rate limiting" stress block (101 requests) used to pollute
// every later test in the same file with 429s. Rate limit policy is a
// concern of the express-rate-limit library itself, not this router.
//
// `void` rather than `await` — mock.module's factory is sync so the actual
// return is void, but the union return type would otherwise trip the
// floating-promise lint. Bun hoists mock.module to before static imports.
void mock.module("express-rate-limit", () => ({
  default: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}));

// Mock the NLP processor module. Combined with the lazy-getter in
// src/ai/endpoints/ai-router.ts (`getProcessor()`), this ensures the router
// uses the mock — not a real NLPProcessor instantiated at module load.
void mock.module("../../../src/ai/nlp/processor.js", () => ({
  NLPProcessor: mock(() => ({
    processCommand: mock(() =>
      Promise.resolve({
        intent: { action: "turn_on", target: "light.living_room", parameters: {} },
        confidence: { overall: 0.9, intent: 0.95, entities: 0.85, context: 0.9 },
      }),
    ),
    validateIntent: mock(() => Promise.resolve(true)),
    suggestCorrections: mock(() =>
      Promise.resolve(["Try using simpler commands", "Specify the device name clearly"]),
    ),
  })),
}));

import router from "../../../src/ai/endpoints/ai-router.js";

describe("AI Router", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/ai", router);
  });

  afterEach(() => {
    mock.restore();
  });

  describe("POST /ai/interpret", () => {
    const validRequest = {
      input: "turn on the living room lights",
      context: {
        user_id: "test_user",
        session_id: "test_session",
        timestamp: new Date().toISOString(),
        location: "home",
        previous_actions: [],
        environment_state: {},
      },
      model: "claude" as const,
    };

    test("should successfully interpret a valid command", async () => {
      const response = await request(app).post("/ai/interpret").send(validRequest);

      expect(response.status).toBe(200);
      const body = response.body as AIResponse;
      expect(typeof body.natural_language).toBe("string");
      expect(body.structured_data.success).toBe(true);
      expect(body.structured_data.action_taken).toBe("turn_on");
      expect(body.structured_data.entities_affected).toEqual(["light.living_room"]);
      expect(typeof body.structured_data.state_changes).toBe("object");
      expect(Array.isArray(body.next_suggestions)).toBe(true);
      expect(typeof body.confidence.overall).toBe("number");
      expect(typeof body.confidence.intent).toBe("number");
      expect(typeof body.confidence.entities).toBe("number");
      expect(typeof body.confidence.context).toBe("number");
      expect(body.context).toBeDefined();
    });

    test("should handle invalid input format", async () => {
      const response = await request(app)
        .post("/ai/interpret")
        .send({
          input: 123, // Invalid input type
          context: validRequest.context,
        });

      expect(response.status).toBe(500);
      const body = response.body as { error: AIError };
      expect(body.error.code).toBe("PROCESSING_ERROR");
      expect(typeof body.error.message).toBe("string");
      expect(typeof body.error.suggestion).toBe("string");
      expect(Array.isArray(body.error.recovery_options)).toBe(true);
    });

    test("should handle missing required fields", async () => {
      const response = await request(app)
        .post("/ai/interpret")
        .send({
          input: "turn on the lights",
          // Missing context
        });

      expect(response.status).toBe(500);
      const body = response.body as { error: AIError };
      expect(body.error.code).toBe("PROCESSING_ERROR");
      expect(typeof body.error.message).toBe("string");
    });
  });

  describe("POST /ai/execute", () => {
    const validRequest = {
      intent: {
        action: "turn_on",
        target: "light.living_room",
        parameters: {},
      },
      context: {
        user_id: "test_user",
        session_id: "test_session",
        timestamp: new Date().toISOString(),
        location: "home",
        previous_actions: [],
        environment_state: {},
      },
      model: "claude" as const,
    };

    test("should successfully execute a valid intent", async () => {
      const response = await request(app).post("/ai/execute").send(validRequest);

      expect(response.status).toBe(200);
      const body = response.body as AIResponse;
      expect(typeof body.natural_language).toBe("string");
      expect(body.structured_data.success).toBe(true);
      expect(body.structured_data.action_taken).toBe("turn_on");
      expect(body.structured_data.entities_affected).toEqual(["light.living_room"]);
      expect(typeof body.structured_data.state_changes).toBe("object");
      expect(Array.isArray(body.next_suggestions)).toBe(true);
      expect(typeof body.confidence.overall).toBe("number");
      expect(body.context).toBeDefined();
    });
  });

  describe("GET /ai/suggestions", () => {
    test("should return a list of suggestions", async () => {
      // Note: supertest hangs when GET requests carry a body, so we don't
      // pass one. The handler tolerates an empty body and uses defaults.
      const response = await request(app).get("/ai/suggestions");

      expect(response.status).toBe(200);
      const body = response.body as { suggestions: string[] };
      expect(Array.isArray(body.suggestions)).toBe(true);
      expect(body.suggestions.length).toBeGreaterThan(0);
    });
  });
});
