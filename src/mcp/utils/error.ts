/**
 * Error Handling Utilities
 *
 * This file contains utilities for handling errors in the MCP implementation.
 */

import { MCPErrorCode, MCPError } from "../types.js";

/**
 * Create an MCP error object
 */
export function createError(code: MCPErrorCode, message: string, data?: unknown): MCPError {
  return {
    code,
    message,
    data,
  };
}

/**
 * Format an error for JSON-RPC response
 */
export function formatJsonRpcError(
  id: string | number | null,
  code: MCPErrorCode,
  message: string,
  data?: unknown,
): any {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

/**
 * Handle unexpected errors and convert to MCPError
 */
export function handleUnexpectedError(error: unknown): MCPError {
  if (error instanceof Error) {
    return {
      code: MCPErrorCode.INTERNAL_ERROR,
      message: error.message,
      data: {
        name: error.name,
        stack: error.stack,
      },
    };
  }

  return {
    code: MCPErrorCode.INTERNAL_ERROR,
    message: "An unexpected error occurred",
    data: error,
  };
}

/**
 * Safe JSON stringify with circular reference handling
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  });
}

/**
 * JSON-RPC error related utilities and classes
 */
export namespace JSONRPCError {
  /**
   * Standard JSON-RPC 2.0 error codes
   */
  export enum ErrorCode {
    PARSE_ERROR = -32700,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    // Implementation specific error codes
    SERVER_ERROR_START = -32099,
    SERVER_ERROR_END = -32000,
    // MCP specific error codes
    TOOL_EXECUTION_ERROR = -32000,
    VALIDATION_ERROR = -32001,
  }

  /**
   * Base JSON-RPC Error class
   */
  export class JSONRPCError extends Error {
    public code: number;
    public data?: unknown;

    constructor(message: string, code: number, data?: unknown) {
      super(message);
      this.name = "JSONRPCError";
      this.code = code;
      this.data = data;
    }
  }

  /**
   * Parse Error (-32700)
   * Invalid JSON was received by the server.
   */
  export class ParseError extends JSONRPCError {
    constructor(message: string = "Parse error", data?: unknown) {
      super(message, ErrorCode.PARSE_ERROR, data);
      this.name = "ParseError";
    }
  }

  /**
   * Invalid Request (-32600)
   * The JSON sent is not a valid Request object.
   */
  export class InvalidRequest extends JSONRPCError {
    constructor(message: string = "Invalid request", data?: unknown) {
      super(message, ErrorCode.INVALID_REQUEST, data);
      this.name = "InvalidRequest";
    }
  }

  /**
   * Method Not Found (-32601)
   * The method does not exist / is not available.
   */
  export class MethodNotFound extends JSONRPCError {
    constructor(message: string = "Method not found", data?: unknown) {
      super(message, ErrorCode.METHOD_NOT_FOUND, data);
      this.name = "MethodNotFound";
    }
  }

  /**
   * Invalid Params (-32602)
   * Invalid method parameter(s).
   */
  export class InvalidParams extends JSONRPCError {
    constructor(message: string = "Invalid params", data?: unknown) {
      super(message, ErrorCode.INVALID_PARAMS, data);
      this.name = "InvalidParams";
    }
  }

  /**
   * Internal Error (-32603)
   * Internal JSON-RPC error.
   */
  export class InternalError extends JSONRPCError {
    constructor(message: string = "Internal error", data?: unknown) {
      super(message, ErrorCode.INTERNAL_ERROR, data);
      this.name = "InternalError";
    }
  }

  /**
   * Tool Execution Error (-32000)
   * Error during tool execution.
   */
  export class ToolExecutionError extends JSONRPCError {
    constructor(message: string = "Tool execution error", data?: unknown) {
      super(message, ErrorCode.TOOL_EXECUTION_ERROR, data);
      this.name = "ToolExecutionError";
    }
  }

  /**
   * Validation Error (-32001)
   * Error during validation of params or result.
   */
  export class ValidationError extends JSONRPCError {
    constructor(message: string = "Validation error", data?: unknown) {
      super(message, ErrorCode.VALIDATION_ERROR, data);
      this.name = "ValidationError";
    }
  }
}
