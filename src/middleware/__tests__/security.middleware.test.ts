import { Request, Response } from "express";
import { validateRequest, sanitizeInput, errorHandler } from "../index";
import { TokenManager } from "../../security/index";
import { jest } from "@jest/globals";

const TEST_SECRET = "test-secret-that-is-long-enough-for-testing-purposes";

describe("Security Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    mockRequest = {
      method: "POST",
      headers: {},
      body: {},
      ip: "127.0.0.1",
    };

    const mockJson = jest.fn().mockReturnThis();
    const mockStatus = jest.fn().mockReturnThis();
    const mockSetHeader = jest.fn().mockReturnThis();
    const mockRemoveHeader = jest.fn().mockReturnThis();

    mockResponse = {
      status: mockStatus as any,
      json: mockJson as any,
      setHeader: mockSetHeader as any,
      removeHeader: mockRemoveHeader as any,
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    jest.clearAllMocks();
  });

  describe("Request Validation", () => {
    it("should pass valid requests", () => {
      mockRequest.headers = {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      };
      jest.spyOn(TokenManager, "validateToken").mockReturnValue({ valid: true });

      validateRequest(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should reject requests without authorization header", () => {
      validateRequest(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
        error: "Missing or invalid authorization header",
        timestamp: expect.any(String),
      });
    });

    it("should reject requests with invalid authorization format", () => {
      mockRequest.headers = {
        authorization: "invalid-format",
        "content-type": "application/json",
      };
      validateRequest(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
        error: "Missing or invalid authorization header",
        timestamp: expect.any(String),
      });
    });

    it("should reject oversized requests", () => {
      mockRequest.headers = {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        "content-length": "1048577", // 1MB + 1 byte
      };
      validateRequest(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Payload Too Large",
        error: "Request body must not exceed 1048576 bytes",
        timestamp: expect.any(String),
      });
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
      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockRequest.body.text).toBe("Test ");
      expect(mockRequest.body.nested.html).toBe("World");
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should handle non-object bodies", () => {
      mockRequest.body = "<p>text</p>";
      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockRequest.body).toBe("text");
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should preserve non-string values", () => {
      mockRequest.body = {
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        nested: { value: 456 },
      };
      sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);
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
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
        error: "An unexpected error occurred",
        timestamp: expect.any(String),
      });
    });

    it("should include error details in development mode", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Test error");
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
        error: "Test error",
        stack: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});
