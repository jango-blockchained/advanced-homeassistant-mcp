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
import { JSONRPCError, type JSONRPCErrorBase } from "../utils/error.js";

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
  /** Maximum bytes per line (DoS protection). 1 MB by default. */
  private readonly maxLineBytes: number = 1024 * 1024;
  /** readline interface for newline-delimited JSON framing. */
  private readlineInterface: import("node:readline").Interface | null = null;

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
  public start(): Promise<void> {
    if (this.isStarted) return Promise.resolve();

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

    return Promise.resolve();
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
   * Set up the input handling for JSON-RPC requests.
   *
   * Uses Node's readline for newline-delimited JSON framing (the de-facto
   * JSON-RPC over stdio convention). Replaces the previous custom
   * brace-counting parser which:
   *   - Did not respect brackets (e.g. {"foo":[1,2,3]} was rejected
   *     because openBraces reached 0 at the wrong bracket)
   *   - Had no max-buffer guard (a client sending a 10MB incomplete
   *     frame would OOM the process)
   *   - Did not respect JSON-RPC newline-delimited framing
   *
   * Lines exceeding MAX_LINE_BYTES are rejected with a parse error
   * (the client gets a JSON-RPC error response and can recover).
   */
  private setupInputHandling(): void {
    // Lazy import so the module loads even if readline is mocked in tests.
    const readline = require("node:readline") as typeof import("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });

    this.readlineInterface = rl;

    rl.on("line", (line) => {
      // Strip leading/trailing whitespace; ignore empty lines.
      const trimmed = line.trim();
      if (!trimmed) return;

      if (Buffer.byteLength(trimmed, "utf8") > this.maxLineBytes) {
        // Reject the oversized line. Send a parse error and continue.
        // Do NOT process the line (would risk memory blowup if the
        // client keeps sending huge lines).
        this.sendErrorResponse(
          null,
          new JSONRPCError.ParseError(`Line exceeds maximum size of ${this.maxLineBytes} bytes`),
        );
        return;
      }

      // Fire-and-forget: handleJsonRequest writes the response to stdout
      // itself; we just want it scheduled. `void` marks the promise as
      // intentionally not-awaited.
      void this.handleJsonRequest(trimmed);
    });

    rl.on("close", () => {
      if (!this.silent) {
        logger.info("Stdio transport: stdin closed");
      }
      // Do NOT call process.exit here — let the runtime decide.
      // The previous behavior (process.exit(0)) made the transport
      // untestable in harnesses that need to keep the process alive.
    });

    // Keep the legacy 'end'/'error' listeners as belt-and-suspenders, but
    // they should not fire because readline now owns the stream.
    process.stdin.on("error", (error) => {
      logger.error("Stdio transport: stdin error", error);
      // Don't process.exit — let the supervisor handle it.
    });
  }

  /**
   * Handle a JSON-RPC request
   */
  private async handleJsonRequest(jsonStr: string): Promise<void> {
    try {
      const request = JSON.parse(jsonStr) as {
        jsonrpc?: string;
        id?: string | number | null;
        method?: string;
        params?: Record<string, unknown>;
      };

      if (this.debug) {
        logger.debug(`Received request: ${jsonStr}`);
      }

      if (!request.jsonrpc || request.jsonrpc !== "2.0") {
        return this.sendErrorResponse(
          request.id ?? null,
          new JSONRPCError.InvalidRequest("Invalid JSON-RPC 2.0 request"),
        );
      }

      const mcpRequest: MCPRequest = {
        jsonrpc: request.jsonrpc,
        id: request.id ?? null,
        method: request.method ?? "",
        params: request.params ?? {},
      };

      if (!this.server) {
        return this.sendErrorResponse(
          request.id ?? null,
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
  private sendErrorResponse(id: string | number | null, error: JSONRPCErrorBase): void {
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
  public stop(): Promise<void> {
    if (!this.isStarted) return Promise.resolve();

    if (!this.silent) {
      logger.info("Stopping stdio transport");
    }

    this.isStarted = false;
    return Promise.resolve();
  }
}
