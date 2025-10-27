/**
 * MCPServer.ts
 *
 * Core implementation of the Model Context Protocol server.
 * This class manages tool registration, execution, and resource handling
 * while providing integration with various transport layers.
 */
import { EventEmitter } from "events";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";
// Error code enum to break circular dependency
export var MCPErrorCode;
(function (MCPErrorCode) {
    // Standard JSON-RPC 2.0 error codes
    MCPErrorCode[MCPErrorCode["PARSE_ERROR"] = -32700] = "PARSE_ERROR";
    MCPErrorCode[MCPErrorCode["INVALID_REQUEST"] = -32600] = "INVALID_REQUEST";
    MCPErrorCode[MCPErrorCode["METHOD_NOT_FOUND"] = -32601] = "METHOD_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["INVALID_PARAMS"] = -32602] = "INVALID_PARAMS";
    MCPErrorCode[MCPErrorCode["INTERNAL_ERROR"] = -32603] = "INTERNAL_ERROR";
    // Custom MCP error codes
    MCPErrorCode[MCPErrorCode["TOOL_EXECUTION_ERROR"] = -32000] = "TOOL_EXECUTION_ERROR";
    MCPErrorCode[MCPErrorCode["VALIDATION_ERROR"] = -32001] = "VALIDATION_ERROR";
    MCPErrorCode[MCPErrorCode["RESOURCE_NOT_FOUND"] = -32002] = "RESOURCE_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["RESOURCE_BUSY"] = -32003] = "RESOURCE_BUSY";
    MCPErrorCode[MCPErrorCode["TIMEOUT"] = -32004] = "TIMEOUT";
    MCPErrorCode[MCPErrorCode["CANCELED"] = -32005] = "CANCELED";
    MCPErrorCode[MCPErrorCode["AUTHENTICATION_ERROR"] = -32006] = "AUTHENTICATION_ERROR";
    MCPErrorCode[MCPErrorCode["AUTHORIZATION_ERROR"] = -32007] = "AUTHORIZATION_ERROR";
    MCPErrorCode[MCPErrorCode["TRANSPORT_ERROR"] = -32008] = "TRANSPORT_ERROR";
    MCPErrorCode[MCPErrorCode["STREAMING_ERROR"] = -32009] = "STREAMING_ERROR";
})(MCPErrorCode || (MCPErrorCode = {}));
// Server events enum to break circular dependency
export var MCPServerEvents;
(function (MCPServerEvents) {
    MCPServerEvents["STARTING"] = "starting";
    MCPServerEvents["STARTED"] = "started";
    MCPServerEvents["SHUTTING_DOWN"] = "shuttingDown";
    MCPServerEvents["SHUTDOWN"] = "shutdown";
    MCPServerEvents["REQUEST_RECEIVED"] = "requestReceived";
    MCPServerEvents["RESPONSE_SENT"] = "responseSent";
    MCPServerEvents["RESPONSE_ERROR"] = "responseError";
    MCPServerEvents["TOOL_REGISTERED"] = "toolRegistered";
    MCPServerEvents["TRANSPORT_REGISTERED"] = "transportRegistered";
    MCPServerEvents["CONFIG_UPDATED"] = "configUpdated";
})(MCPServerEvents || (MCPServerEvents = {}));
/**
 * Main Model Context Protocol server class
 */
export class MCPServer extends EventEmitter {
    static instance;
    tools = new Map();
    middlewares = [];
    transports = [];
    resourceManager;
    config;
    resources = new Map();
    /**
     * Private constructor for singleton pattern
     */
    constructor(config = {}) {
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
    static getInstance(config) {
        if (!MCPServer.instance) {
            MCPServer.instance = new MCPServer(config);
        }
        else if (config) {
            MCPServer.instance.configure(config);
        }
        return MCPServer.instance;
    }
    /**
     * Update server configuration
     */
    configure(config) {
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
    registerTool(tool) {
        if (this.tools.has(tool.name)) {
            logger.warn(`Tool '${tool.name}' is already registered. Overwriting.`);
        }
        // Convert plain Tool to ToolDefinition if needed
        let toolDef;
        if ('execute' in tool && typeof tool.execute === 'function') {
            // Check if it's already a ToolDefinition (has context parameter)
            const executeStr = tool.execute.toString();
            if (executeStr.includes('context') || executeStr.includes('MCPContext')) {
                toolDef = tool;
            }
            else {
                // It's a plain Tool, wrap it to provide context
                const plainTool = tool;
                toolDef = {
                    name: plainTool.name,
                    description: plainTool.description,
                    parameters: plainTool.parameters,
                    execute: async (params, context) => {
                        return plainTool.execute(params);
                    }
                };
            }
        }
        else {
            toolDef = tool;
        }
        this.tools.set(tool.name, toolDef);
        logger.debug(`Tool '${tool.name}' registered`);
        this.emit(MCPServerEvents.TOOL_REGISTERED, toolDef);
    }
    /**
     * Register multiple tools at once
     */
    registerTools(tools) {
        tools.forEach(tool => this.registerTool(tool));
    }
    /**
     * Get a tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }
    /**
     * Get all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Register a transport layer
     */
    registerTransport(transport) {
        this.transports.push(transport);
        transport.initialize(this.handleRequest.bind(this));
        logger.debug(`Transport '${transport.name}' registered`);
        this.emit(MCPServerEvents.TRANSPORT_REGISTERED, transport);
    }
    /**
     * Add a middleware to the pipeline
     */
    use(middleware) {
        this.middlewares.push(middleware);
        logger.debug("Middleware added");
    }
    /**
     * Handle an incoming request through the middleware pipeline
     */
    async handleRequest(request) {
        const context = {
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
        const next = async () => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                return middleware(request, context, next);
            }
            else {
                return this.executeRequest(request, context);
            }
        };
        try {
            const response = await next();
            this.emit(MCPServerEvents.RESPONSE_SENT, response, context);
            return response;
        }
        catch (error) {
            const errorResponse = {
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
    async executeRequest(request, context) {
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
                        let inputSchema = {
                            type: "object",
                            properties: {}
                        };
                        if (tool.parameters) {
                            try {
                                // Convert Zod schema to JSON Schema
                                const jsonSchema = zodToJsonSchema(tool.parameters);
                                inputSchema = jsonSchema;
                            }
                            catch (error) {
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
            const toolName = params.name;
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
            }
            catch (error) {
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
        }
        catch (error) {
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
    async validationMiddleware(request, context, next) {
        const { method, params = {} } = request;
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
            }
            catch (validationError) {
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
    async errorHandlingMiddleware(request, context, next) {
        try {
            return await next();
        }
        catch (error) {
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
    async acquireResource(resourceType, resourceId, context) {
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
    async releaseResource(resourceType, resourceId, context) {
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
    async listResources(context, resourceType) {
        if (resourceType) {
            logger.debug(`Listing resources of type ${resourceType}`);
            if (!this.resources.has(resourceType)) {
                return [];
            }
            await Promise.resolve(); // Add await to satisfy linter
            return Array.from(this.resources.get(resourceType).keys());
        }
        else {
            logger.debug('Listing all resource types');
            await Promise.resolve(); // Add await to satisfy linter
            return Array.from(this.resources.keys());
        }
    }
    /**
     * Start the server
     */
    async start() {
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
    async shutdown() {
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
