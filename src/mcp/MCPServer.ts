/**
 * MCPServer.ts
 * 
 * Core implementation of the Model Context Protocol server.
 * This class manages tool registration, execution, and resource handling
 * while providing integration with various transport layers.
 */

import { EventEmitter } from "events";
import { z } from "zod";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";
import type { Tool } from "../types/index.js";

// Error code enum to break circular dependency
export enum MCPErrorCode {
    // Standard JSON-RPC 2.0 error codes
    PARSE_ERROR = -32700,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,

    // Custom MCP error codes
    TOOL_EXECUTION_ERROR = -32000,
    VALIDATION_ERROR = -32001,
    RESOURCE_NOT_FOUND = -32002,
    RESOURCE_BUSY = -32003,
    TIMEOUT = -32004,
    CANCELED = -32005,
    AUTHENTICATION_ERROR = -32006,
    AUTHORIZATION_ERROR = -32007,
    TRANSPORT_ERROR = -32008,
    STREAMING_ERROR = -32009
}

// Server events enum to break circular dependency
export enum MCPServerEvents {
    STARTING = "starting",
    STARTED = "started",
    SHUTTING_DOWN = "shuttingDown",
    SHUTDOWN = "shutdown",
    REQUEST_RECEIVED = "requestReceived",
    RESPONSE_SENT = "responseSent",
    RESPONSE_ERROR = "responseError",
    TOOL_REGISTERED = "toolRegistered",
    TRANSPORT_REGISTERED = "transportRegistered",
    CONFIG_UPDATED = "configUpdated"
}

// Forward declarations to break circular dependency
import type {
    ToolDefinition,
    MCPMiddleware,
    MCPRequest,
    MCPResponse,
    MCPContext,
    TransportLayer,
    MCPConfig,
    ResourceManager
} from "./types.js";

/**
 * Main Model Context Protocol server class
 */
export class MCPServer extends EventEmitter {
    private static instance: MCPServer;
    private tools: Map<string, ToolDefinition> = new Map();
    private middlewares: MCPMiddleware[] = [];
    private transports: TransportLayer[] = [];
    private resourceManager: ResourceManager;
    private config: MCPConfig;
    private resources: Map<string, Map<string, any>> = new Map();

    /**
     * Private constructor for singleton pattern
     */
    private constructor(config: Partial<MCPConfig> = {}) {
        super();
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            executionTimeout: 30000,
            streamingEnabled: true,
            maxPayloadSize: 10 * 1024 * 1024, // 10MB
            ...config
        };

        this.resourceManager = {
            acquire: this.acquireResource.bind(this),
            release: this.releaseResource.bind(this),
            list: this.listResources.bind(this)
        };

        // Initialize with default middlewares
        this.use(this.validationMiddleware.bind(this));
        this.use(this.errorHandlingMiddleware.bind(this));

