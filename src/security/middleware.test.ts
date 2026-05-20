// The validateRequest / sanitizeInput middleware actually live in
// src/middleware/index.ts, not under src/security/. The previous import
// path (`../../src/security/middleware`) didn't exist at all — the file was
// moved. We import from the real location and use bun:test instead of jest.

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Request, Response, NextFunction } from "express";
import { validateRequest, sanitizeInput } from "../middleware/index";
import { TokenManager } from "./index";

interface MockRequest {
  path?: string;
  method?: string;
  ip?: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
}

interface MockResponse {
  status: ReturnType<typeof mock>;
  json: ReturnType<typeof mock>;
  setHeader: ReturnType<typeof mock>;
}

describe("Security Middleware", () => {
  let mockRequest: MockRequest;
  let mockResponse: MockResponse;
  let nextFunction: ReturnType<typeof mock>;

  beforeEach(() => {
    mockRequest = {
      path: "/some-protected-endpoint",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: {},
    };

    const responseMock: MockResponse = {
      status: mock(() => responseMock),
      json: mock(() => responseMock),
      setHeader: mock(() => responseMock),
    };
    mockResponse = responseMock;
    nextFunction = mock(() => undefined);
  });

  describe("validateRequest", () => {
    it("should pass valid requests with bearer token", () => {
      mockRequest.headers.authorization = "Bearer valid-token";
      // Stub TokenManager.validateToken so the middleware accepts the token.
      const originalValidate = TokenManager.validateToken.bind(TokenManager);
      TokenManager.validateToken = mock(() => ({ valid: true })) as unknown as typeof TokenManager.validateToken;
      try {
        validateRequest(
          mockRequest as unknown as Request,
          mockResponse as unknown as Response,
          nextFunction as unknown as NextFunction,
        );
        expect(nextFunction).toHaveBeenCalled();
      } finally {
        TokenManager.validateToken = originalValidate;
      }
    });

    it("should reject requests without authorization header", () => {
      validateRequest(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should reject requests with non-Bearer authorization", () => {
      mockRequest.headers.authorization = "invalid-format";
      validateRequest(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("sanitizeInput", () => {
    it("should pass requests without body", () => {
      delete mockRequest.body;
      sanitizeInput(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should strip HTML tags from request body", () => {
      // src/middleware/index.ts.sanitizeInput STRIPS tags (different from
      // src/security/index.ts.sanitizeValue which escapes them — that
      // separation is intentional: this middleware mutates the body for
      // downstream handlers, the other returns a safe-to-render string).
      mockRequest.body = {
        text: '<script>alert("xss")</script>Hello',
        nested: {
          html: '<img src="x" onerror="alert(1)">World',
        },
      };
      sanitizeInput(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction as unknown as NextFunction,
      );
      expect((mockRequest.body as Record<string, string>).text).toBe("Hello");
      expect(((mockRequest.body as Record<string, Record<string, string>>).nested).html).toBe(
        "World",
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should preserve non-string values", () => {
      mockRequest.body = {
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
      };
      sanitizeInput(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(mockRequest.body).toEqual({
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
      });
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
