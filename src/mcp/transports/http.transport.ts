/**
 * HTTP Transport for MCP
 * 
 * This module implements a JSON-RPC 2.0 transport layer over HTTP/HTTPS
 * for the Model Context Protocol. It supports both traditional request/response
 * patterns as well as streaming responses via Server-Sent Events (SSE).
 */

import { Server as HttpServer } from "http";
import express, { Express, Request, Response, NextFunction } from "express";
// Using a direct import now that we have the types
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { TransportLayer, MCPRequest, MCPResponse, MCPStreamPart, MCPNotification, MCPErrorCode } from "../types.js";
import { logger } from "../../utils/logger.js";
import { EventEmitter } from "events";
import { apiRoutes } from "../../routes/index.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ServerSentEventsClient = {
    id: string;
    response: Response;
};

/**
 * Implementation of TransportLayer using HTTP/Express
 */
export class HttpTransport implements TransportLayer {
    public name = "http";
    private handler: ((request: MCPRequest) => Promise<MCPResponse>) | null = null;
    private app: Express;
    private server: HttpServer | null = null;
    private sseClients: Map<string, ServerSentEventsClient>;
    private events: EventEmitter;
    private initialized = false;
    private port: number;
    private corsOrigin: string | string[];
    private apiPrefix: string;
    private debug: boolean;

    /**
     * Constructor for HttpTransport
     */
    constructor(options: {
        port?: number;
        corsOrigin?: string | string[];
        apiPrefix?: string;
        debug?: boolean;
    } = {}) {
        this.port = options.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
        this.corsOrigin = options.corsOrigin ?? (process.env.CORS_ORIGIN || '*');
        this.apiPrefix = options.apiPrefix ?? '/api';
        this.debug = options.debug ?? (process.env.DEBUG_HTTP === "true");
        this.app = express();
        this.sseClients = new Map();
        this.events = new EventEmitter();

        // Configure max event listeners
        this.events.setMaxListeners(100);
    }

    /**
     * Initialize the transport with a request handler
     */
    public initialize(handler: (request: MCPRequest) => Promise<MCPResponse>): void {
        if (this.initialized) {
            throw new Error("HttpTransport already initialized");
        }

        this.handler = handler;
        this.initialized = true;

        // Setup middleware
        this.setupMiddleware();

        // Setup routes
        this.setupRoutes();

        logger.info("HTTP transport initialized");
    }

