/**
 * HTTP Transport for MCP
 *
 * This module implements a JSON-RPC 2.0 transport layer over HTTP/HTTPS
 * for the Model Context Protocol. It supports both traditional request/response
 * patterns as well as streaming responses via Server-Sent Events (SSE).
 */

import type { Express, Request, Response } from "express";
import { EventEmitter } from "events";
import {
  MCPErrorCode,
  type MCPRequest,
  type MCPResponse,
  type TransportLayer,
} from "../types";
import { logger } from "../../utils/logger";

interface McpRequestBody {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

interface ServerSentEventsClient {
  id: string;
  response: Response;
}

/**
 * A transport for the MCP server that uses HTTP.
 * This transport attaches to an existing Express app.
 */
export class HttpTransport implements TransportLayer {
  name = "http";
  private app: Express;
  private handler: ((request: MCPRequest) => Promise<MCPResponse>) | null = null;
  private initialized = false;
  private sseClients: Map<string, ServerSentEventsClient>;
  private events: EventEmitter;

  private apiPrefix: string;
  private debug: boolean;

  /**
   * Creates an instance of HttpTransport.
   * @param options - The options for the transport.
   */
  constructor(options: {
    expressApp: Express;
    apiPrefix?: string;
    debug?: boolean;
  }) {
    this.app = options.expressApp;
    this.apiPrefix = options.apiPrefix ?? "/api";
    this.debug = options.debug ?? process.env.DEBUG_HTTP === "true";
    this.sseClients = new Map();
    this.events = new EventEmitter();
    this.events.setMaxListeners(100);
  }

  /**
   * Initializes the transport.
   * @param handler - The handler for MCP requests.
   */
  public initialize(
    handler: (request: MCPRequest) => Promise<MCPResponse>,
  ): void {
    this.handler = handler;
    this.setupRoutes();
    this.initialized = true;
  }

  /**
   * Starts the transport.
   */
  public async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error("HttpTransport not initialized");
    }
    logger.info("HTTP transport is using an external Express app. Start is a no-op.");
    return Promise.resolve();
  }

  /**
   * Stops the transport.
   */
  public async stop(): Promise<void> {
    logger.info("HTTP transport is using an external Express app. Stop is a no-op.");
    return Promise.resolve();
  }

  /**
   * Sets up the routes for the transport.
   */
  private setupRoutes(): void {
    this.app.post(`${this.apiPrefix}/mcp`, this.handleRequest.bind(this));
    this.app.get(`${this.apiPrefix}/events`, this.handleSse.bind(this));
  }

  /**
   * Handles Server-Sent Events connections.
   * @param req - The request object.
   * @param res - The response object.
   */
  private handleSse(req: Request, res: Response): void {
    const clientId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const newClient: ServerSentEventsClient = { id: clientId, response: res };
    this.sseClients.set(clientId, newClient);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const cleanupClient = (): void => {
      this.sseClients.delete(clientId);
      this.events.emit("client-disconnected", clientId);
      if (this.debug) logger.info(`SSE client disconnected: ${clientId}`);
    };

    req.on("close", cleanupClient);
    this.events.emit("client-connected", clientId);
    if (this.debug) logger.info(`New SSE client connected: ${clientId}`);
  }

  /**
   * Handles MCP requests.
   * @param req - The request object.
   * @param res - The response object.
   */
  private async handleRequest(req: Request, res: Response): Promise<void> {
    const body = req.body as McpRequestBody;

    if (!this.handler) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: MCPErrorCode.INTERNAL_ERROR, message: "Handler not initialized" },
        id: body?.id ?? null,
      });
      return;
    }

    if (typeof body !== "object" || body === null) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: MCPErrorCode.PARSE_ERROR, message: "Invalid request body" },
        id: null,
      });
      return;
    }

    if (body.jsonrpc !== "2.0") {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: MCPErrorCode.INVALID_REQUEST, message: "Invalid JSON-RPC version" },
        id: body.id ?? null,
      });
      return;
    }

    const mcpRequest: MCPRequest = {
      jsonrpc: "2.0",
      id: body.id ?? null,
      method: body.method as string,
      params: body.params as Record<string, unknown> | undefined,
    };

    try {
      const mcpResponse = await this.handler(mcpRequest);
      res.status(200).json(mcpResponse);
    } catch (error) {
      const mcpError =
        error instanceof Error
          ? { code: MCPErrorCode.INTERNAL_ERROR, message: error.message }
          : { code: MCPErrorCode.INTERNAL_ERROR, message: "An unknown error occurred" };
      res.status(500).json({ jsonrpc: "2.0", error: mcpError, id: mcpRequest.id });
    }
  }
}
