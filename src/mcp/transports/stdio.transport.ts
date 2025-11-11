/**
 * Stdio Transport for MCP
 *
 * This module provides a transport that uses standard input/output
 * for JSON-RPC 2.0 communication. This is particularly useful for
 * integration with AI assistants like Claude, GPT, and Cursor.
 */

import { BaseTransport } from "../transport.js";
import { logger } from "../../utils/logger.js";
import { MCPServer } from "../MCPServer.js";
import type { MCPRequest, MCPResponse, ToolExecutionResult } from "../types.js";
import { JSONRPCError } from "../utils/error.js";

/**
 * StdioTransport options
 */
export interface StdioTransportOptions {
  /** Whether to enable silent mode (suppress non-essential output) */
  silent?: boolean;
  /** Whether to enable debug mode */
  debug?: boolean;
  /** Reference to an MCPServer instance */
  server?: MCPServer;
}

/**
 * Transport implementation for standard input/output
 * Communicates using JSON-RPC 2.0 protocol
 */
export class StdioTransport extends BaseTransport {
  private isStarted = false;
  private silent: boolean;
  private debug: boolean;
  private server: MCPServer | null = null;

  constructor(options: StdioTransportOptions = {}) {
    super();
    this.silent = options.silent ?? false;
    this.debug = options.debug ?? false;

    if (options.server) {
      this.server = options.server;
    }

    // Configure stdin to not buffer input
    process.stdin.setEncoding("utf8");
  }

  /**
   * Set the server reference to access tools and other server properties
   */
  public setServer(server: MCPServer): void {
    this.server = server;
  }

  /**
   * Start the transport and setup stdin/stdout handlers
   */
  public async start(): Promise<void> {
    if (this.isStarted) return;

    if (!this.silent) {
      logger.info("Starting stdio transport");
    }

    // Setup input handling
    this.setupInputHandling();

    this.isStarted = true;

    if (!this.silent) {
      logger.info("Stdio transport started");
    }

    // Send system info notification
    this.sendSystemInfo();

    // Send available tools notification
    this.sendAvailableTools();
  }

  /**
   * Send system information as a notification
   * This helps clients understand the capabilities of the server
   */
  private sendSystemInfo(): void {
    const notification = {
      jsonrpc: "2.0",
      method: "system.info",
      params: {
        name: "Home Assistant Model Context Protocol Server",
        version: "1.0.0",
        transport: "stdio",
        protocol: "json-rpc-2.0",
        features: ["streaming"],
        timestamp: new Date().toISOString(),
      },
    };

    // Send directly to stdout
    process.stdout.write(JSON.stringify(notification) + "\n");
  }

  /**
   * Send available tools as a notification
   * This helps clients know what tools are available to use
   */
  private sendAvailableTools(): void {
    if (!this.server) {
      logger.warn("Cannot send available tools: server reference not set");
      return;
    }

    const tools = this.server.getAllTools().map((tool) => {
      // For parameters, create a simple JSON schema or empty object
      const parameters = tool.parameters
        ? { type: "object", properties: {} } // Simplified schema
        : { type: "object", properties: {} };

      return {
        name: tool.name,
        description: tool.description,
        parameters,
        metadata: tool.metadata,
      };
    });

    const notification = {
      jsonrpc: "2.0",
      method: "tools.available",
      params: { tools },
    };

    // Send directly to stdout
    process.stdout.write(JSON.stringify(notification) + "\n");
  }

  /**
   * Set up the input handling for JSON-RPC requests
   */
  private setupInputHandling(): void {
    let buffer = "";

    process.stdin.on("data", (chunk: string) => {
      buffer += chunk;

      try {
        // Look for complete JSON objects by matching opening and closing braces
        let startIndex = 0;
        let openBraces = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === "\\" && inString) {
            escapeNext = true;
            continue;
          }

          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === "{") {
              if (openBraces === 0) {
                startIndex = i;
              }
              openBraces++;
            } else if (char === "}") {
              openBraces--;

              if (openBraces === 0) {
                // We have a complete JSON object
                const jsonStr = buffer.substring(startIndex, i + 1);
                this.handleJsonRequest(jsonStr);

                // Remove the processed part from the buffer
                buffer = buffer.substring(i + 1);

                // Reset the parser to start from the beginning of the new buffer
                i = -1;
              }
            }
          }
        }
      } catch (error) {
        if (this.debug) {
          logger.error("Error processing JSON-RPC input", error);
        }

        this.sendErrorResponse(null, new JSONRPCError.ParseError("Invalid JSON"));
      }
    });

    process.stdin.on("end", () => {
      if (!this.silent) {
        logger.info("Stdio transport: stdin ended");
      }
      process.exit(0);
    });

    process.stdin.on("error", (error) => {
      logger.error("Stdio transport: stdin error", error);
      process.exit(1);
    });
  }

  /**
   * Handle a JSON-RPC request
   */
  private async handleJsonRequest(jsonStr: string): Promise<void> {
    try {
      const request = JSON.parse(jsonStr);

      if (this.debug) {
        logger.debug(`Received request: ${jsonStr}`);
      }

      if (!request.jsonrpc || request.jsonrpc !== "2.0") {
        return this.sendErrorResponse(
          request.id,
          new JSONRPCError.InvalidRequest("Invalid JSON-RPC 2.0 request"),
        );
      }

      const mcpRequest: MCPRequest = {
        jsonrpc: request.jsonrpc,
        id: request.id,
        method: request.method,
        params: request.params || {},
      };

      if (!this.server) {
        return this.sendErrorResponse(
          request.id,
          new JSONRPCError.InternalError("Server not available"),
        );
      }

      // Delegate to the server to handle the request
      if (this.handler) {
        const response = await this.handler(mcpRequest);
        this.sendResponse(response);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.sendErrorResponse(null, new JSONRPCError.ParseError("Invalid JSON"));
      } else {
        this.sendErrorResponse(null, new JSONRPCError.InternalError("Internal error"));
      }

      if (this.debug) {
        logger.error("Error handling JSON-RPC request", error);
      }
    }
  }

  /**
   * Send a JSON-RPC error response
   */
  private sendErrorResponse(id: string | number | null, error: JSONRPCError.JSONRPCError): void {
    const response = {
      jsonrpc: "2.0",
      id: id,
      error: {
        code: error.code,
        message: error.message,
        data: error.data,
      },
    };

    process.stdout.write(JSON.stringify(response) + "\n");
  }

  /**
   * Send an MCPResponse to the client
   */
  public sendResponse(response: MCPResponse): void {
    const jsonRpcResponse = {
      jsonrpc: "2.0",
      id: response.id,
      ...(response.error ? { error: response.error } : { result: response.result }),
    };

    process.stdout.write(JSON.stringify(jsonRpcResponse) + "\n");
  }

  /**
   * Stream a partial response for long-running operations
   */
  public streamResponsePart(requestId: string | number, result: ToolExecutionResult): void {
    const streamResponse = {
      jsonrpc: "2.0",
      method: "stream.data",
      params: {
        id: requestId,
        data: result,
      },
    };

    process.stdout.write(JSON.stringify(streamResponse) + "\n");
  }

  /**
   * Stop the transport
   */
  public async stop(): Promise<void> {
    if (!this.isStarted) return;

    if (!this.silent) {
      logger.info("Stopping stdio transport");
    }

    this.isStarted = false;
  }
}