        logger.info("MCP Server initialized");
    }

    /**
     * Get singleton instance
     */
    public static getInstance(config?: Partial<MCPConfig>): MCPServer {
        if (!MCPServer.instance) {
            MCPServer.instance = new MCPServer(config);
        } else if (config) {
            MCPServer.instance.configure(config);
        }
        return MCPServer.instance;
    }

    /**
     * Update server configuration
     */
    public configure(config: Partial<MCPConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
        logger.debug("MCP Server configuration updated", { config });
        this.emit(MCPServerEvents.CONFIG_UPDATED, this.config);
    }

    /**
     * Register a new tool with the server
     */
    public registerTool(tool: ToolDefinition | Tool): void {
        if (this.tools.has(tool.name)) {
            logger.warn(`Tool '${tool.name}' is already registered. Overwriting.`);
        }

        // Convert plain Tool to ToolDefinition if needed
        let toolDef: ToolDefinition;
        if ('execute' in tool && typeof tool.execute === 'function') {
            // Check if it's already a ToolDefinition (has context parameter)
            const executeStr = tool.execute.toString();
            if (executeStr.includes('context') || executeStr.includes('MCPContext')) {
                toolDef = tool as ToolDefinition;
            } else {
                // It's a plain Tool, wrap it to provide context
                const plainTool = tool as Tool;
                toolDef = {
                    name: plainTool.name,
                    description: plainTool.description,
                    parameters: plainTool.parameters,
                    execute: async (params: unknown, context: MCPContext): Promise<unknown> => {
                        return plainTool.execute(params);
                    }
                };
            }
        } else {
            toolDef = tool as ToolDefinition;
        }

        this.tools.set(tool.name, toolDef);
        logger.debug(`Tool '${tool.name}' registered`);
        this.emit(MCPServerEvents.TOOL_REGISTERED, toolDef);
    }

    /**
     * Register multiple tools at once
     */
    public registerTools(tools: ToolDefinition[]): void {
        tools.forEach(tool => this.registerTool(tool));
    }

    /**
     * Get a tool by name
     */
    public getTool(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    /**
     * Get all registered tools
     */
    public getAllTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Register a transport layer
     */
    public registerTransport(transport: TransportLayer): void {
        this.transports.push(transport);
        transport.initialize(this.handleRequest.bind(this));
        logger.debug(`Transport '${transport.name}' registered`);
        this.emit(MCPServerEvents.TRANSPORT_REGISTERED, transport);
    }

    /**
     * Add a middleware to the pipeline
     */
    public use(middleware: MCPMiddleware): void {
        this.middlewares.push(middleware);
        logger.debug("Middleware added");
    }

    /**
     * Handle an incoming request through the middleware pipeline
     */
    public async handleRequest(request: MCPRequest): Promise<MCPResponse> {
        const context: MCPContext = {
            requestId: request.id ?? uuidv4(),
            startTime: Date.now(),
            resourceManager: this.resourceManager,
            tools: this.tools,
            config: this.config,
            logger: logger.child({ requestId: request.id }),
            server: this,
            state: new Map()
        };

        logger.debug(`Handling request: ${context.requestId}`, { method: request.method });
        this.emit(MCPServerEvents.REQUEST_RECEIVED, request, context);

        let index = 0;
        const next = async (): Promise<MCPResponse> => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                return middleware(request, context, next);
            } else {
                return this.executeRequest(request, context);
            }
        };

        try {
            const response = await next();
            this.emit(MCPServerEvents.RESPONSE_SENT, response, context);
            return response;
        } catch (error) {
            const errorResponse: MCPResponse = {
                id: request.id,
                error: {
                    code: MCPErrorCode.INTERNAL_ERROR,
                    message: error instanceof Error ? error.message : String(error)
                }
            };
            this.emit(MCPServerEvents.RESPONSE_ERROR, errorResponse, context);
            return errorResponse;
        }
    }

    /**
     * Execute a tool request after middleware processing
     */
    private async executeRequest(request: MCPRequest, context: MCPContext): Promise<MCPResponse> {
        const { method, params = {} } = request;

        // Handle MCP initialize request
        if (method === "initialize") {
            return {
                id: request.id,
                result: {
                    protocolVersion: "2024-11-05",
                    capabilities: {
                        tools: {
                            listChanged: true
                        },
                        resources: {
                            listChanged: true
                        }
                    },
                    serverInfo: {
                        name: "homeassistant-mcp",
                        version: "1.0.0"
                    }
                }
            };
        }

        // Handle MCP tools/list request
        if (method === "tools/list") {
            return {
                id: request.id,
                result: {
                    tools: Array.from(this.tools.values()).map(tool => {
                        interface JSONSchema {
                            type: string;
                            properties?: Record<string, unknown>;
                            required?: string[];
                            [key: string]: unknown;
                        }
                        
                        let inputSchema: JSONSchema = {
                            type: "object",
                            properties: {}
                        };

                        if (tool.parameters) {
                            try {
                                // Convert Zod schema to JSON Schema
                                const jsonSchema = zodToJsonSchema(tool.parameters) as JSONSchema;
                                inputSchema = jsonSchema;
                            } catch (error) {
                                logger.warn(`Failed to convert schema for tool ${tool.name}:`, error);
                                // Fallback to basic schema
                                inputSchema = {
                                    type: "object",
                                    properties: {}
                                };
                            }
                        }

                        return {
                            name: tool.name,
                            description: tool.description,
                            inputSchema
                        };
                    })
                }
            };
        }

        // Special case for internal context retrieval (used by transports for initialization)
        if (method === "_internal_getContext") {
            return {
                id: request.id,
                result: {
                    context: context,
                    tools: Array.from(this.tools.values()).map(tool => ({
                        name: tool.name,
                        description: tool.description,
                        metadata: tool.metadata
                    }))
                }
            };
        }

        // Handle tools/call method (MCP protocol)
        if (method === "tools/call") {
            const toolName = params.name as string;
            const toolParams = params.arguments || {};
            
            const tool = this.tools.get(toolName);
            if (!tool) {
                return {
                    id: request.id,
                    error: {
                        code: MCPErrorCode.METHOD_NOT_FOUND,
                        message: `Tool not found: ${toolName}`
                    }
                };
            }

            try {
                const result = await tool.execute(toolParams, context);
                // Wrap result in MCP content format
                return {
                    id: request.id,
                    result: {
                        content: [
                            {
                                type: "text",
                                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                            }
                        ]
                    }
                };
            } catch (error) {
                logger.error(`Error executing tool ${toolName}:`, error);
                return {
                    id: request.id,
                    error: {
                        code: MCPErrorCode.TOOL_EXECUTION_ERROR,
                        message: error instanceof Error ? error.message : String(error)
                    }
                };
            }
        }

        // Handle direct tool calls (legacy/internal) - also wrap in content format
        const tool = this.tools.get(method);
        if (!tool) {
            return {
                id: request.id,
                error: {
                    code: MCPErrorCode.METHOD_NOT_FOUND,
                    message: `Method not found: ${method}`
                }
            };
        }

        try {
            const result = await tool.execute(params, context);
            // Wrap result in MCP content format for consistency
            return {
                id: request.id,
                result: {
                    content: [
                        {
                            type: "text",
                            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                        }
                    ]
                }
            };
        } catch (error) {
            logger.error(`Error executing tool ${method}:`, error);
            return {
                id: request.id,
                error: {
                    code: MCPErrorCode.TOOL_EXECUTION_ERROR,
                    message: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }

    /**
     * Validation middleware
     */
    private async validationMiddleware(
        request: MCPRequest,
        context: MCPContext,
        next: () => Promise<MCPResponse>
    ): Promise<MCPResponse> {
        const { method, params = {} } = request;

        // List of built-in MCP methods that don't need tool validation
        const builtInMethods = [
            'initialize',
            'tools/list',
            'tools/call',
            'resources/list',
            'resources/read',
            '_internal_getContext'
        ];

        // Skip validation for built-in MCP methods
        if (builtInMethods.includes(method)) {
            return next();
        }

        const tool = this.tools.get(method);
        if (!tool) {
            return {
                id: request.id,
                error: {
                    code: MCPErrorCode.METHOD_NOT_FOUND,
                    message: `Method not found: ${method}`
                }
            };
        }

        if (tool.parameters && params) {
            try {
                // Validate parameters with the schema
                const validParams = tool.parameters.parse(params);
                // Update with validated params (which may include defaults)
                request.params = validParams;
            } catch (validationError) {
                return {
                    id: request.id,
                    error: {
                        code: MCPErrorCode.INVALID_PARAMS,
                        message: "Invalid parameters",
                        data: validationError instanceof Error ? validationError.message : String(validationError)
                    }
                };
            }
        }

        return next();
    }

    /**
     * Error handling middleware
     */
    private async errorHandlingMiddleware(
        request: MCPRequest,
        context: MCPContext,
        next: () => Promise<MCPResponse>
    ): Promise<MCPResponse> {
        try {
            return await next();
        } catch (error) {
            logger.error(`Uncaught error in request pipeline:`, error);
            return {
                id: request.id,
                error: {
                    code: MCPErrorCode.INTERNAL_ERROR,
                    message: error instanceof Error ? error.message : "An unknown error occurred",
                    data: error instanceof Error ? { name: error.name, stack: error.stack } : undefined
                }
            };
        }
    }

    /**
     * Resource acquisition
     */
    private async acquireResource(resourceType: string, resourceId: string, context: MCPContext): Promise<any> {
        logger.debug(`Acquiring resource: ${resourceType}/${resourceId}`);

        // Initialize resource type map if not exists
        if (!this.resources.has(resourceType)) {
            this.resources.set(resourceType, new Map());
        }

        const typeResources = this.resources.get(resourceType);

        // Create resource if it doesn't exist
        if (!typeResources.has(resourceId)) {
            // Create a placeholder for the resource
            const resourceData = {
                id: resourceId,
                type: resourceType,
                createdAt: Date.now(),
                data: {}
            };

            // Store the resource
            typeResources.set(resourceId, resourceData);

            // Log resource creation
            await Promise.resolve(); // Add await to satisfy linter
            logger.debug(`Created new resource: ${resourceType}/${resourceId}`);

            return resourceData;
        }

        // Return existing resource
        return typeResources.get(resourceId);
    }

    /**
     * Resource release
     */
    private async releaseResource(resourceType: string, resourceId: string, context: MCPContext): Promise<void> {
        logger.debug(`Releasing resource: ${resourceType}/${resourceId}`);

        // Check if type exists
        if (!this.resources.has(resourceType)) {
            return;
        }

        const typeResources = this.resources.get(resourceType);

        // Remove resource if it exists
        if (typeResources.has(resourceId)) {
            await Promise.resolve(); // Add await to satisfy linter
            typeResources.delete(resourceId);
            logger.debug(`Released resource: ${resourceType}/${resourceId}`);
        }
    }

    /**
     * List available resources
     */
    private async listResources(context: MCPContext, resourceType?: string): Promise<string[]> {
        if (resourceType) {
            logger.debug(`Listing resources of type ${resourceType}`);

            if (!this.resources.has(resourceType)) {
                return [];
            }

            await Promise.resolve(); // Add await to satisfy linter
            return Array.from(this.resources.get(resourceType).keys());
        } else {
            logger.debug('Listing all resource types');
            await Promise.resolve(); // Add await to satisfy linter
            return Array.from(this.resources.keys());
        }
    }

    /**
     * Start the server
     */
    public async start(): Promise<void> {
        logger.info("Starting MCP Server");
        this.emit(MCPServerEvents.STARTING);

        // Start all transports
        for (const transport of this.transports) {
            await transport.start();
        }

        this.emit(MCPServerEvents.STARTED);
        logger.info("MCP Server started");
    }

    /**
     * Gracefully shut down the server
     */
    public async shutdown(): Promise<void> {
        logger.info("Shutting down MCP Server");
        this.emit(MCPServerEvents.SHUTTING_DOWN);

        // Stop all transports
        for (const transport of this.transports) {
            await transport.stop();
        }

        // Clear resources
        this.tools.clear();
        this.middlewares = [];
        this.transports = [];
        this.resources.clear();

        this.emit(MCPServerEvents.SHUTDOWN);
        this.removeAllListeners();
        logger.info("MCP Server shut down");
    }
} 