    /**
     * Setup Express middleware
     */
    private setupMiddleware(): void {
        // JSON body parser
        this.app.use(express.json({ limit: '1mb' }));

        // CORS configuration
        // Using the imported cors middleware
        try {
            this.app.use(cors({
                origin: this.corsOrigin,
                methods: ['GET', 'POST', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                credentials: true
            }));
        } catch (err) {
            logger.warn(`CORS middleware not available: ${String(err)}`);
        }

        // Request logging
        if (this.debug) {
            this.app.use((req, res, next) => {
                logger.debug(`HTTP ${req.method} ${req.url}`);
                next();
            });
        }

        // Error handling middleware
        this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            logger.error(`Express error: ${err.message}`);
            res.status(500).json({
                jsonrpc: "2.0",
                id: null,
                error: {
                    code: MCPErrorCode.INTERNAL_ERROR,
                    message: "Internal server error",
                    data: this.debug ? { stack: err.stack } : undefined
                }
            });
        });
    }

    /**
     * Setup Express routes
     */
    private setupRoutes(): void {
        // Health check endpoint
        this.app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({
                status: 'ok',
                transport: 'http',
                timestamp: new Date().toISOString()
            });
        });

        // Server info endpoint
        this.app.get(`${this.apiPrefix}/info`, (req: Request, res: Response) => {
            res.status(200).json({
                jsonrpc: "2.0",
                result: {
                    name: "Model Context Protocol Server",
                    version: "1.0.0",
                    transport: "http",
                    protocol: "json-rpc-2.0",
                    features: ["streaming"],
                    timestamp: new Date().toISOString()
                }
            });
        });

        // Mount API routes
        this.app.use(`${this.apiPrefix}`, apiRoutes);

        // SSE stream endpoint
        this.app.get(`${this.apiPrefix}/stream`, (req: Request, res: Response) => {
            const clientId = (req.query.clientId as string) || `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Set headers for SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

            // Store the client
            this.sseClients.set(clientId, { id: clientId, response: res });

            // Send initial connection established event
            res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

            // Client disconnection handler - cleanup when client closes connection
            const cleanupClient = () => {
                if (this.sseClients.has(clientId)) {
                    try {
                        res.end();
                    } catch (err) {
                        logger.debug(`Error ending SSE response: ${String(err)}`);
                    }
                    this.sseClients.delete(clientId);
                    if (this.debug) {
                        logger.debug(`SSE client cleaned up: ${clientId}`);
                    }
                }
            };

            // Handle client disconnect
            req.on('close', cleanupClient);
            req.on('end', cleanupClient);

            // Handle response errors
            res.on('error', (err) => {
                logger.error(`SSE response error for client ${clientId}:`, err);
                cleanupClient();
            });

            if (this.debug) {
                logger.debug(`SSE client connected: ${clientId}`);
            }
        });

        // JSON-RPC endpoint
        this.app.post(`${this.apiPrefix}/jsonrpc`, (req: Request, res: Response) => {
            void this.handleJsonRpcRequest(req, res);
        });

        // Default 404 handler
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({
                jsonrpc: "2.0",
                id: null,
                error: {
                    code: MCPErrorCode.METHOD_NOT_FOUND,
                    message: "Not found"
                }
            });
        });
    }

    /**
     * Handle a JSON-RPC request from HTTP
     */
    private async handleJsonRpcRequest(req: Request, res: Response): Promise<void> {
        if (!this.handler) {
            res.status(500).json({
                jsonrpc: "2.0",
                id: req.body.id || null,
                error: {
                    code: MCPErrorCode.INTERNAL_ERROR,
                    message: "Transport not properly initialized"
                }
            });
            return;
        }

        try {
            // Validate it's JSON-RPC 2.0
            if (!req.body.jsonrpc || req.body.jsonrpc !== "2.0") {
                res.status(400).json({
                    jsonrpc: "2.0",
                    id: req.body.id || null,
                    error: {
                        code: MCPErrorCode.INVALID_REQUEST,
                        message: "Invalid JSON-RPC 2.0 request: missing or invalid jsonrpc version"
                    }
                });
                return;
            }

            // Check for batch requests
            if (Array.isArray(req.body)) {
                res.status(501).json({
                    jsonrpc: "2.0",
                    id: null,
                    error: {
                        code: MCPErrorCode.METHOD_NOT_FOUND,
                        message: "Batch requests are not supported"
                    }
                });
                return;
            }

            // Handle request
            const request: MCPRequest = {
                jsonrpc: req.body.jsonrpc,
                id: req.body.id ?? null,
                method: req.body.method,
                params: req.body.params
            };

            // Get streaming preference from query params
            const useStreaming = req.query.stream === 'true';

            // Extract client ID if provided (for streaming)
            const clientId = (req.query.clientId as string) || (req.body.clientId as string);

            // Check if this is a streaming request and client is connected
            if (useStreaming && clientId && this.sseClients.has(clientId)) {
                // Add streaming metadata to the request
                request.streaming = {
                    enabled: true,
                    clientId
                };
            }

            // Process the request
            const response = await this.handler(request);

            // Return the response
            res.status(200).json({
                jsonrpc: "2.0",
                ...response
            });
        } catch (error) {
            logger.error(`Error handling JSON-RPC request: ${String(error)}`);

            res.status(500).json({
                jsonrpc: "2.0",
                id: req.body?.id || null,
                error: {
                    code: MCPErrorCode.INTERNAL_ERROR,
                    message: error instanceof Error ? error.message : "Internal error",
                    data: this.debug && error instanceof Error ? { stack: error.stack } : undefined
                }
            });
        }
    }

    /**
     * Start the HTTP server
     */
    public async start(): Promise<void> {
        if (!this.initialized) {
            throw new Error("HttpTransport not initialized");
        }

        return new Promise<void>((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    logger.info(`HTTP transport started on port ${this.port}`);
                    resolve();
                });

                // Error handler
                this.server.on('error', (err) => {
                    logger.error(`HTTP server error: ${String(err)}`);
                    reject(err);
                });
            } catch (err) {
                logger.error(`Failed to start HTTP transport: ${String(err)}`);
                reject(err);
            }
        });
    }

    /**
     * Stop the HTTP server
     */
    public async stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Close server if running
            if (this.server) {
                this.server.close((err) => {
                    if (err) {
                        logger.error(`Error shutting down HTTP server: ${String(err)}`);
                        reject(err);
                    } else {
                        logger.info("HTTP transport stopped");
                        this.server = null;
                        resolve();
                    }
                });
            } else {
                resolve();
            }

            // Close all SSE connections
            for (const client of this.sseClients.values()) {
                try {
                    client.response.write(`event: shutdown\ndata: {}\n\n`);
                    client.response.end();
                } catch (err) {
                    logger.error(`Error closing SSE connection: ${String(err)}`);
                }
            }

            // Clear all clients
            this.sseClients.clear();
        });
    }

    /**
     * Send an SSE event to a specific client
     */
    private sendSSEEvent(clientId: string, event: string, data: unknown): boolean {
        const client = this.sseClients.get(clientId);
        if (!client) {
            return false;
        }

        try {
            const payload = JSON.stringify(data);
            client.response.write(`event: ${event}\ndata: ${payload}\n\n`);
            return true;
        } catch (err) {
            logger.error(`Error sending SSE event: ${String(err)}`);
            return false;
        }
    }

    /**
     * Send a notification to a client
     */
    public sendNotification(notification: MCPNotification): void {
        // SSE notifications not supported without a client ID
        return;
    }

    /**
     * Send a streaming response part
     */
    public sendStreamPart(streamPart: MCPStreamPart): void {
        // Find the client ID in streaming metadata
        const clientId = streamPart.clientId;
        if (!clientId || !this.sseClients.has(clientId)) {
            logger.warn(`Cannot send stream part: client ${clientId || 'unknown'} not connected`);
            return;
        }

        // Send the stream part as an SSE event
        const eventPayload = {
            jsonrpc: "2.0",
            id: streamPart.id,
            stream: {
                partId: streamPart.partId,
                final: streamPart.final,
                data: streamPart.data
            }
        };

        this.sendSSEEvent(clientId, 'stream', eventPayload);

        // Debug logging
        if (this.debug) {
            logger.debug(`Sent stream part to client ${clientId}: partId=${streamPart.partId}, final=${streamPart.final}`);
        }
    }

    /**
     * Broadcast a notification to all connected clients
     */
    public broadcastNotification(event: string, data: unknown): void {
        for (const client of this.sseClients.values()) {
            try {
                const payload = JSON.stringify(data);
                client.response.write(`event: ${event}\ndata: ${payload}\n\n`);
            } catch (err) {
                logger.error(`Error broadcasting to client ${client.id}: ${String(err)}`);
            }
        }
    }

    /**
     * Send a log message (not applicable for HTTP transport)
     */
    public sendLogMessage(level: string, message: string, data?: unknown): void {
        // Log messages in HTTP context go to the logger, not to clients
        logger[level as keyof typeof logger]?.(message, data);
    }
} 