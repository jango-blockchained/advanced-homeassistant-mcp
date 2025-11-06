/**
 * MCP Type Definitions
 * 
 * This file contains all the type definitions used by the Model Context Protocol
 * implementation, including tools, transports, middleware, and resources.
 */

import { z } from "zod";
import { Logger } from "winston";
import { MCPServer, MCPErrorCode, MCPServerEvents } from "./MCPServer.js";

/**
 * MCP Server configuration
 */
export interface MCPConfig {
    maxRetries: number;
    retryDelay: number;
    executionTimeout: number;
    streamingEnabled: boolean;
    maxPayloadSize: number;
}

// Re-export enums from MCPServer
export { MCPErrorCode, MCPServerEvents };

/**
 * Tool definition interface
 */
export interface ToolDefinition<TParams = unknown, TReturn = unknown> {
    name: string;
    description: string;
    parameters?: z.ZodType<TParams>;
    returnType?: z.ZodType<TReturn>;
    execute: (params: TParams, context: MCPContext) => Promise<TReturn>;
    metadata?: ToolMetadata;
}

/**
 * Tool metadata for categorization and discovery
 */
export interface ToolMetadata {
    category: string;
    version: string;
    tags?: string[];
    platforms?: string[];
    requiresAuth?: boolean;
    isStreaming?: boolean;
    examples?: ToolExample[];
}

/**
 * Example usage for a tool
 */
export interface ToolExample {
    description: string;
    params: Record<string, unknown>;
    expectedResult?: unknown;
}

/**
 * JSON-RPC Request
 */
export interface MCPRequest {
    jsonrpc: string;
    id: string | number | null;
    method: string;
    params?: Record<string, unknown>;
    streaming?: {
        enabled: boolean;
        clientId: string;
    };
}

/**
 * JSON-RPC 2.0 Response
 */
export interface MCPResponse {
    jsonrpc?: string;
    id?: string | number;
    result?: unknown;
    error?: MCPError;
}

/**
 * JSON-RPC 2.0 Error
 */
export interface MCPError {
    code: number;
    message: string;
    data?: unknown;
}

/**
 * JSON-RPC 2.0 Notification
 */
export interface MCPNotification {
    jsonrpc?: string;
    method: string;
    params?: any;
}

/**
 * JSON-RPC Stream Part
 */
export interface MCPStreamPart {
    id: string | number;
    partId: string | number;
    final: boolean;
    data: unknown;
    clientId?: string;
}

/**
 * Response Stream Interface for streaming operation results
 */
export interface MCPResponseStream {
    /**
     * Write partial result data to the stream
     * 
     * @param data The partial result data
     * @returns True if the write was successful, false otherwise
     */
    write(data: any): boolean;

    /**
     * End the stream, indicating no more data will be sent
     * 
     * @param data Optional final data to send
     */
    end(data?: any): void;

    /**
     * Check if streaming is enabled
     */
    readonly isEnabled: boolean;

    /**
     * Get the client ID for this stream
     */
    readonly clientId?: string;
}

/**
 * Context for tool execution
 */
export interface MCPContext {
    requestId: string | number;
    startTime: number;
    resourceManager: ResourceManager;
    tools: Map<string, ToolDefinition>;
    config: MCPConfig;
    logger: Logger;
    server: MCPServer;
    state?: Map<string, any>;
}

/**
 * Resource manager interface
 */
export interface ResourceManager {
    acquire: (resourceType: string, resourceId: string, context: MCPContext) => Promise<any>;
    release: (resourceType: string, resourceId: string, context: MCPContext) => Promise<void>;
    list: (context: MCPContext, resourceType?: string) => Promise<string[]>;
}

/**
 * Middleware function type
 */
export type MCPMiddleware = (
    request: MCPRequest,
    context: MCPContext,
    next: () => Promise<MCPResponse>
) => Promise<MCPResponse>;

/**
 * Transport layer interface
 */
export interface TransportLayer {
    name: string;
    initialize: (handler: (request: MCPRequest) => Promise<MCPResponse>) => void;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    sendNotification?: (notification: MCPNotification) => void;
    sendStreamPart?: (streamPart: MCPStreamPart) => void;
}

/**
 * Claude-specific function call formats
 */
export interface ClaudeFunctionDefinition {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, {
            type: string;
            description: string;
            enum?: string[];
        }>;
        required: string[];
    };
}

/**
 * Cursor-specific integration types
 */
export interface CursorToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, {
        type: string;
        description: string;
        required: boolean;
    }>;
}

/**
 * Tool execution result type used in streaming responses
 */
export type ToolExecutionResult = any; 