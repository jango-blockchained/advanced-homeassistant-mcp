import { Request, Response, NextFunction } from "express";
import { validateRequest, sanitizeInput } from "../../src/security/middleware";

type MockRequest = {
  headers: {
    "content-type"?: string;
    authorization?: string;
  };
  body?: any;
  is: jest.MockInstance<string | false | null, [type: string | string[]]>;
};

type MockResponse = {
  status: jest.MockInstance<MockResponse, [code: number]>;
  json: jest.MockInstance<MockResponse, [body: any]>;
  setHeader: jest.MockInstance<MockResponse, [name: string, value: string]>;
};

describe("Security Middleware", () => {
  let mockRequest: MockRequest;
  let mockResponse: MockResponse;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {},
      is: jest.fn<string | false | null, [string | string[]]>().mockReturnValue("json"),
    };

    mockResponse = {
      status: jest.fn<MockResponse, [number]>().mockReturnThis(),
      json: jest.fn<MockResponse, [any]>().mockReturnThis(),
      setHeader: jest.fn<MockResponse, [string, string]>().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe("validateRequest", () => {
    it("should pass valid requests", () => {
      mockRequest.headers.authorization = "Bearer valid-token";
      validateRequest(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction,
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should reject requests without authorization header", () => {
      validateRequest(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("authorization"),
        }),
      );
    });

    it("should reject requests with invalid authorization format", () => {
      mockRequest.headers.authorization = "invalid-format";
      validateRequest(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Bearer"),
        }),
      );
    });
  });

  describe("sanitizeInput", () => {
    it("should pass requests without body", () => {
      delete mockRequest.body;
      sanitizeInput(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction,
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should sanitize HTML in request body", () => {
      mockRequest.body = {
        text: '<script>alert("xss")</script>Hello',
        nested: {
          html: '<img src="x" onerror="alert(1)">World',
        },
      };
      sanitizeInput(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction,
      );
      expect(mockRequest.body.text).toBe("Hello");
      expect(mockRequest.body.nested.html).toBe("World");
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should handle non-object bodies", () => {
      mockRequest.body = "<p>text</p>";
      sanitizeInput(
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
        nextFunction,
      );
      expect(mockRequest.body).toBe("text");
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
        nextFunction,
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
