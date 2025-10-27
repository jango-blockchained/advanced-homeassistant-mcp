/**
 * Base Tool Class
 *
 * This abstract class provides common functionality for all tools,
 * including parameter validation, execution context, error handling,
 * and support for streaming responses.
 */
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { MCPErrorCode } from "../mcp/types.js";
/**
 * Abstract base class for all tools
 */
export class BaseTool {
    name;
    description;
    parameters;
    returnType;
    metadata;
    /**
     * Constructor
     */
    constructor(props) {
        this.name = props.name;
        this.description = props.description;
        this.parameters = props.parameters;
        this.returnType = props.returnType;
        // Set default metadata
        this.metadata = {
            category: "general",
            version: "1.0.0",
            ...props.metadata
        };
    }
    /**
     * Validate parameters against schema
     */
    validateParams(params) {
        if (!this.parameters) {
            return params;
        }
        try {
            return this.parameters.parse(params);
        }
        catch (error) {
            throw {
                code: MCPErrorCode.VALIDATION_ERROR,
                message: `Invalid parameters for tool '${this.name}'`,
                data: error
            };
        }
    }
    /**
     * Validate result against schema
     */
    validateResult(result) {
        if (!this.returnType) {
            return result;
        }
        try {
            return this.returnType.parse(result);
        }
        catch (error) {
            throw {
                code: MCPErrorCode.VALIDATION_ERROR,
                message: `Invalid result from tool '${this.name}'`,
                data: error
            };
        }
    }
    /**
     * Send a streaming response part
     */
    sendStreamPart(data, context, isFinal = false) {
        // Get requestId from context
        const { requestId, server } = context;
        // Get active transports with streaming support
        const streamingTransports = Array.from(server["transports"])
            .filter(transport => !!transport.sendStreamPart);
        if (streamingTransports.length === 0) {
            context.logger.warn(`Tool '${this.name}' attempted to stream, but no transports support streaming`);
            return;
        }
        // Create stream part message
        const streamPart = {
            id: requestId,
            partId: uuidv4(),
            final: isFinal,
            data: data
        };
        // Send to all transports with streaming support
        for (const transport of streamingTransports) {
            transport.sendStreamPart(streamPart);
        }
    }
    /**
     * Create a streaming executor wrapper
     */
    createStreamingExecutor(generator, context) {
        return async (params) => {
            const validParams = this.validateParams(params);
            let finalResult = undefined;
            try {
                const gen = generator(validParams, context);
                for await (const chunk of gen) {
                    // Send intermediate result
                    this.sendStreamPart(chunk, context, false);
                    finalResult = chunk;
                }
                if (finalResult !== undefined) {
                    // Validate and send final result
                    const validResult = this.validateResult(finalResult);
                    this.sendStreamPart(validResult, context, true);
                    return validResult;
                }
                throw new Error("Streaming generator did not produce a final result");
            }
            catch (error) {
                context.logger.error(`Error in streaming tool '${this.name}':`, error);
                throw error;
            }
        };
    }
    /**
     * Convert tool to SchemaObject format (for Claude and OpenAI)
     */
    toSchemaObject() {
        // Convert Zod schema to JSON Schema for parameters
        const parametersSchema = this.parameters ? this.zodToJsonSchema(this.parameters) : {
            type: "object",
            properties: {},
            required: []
        };
        return {
            name: this.name,
            description: this.description,
            parameters: parametersSchema
        };
    }
    /**
     * Convert Zod schema to JSON Schema (simplified)
     */
    zodToJsonSchema(schema) {
        // This is a simplified conversion - in production you'd want a full implementation
        // or use a library like zod-to-json-schema
        // Basic implementation just to support our needs
        if (schema instanceof z.ZodObject) {
            const shape = schema._def.shape();
            const properties = {};
            const required = [];
            for (const [key, value] of Object.entries(shape)) {
                // Add to required array if the field is required
                if (!(value instanceof z.ZodOptional)) {
                    required.push(key);
                }
                // Convert property - explicitly cast value to ZodType to fix linter error
                properties[key] = this.zodTypeToJsonType(value);
            }
            return {
                type: "object",
                properties,
                required: required.length > 0 ? required : undefined
            };
        }
        // Fallback for other schema types
        return { type: "object" };
    }
    /**
     * Convert Zod type to JSON Schema type (simplified)
     */
    zodTypeToJsonType(zodType) {
        if (zodType instanceof z.ZodString) {
            return { type: "string" };
        }
        else if (zodType instanceof z.ZodNumber) {
            return { type: "number" };
        }
        else if (zodType instanceof z.ZodBoolean) {
            return { type: "boolean" };
        }
        else if (zodType instanceof z.ZodArray) {
            return {
                type: "array",
                items: this.zodTypeToJsonType(zodType._def.type)
            };
        }
        else if (zodType instanceof z.ZodEnum) {
            return {
                type: "string",
                enum: zodType._def.values
            };
        }
        else if (zodType instanceof z.ZodOptional) {
            return this.zodTypeToJsonType(zodType._def.innerType);
        }
        else if (zodType instanceof z.ZodObject) {
            return this.zodToJsonSchema(zodType);
        }
        return { type: "object" };
    }
}
