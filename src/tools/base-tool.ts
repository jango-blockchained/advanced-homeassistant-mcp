/**
 * Base Tool Class
 *
 * This abstract class provides common functionality for all tools,
 * including parameter validation, execution context, error handling,
 * and support for streaming responses.
 */

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  ToolDefinition,
  ToolMetadata,
  MCPContext,
  MCPStreamPart,
  MCPErrorCode,
} from "../mcp/types";

/**
 * Abstract base class for all tools
 */
export abstract class BaseTool implements ToolDefinition {
  public name: string;
  public description: string;
  public parameters?: z.ZodType<unknown>;
  public returnType?: z.ZodType<unknown>;
  public metadata?: ToolMetadata;

  /**
   * Constructor
   */
  constructor(props: {
    name: string;
    description: string;
    parameters?: z.ZodType<unknown>;
    returnType?: z.ZodType<unknown>;
    metadata?: Partial<ToolMetadata>;
  }) {
    this.name = props.name;
    this.description = props.description;
    this.parameters = props.parameters;
    this.returnType = props.returnType;

    // Set default metadata
    this.metadata = {
      category: "general",
      version: "1.0.0",
      ...props.metadata,
    };
  }

  /**
   * Main execute method to be implemented by subclasses
   */
  public abstract execute(params: unknown, context: MCPContext): Promise<unknown>;

  /**
   * Validate parameters against schema
   */
  protected validateParams(params: unknown): unknown {
    if (!this.parameters) {
      return params;
    }

    try {
      return this.parameters.parse(params);
    } catch (error) {
      throw {
        code: MCPErrorCode.VALIDATION_ERROR,
        message: `Invalid parameters for tool '${this.name}'`,
        data: error,
      };
    }
  }

  /**
   * Validate result against schema
   */
  protected validateResult(result: unknown): unknown {
    if (!this.returnType) {
      return result;
    }

    try {
      return this.returnType.parse(result);
    } catch (error) {
      throw {
        code: MCPErrorCode.VALIDATION_ERROR,
        message: `Invalid result from tool '${this.name}'`,
        data: error,
      };
    }
  }

  /**
   * Send a streaming response part
   */
  protected sendStreamPart(data: unknown, context: MCPContext, isFinal: boolean = false): void {
    // Get requestId from context
    const { requestId, server } = context;

    // Get active transports with streaming support
    const streamingTransports = Array.from(server["transports"]).filter(
      (transport) => !!transport.sendStreamPart,
    );

    if (streamingTransports.length === 0) {
      context.logger.warn(
        `Tool '${this.name}' attempted to stream, but no transports support streaming`,
      );
      return;
    }

    // Create stream part message
    const streamPart: MCPStreamPart = {
      id: requestId,
      partId: uuidv4(),
      final: isFinal,
      data: data,
    };

    // Send to all transports with streaming support
    for (const transport of streamingTransports) {
      transport.sendStreamPart(streamPart);
    }
  }

  /**
   * Create a streaming executor wrapper
   */
  protected createStreamingExecutor<T>(
    generator: (params: unknown, context: MCPContext) => AsyncGenerator<T, T, void>,
    context: MCPContext,
  ): (params: unknown) => Promise<T> {
    return async (params: unknown): Promise<T> => {
      const validParams = this.validateParams(params);
      let finalResult: T | undefined = undefined;

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
          return validResult as T;
        }

        throw new Error("Streaming generator did not produce a final result");
      } catch (error) {
        context.logger.error(`Error in streaming tool '${this.name}':`, error);
        throw error;
      }
    };
  }

  /**
   * Convert tool to SchemaObject format (for Claude and OpenAI)
   */
  public toSchemaObject(): Record<string, unknown> {
    // Convert Zod schema to JSON Schema for parameters
    const parametersSchema = this.parameters
      ? this.zodToJsonSchema(this.parameters)
      : {
          type: "object",
          properties: {},
          required: [],
        };

    return {
      name: this.name,
      description: this.description,
      parameters: parametersSchema,
    };
  }

  /**
   * Convert Zod schema to JSON Schema (simplified)
   */
  private zodToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
    // This is a simplified conversion - in production you'd want a full implementation
    // or use a library like zod-to-json-schema

    // Basic implementation just to support our needs
    if (schema instanceof z.ZodObject) {
      const shape = (schema as any)._def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        // Add to required array if the field is required
        if (!(value instanceof z.ZodOptional)) {
          required.push(key);
        }

        // Convert property - explicitly cast value to ZodType to fix linter error
        properties[key] = this.zodTypeToJsonType(value as z.ZodType<unknown>);
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    // Fallback for other schema types
    return { type: "object" };
  }

  /**
   * Convert Zod type to JSON Schema type (simplified)
   */
  private zodTypeToJsonType(zodType: z.ZodType<unknown>): Record<string, unknown> {
    if (zodType instanceof z.ZodString) {
      return { type: "string" };
    } else if (zodType instanceof z.ZodNumber) {
      return { type: "number" };
    } else if (zodType instanceof z.ZodBoolean) {
      return { type: "boolean" };
    } else if (zodType instanceof z.ZodArray) {
      return {
        type: "array",
        items: this.zodTypeToJsonType(zodType.element as z.ZodType<unknown>),
      };
    } else if (zodType instanceof z.ZodEnum) {
      return {
        type: "string",
        enum: zodType.options,
      };
    } else if (zodType instanceof z.ZodOptional) {
      return this.zodTypeToJsonType(zodType.unwrap() as z.ZodType<unknown>);
    } else if (zodType instanceof z.ZodObject) {
      return this.zodToJsonSchema(zodType);
    }

    return { type: "object" };
  }
}
