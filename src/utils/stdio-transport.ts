/**
 * Stdio Transport Module
 *
 * This module implements communication via standard input/output streams
 * using JSON-RPC 2.0 format for sending and receiving messages.
 *
 * @module stdio-transport
 */

import { createInterface } from "readline";
import { logger } from "./logger.js";
import { z } from "zod";

// JSON-RPC 2.0 error codes
export enum JsonRpcErrorCode {
  // Standard JSON-RPC 2.0 error codes
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  // MCP specific error codes
  TOOL_EXECUTION_ERROR = -32000,
  VALIDATION_ERROR = -32001,
}

// Type definitions for JSON-RPC 2.0 messages
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

// Setup readline interface for stdin
const rl = createInterface({
  input: process.stdin,
  terminal: false,
});

// Message handlers map
const messageHandlers: Map<
  string,
  {
    execute: (params: Record<string, unknown>) => Promise<unknown>;
    paramsSchema?: z.ZodType<any>;
  }
> = new Map();

/**
 * Initialize stdio transport
 * Sets up event listeners and message processing
 */
export function initStdioTransport(): void {
  // Check for silent startup mode
  const silentStartup = process.env.SILENT_STARTUP === "true";

  // Handle line events (incoming JSON)
  rl.on("line", async (line) => {
    try {
      // Parse incoming JSON
      const request = JSON.parse(line);

      // Validate it's a proper JSON-RPC 2.0 request
      if (!request.jsonrpc || request.jsonrpc !== "2.0") {
        sendErrorResponse({
          id: request.id || null,
          code: JsonRpcErrorCode.INVALID_REQUEST,
          message: "Invalid JSON-RPC 2.0 request: missing or invalid jsonrpc version",
        });
        return;
      }

      // Handle request with ID (requires response)
      if (request.id !== undefined) {
        await handleJsonRpcRequest(request as JsonRpcRequest).catch((err) => {
          if (!silentStartup) {
            logger.error(`Error handling request: ${String(err)}`);
          }
        });
      }
      // Handle notification (no response expected)
      else if (request.method) {
        void handleJsonRpcNotification(request as JsonRpcNotification);
      }
      // Invalid request format
      else {
        sendErrorResponse({
          id: null,
          code: JsonRpcErrorCode.INVALID_REQUEST,
          message: "Invalid JSON-RPC 2.0 message format",
        });
      }
    } catch (parseError) {
      // Handle JSON parsing errors
      if (!silentStartup) {
        logger.error(`Failed to parse JSON input: ${String(parseError)}`);
      }
      sendErrorResponse({
        id: null,
        code: JsonRpcErrorCode.PARSE_ERROR,
        message: "Parse error: invalid JSON",
        data: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }
  });

  // Handle stdin close
  rl.on("close", () => {
    if (!silentStartup) {
      logger.info("Stdin closed, shutting down");
    }
    process.exit(0);
  });

  // Log initialization only if not in silent mode
  if (!silentStartup) {
    logger.info("JSON-RPC 2.0 stdio transport initialized");
  }
}

/**
 * Handle a JSON-RPC request that requires a response
 */
async function handleJsonRpcRequest(request: JsonRpcRequest): Promise<void> {
  const { id, method, params = {} } = request;

  // Log to file but not console
  logger.debug(`Received request: ${id} - ${method}`);

  // Look up handler
  const handler = messageHandlers.get(method);
  if (!handler) {
    sendErrorResponse({
      id,
      code: JsonRpcErrorCode.METHOD_NOT_FOUND,
      message: `Method not found: ${method}`,
    });
    return;
  }

  try {
    // Validate parameters if schema exists
    if (handler.paramsSchema) {
      try {
        const validationResult = handler.paramsSchema.parse(params);
        // If validation changes values (e.g. default values), use the validated result
        Object.assign(params, validationResult);
      } catch (validationError) {
        sendErrorResponse({
          id,
          code: JsonRpcErrorCode.INVALID_PARAMS,
          message: "Invalid parameters",
          data:
            validationError instanceof Error ? validationError.message : String(validationError),
        });
        return;
      }
    }

    // Execute handler
    const result = await handler.execute(params);

    // Send successful response
    sendResponse({
      id,
      result,
    });
  } catch (error) {
    // Handle execution errors
    sendErrorResponse({
      id,
      code: JsonRpcErrorCode.TOOL_EXECUTION_ERROR,
      message: error instanceof Error ? error.message : String(error),
      data: error,
    });
  }
}

/**
 * Handle a JSON-RPC notification (no response required)
 */
async function handleJsonRpcNotification(notification: JsonRpcNotification): Promise<void> {
  const { method, params = {} } = notification;

  // Log to file but not console
  logger.debug(`Received notification: ${method}`);

  // Look up handler
  const handler = messageHandlers.get(method);
  if (!handler) {
    // No response for notifications even if method not found
    logger.warn(`Method not found for notification: ${method}`);
    return;
  }

  try {
    // Validate parameters if schema exists
    if (handler.paramsSchema) {
      try {
        handler.paramsSchema.parse(params);
      } catch (validationError) {
        logger.error(`Invalid parameters for notification ${method}: ${String(validationError)}`);
        return;
      }
    }

    // Execute handler (fire and forget)
    await handler.execute(params);
  } catch (error) {
    // Log execution errors but don't send response
    logger.error(`Error handling notification ${method}: ${String(error)}`);
  }
}

/**
 * Register a message handler for a specific method
 *
 * @param method - The method name to handle
 * @param handler - The function to handle the method
 * @param paramsSchema - Optional Zod schema for parameter validation
 */
export function registerHandler(
  method: string,
  handler: (params: Record<string, unknown>) => Promise<unknown>,
  paramsSchema?: z.ZodType<any>,
): void {
  messageHandlers.set(method, {
    execute: handler,
    paramsSchema,
  });
  logger.debug(`Registered handler for method: ${method}`);
}

/**
 * Send a successful response to stdout
 *
 * @param options - The response options
 */
export function sendResponse({ id, result }: { id: string | number; result?: unknown }): void {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id,
    result,
  };

  const jsonResponse = JSON.stringify(response);
  process.stdout.write(jsonResponse + "\n");
  logger.debug(`Sent response: ${id}`);
}

/**
 * Send an error response to stdout
 *
 * @param error - The error details
 */
export function sendErrorResponse({
  id,
  code,
  message,
  data,
}: {
  id: string | number | null;
  code: number;
  message: string;
  data?: unknown;
}): void {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      data,
    },
  };

  const jsonResponse = JSON.stringify(response);
  process.stdout.write(jsonResponse + "\n");
  logger.error(`Sent error response: ${id} - [${code}] ${message}`);
}

/**
 * Send a notification to the client (no response expected)
 *
 * @param method - The notification method name
 * @param params - The notification parameters
 */
export function sendNotification(method: string, params?: Record<string, unknown>): void {
  const notification: JsonRpcNotification = {
    jsonrpc: "2.0",
    method,
    params,
  };

  const jsonNotification = JSON.stringify(notification);
  process.stdout.write(jsonNotification + "\n");
  logger.debug(`Sent notification: ${method}`);
}

/**
 * Send a log message to the client
 *
 * @param level - The log level (info, warn, error, debug)
 * @param message - The log message
 * @param data - Optional additional data
 */
export function sendLogMessage(level: string, message: string, data?: unknown): void {
  sendNotification("log", {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Enable debug mode for the transport
 * Increases logging verbosity
 */
export function enableDebugMode(): void {
  logger.level = "debug";
  logger.info("Debug mode enabled for stdio transport");
}
