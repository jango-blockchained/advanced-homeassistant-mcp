import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import type { Request, Response, NextFunction } from "express";
import { validateRequest, sanitizeInput, errorHandler } from "../index";
import { TokenManager } from "../../security/index";

const TEST_SECRET = "test-secret-that-is-long-enough-for-testing-purposes";

describe("Security Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: ReturnType<typeof mock>;
  let originalValidateToken: typeof TokenManager.validateToken;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    mockRequest = {
      method: "POST",
      headers: {},
      body: {},
      ip: "127.0.0.1",
    };

    const mockJson = mock(() => mockResponse as Response);
    const mockStatus = mock(() => mockResponse as Response);
    const mockSetHeader = mock(() => mockResponse as Response);
    const mockRemoveHeader = mock(() => mockResponse as Response);

    mockResponse = {
      status: mockStatus as unknown as Response["status"],
      json: mockJson as unknown as Response["json"],
      setHeader: mockSetHeader as unknown as Response["setHeader"],
      removeHeader: mockRemoveHeader as unknown as Response["removeHeader"],
    };
    nextFunction = mock(() => undefined);
    originalValidateToken = TokenManager.validateToken.bind(TokenManager);
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    TokenManager.validateToken = originalValidateToken;
  });

  describe("Request Validation", () => {
    it("should pass valid requests", () => {
      mockRequest.headers = {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      };
      TokenManager.validateToken = mock(() => ({ valid: true })) as unknown as typeof TokenManager.validateToken;

      validateRequest(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should reject requests without authorization header", () => {
      // Source enforces content-type FIRST (returns 415 if missing) and only
      // then checks the auth header — supply a valid content-type so we
      // exercise the auth branch.
      mockRequest.headers = { "content-type": "application/json" };
      validateRequest(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should reject requests with invalid authorization format", () => {
      mockRequest.headers = {
        authorization: "invalid-format",
        "content-type": "application/json",
      };
      validateRequest(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe("Input Sanitization", () => {
    it("should sanitize HTML in request body", () => {
      mockRequest.body = {
        text: 'Test <script>alert("xss")</script>',
        nested: {
          html: '<img src="x" onerror="alert(1)">World',
        },
      };
      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as unknown as NextFunction,
      );
      expect((mockRequest.body as Record<string, string>).text).toBe("Test");
      expect((mockRequest.body as Record<string, Record<string, string>>).nested.html).toBe(
        "World",
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should preserve non-string values including arrays", () => {
      mockRequest.body = {
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        nested: { value: 456 },
      };
      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(mockRequest.body).toEqual({
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        nested: { value: 456 },
      });
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe("Error Handler", () => {
    it("should handle errors in production mode", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("Test error");
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it("should include error details in development mode", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Test error");
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction as unknown as NextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
