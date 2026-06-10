/**
 * Base Tool Implementation for MCP
 *
 * This base class provides the foundation for all tools in the MCP implementation,
 * with typed parameters, validation, streaming support, and error handling.
 * Merged from src/mcp/BaseTool.ts (generics) and src/tools/base-tool.ts (streaming).
 */

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { ToolDefinition, ToolMetadata, MCPContext, MCPStreamPart, MCPErrorCode } from "./types.js";

/**
 * Configuration options for creating a tool
 */
export interface ToolOptions<P = unknown, R = unknown> {
  name: string;
  description: string;
  // The third generic on ZodType is the *input* shape. We use `any` to
  // allow tools to pass a schema whose input type differs from the
  // parsed output type — common when `.default()` or `.optional()` is
  // used, since the input is `T | undefined` and the output is `T`.
  parameters?: z.ZodType<P, z.ZodTypeDef, any>;
  returnType?: z.ZodType<R>;
  metadata?: Partial<ToolMetadata>;
}

/**
 * Base class for all MCP tools
 *
 * Provides:
 * - Parameter validation with Zod (with generics support)
 * - Return type validation
 * - Streaming support via AsyncGenerator
 * - Error handling
 * - Type safety
 * - Schema conversion for AI assistants
 */
export abstract class BaseTool<P = unknown, R = unknown> implements ToolDefinition<P, R> {
  public readonly name: string;
  public readonly description: string;
  public readonly parameters?: z.ZodType<P, z.ZodTypeDef, any>;
  public readonly returnType?: z.ZodType<R>;
  public readonly metadata: ToolMetadata;

  /**
   * Create a new tool
   */
  constructor(options: ToolOptions<P, R>) {
    this.name = options.name;
    this.description = options.description;
    this.parameters = options.parameters;
    this.returnType = options.returnType;

    // Set default metadata
    this.metadata = {
      category: "general",
      version: "1.0.0",
      ...options.metadata,
    };
  }

  /**
   * Execute the tool with the given parameters
   *
   * @param params The validated parameters for the tool
   * @param context Execution context with logger, server, etc.
   * @returns The result of the tool execution
   */
  abstract execute(params: P, context: MCPContext): Promise<R>;

  /**
   * Get tool definition for registration
   */
  public getDefinition(): ToolDefinition<P, R> {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      returnType: this.returnType,
      metadata: this.metadata,
      execute: this.execute.bind(this),
    };
  }

  /**
   * Validate parameters against the schema
   *
   * @param params Parameters to validate
   * @returns Validated parameters
   * @throws Error with MCPErrorCode if validation fails
   */
  protected validateParams(params: unknown): P {
    if (!this.parameters) {
      return params as P;
    }

    try {
      return this.parameters.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw {
          code: MCPErrorCode.VALIDATION_ERROR,
          message: `Invalid parameters for tool '${this.name}': ${issues}`,
          data: error,
        };
      }
      throw error;
    }
  }

  /**
   * Validate result against the schema
   *
   * @param result Result to validate
   * @returns Validated result
   * @throws Error with MCPErrorCode if validation fails
   */
  protected validateResult(result: unknown): R {
    if (!this.returnType) {
      return result as R;
    }

    try {
      return this.returnType.parse(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw {
          code: MCPErrorCode.VALIDATION_ERROR,
          message: `Invalid result from tool '${this.name}': ${issues}`,
          data: error,
        };
      }
      throw error;
    }
  }

  /**
   * Send a streaming response part
   *
   * @param data The data to send
   * @param context The MCP context
   * @param isFinal Whether this is the final part
   */
  protected sendStreamPart(data: unknown, context: MCPContext, isFinal: boolean = false): void {
    const { requestId, server } = context;

    // Get active transports with streaming support
    const transports = server["transports"] as Array<{
      sendStreamPart?: (part: MCPStreamPart) => void;
    }>;
    const streamingTransports = transports.filter((transport) => !!transport.sendStreamPart);

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
      if (transport.sendStreamPart) {
        transport.sendStreamPart(streamPart);
      }
    }
  }

  /**
   * Create a streaming executor wrapper for AsyncGenerator-based tools
   *
   * @param generator The async generator function
   * @param context The MCP context
   * @returns A function that executes the generator with streaming
   */
  protected createStreamingExecutor<T>(
    generator: (params: P, context: MCPContext) => AsyncGenerator<T, T, void>,
    context: MCPContext,
  ): (params: P) => Promise<T> {
    return async (params: P): Promise<T> => {
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
          const validResult = this.validateResult(finalResult) as unknown as T;
          this.sendStreamPart(validResult, context, true);
          return validResult;
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
    if (schema instanceof z.ZodObject) {
      const zodObj = schema as z.ZodObject<z.ZodRawShape>;
      const shape = zodObj.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      const entries = Object.entries(shape);
      for (const [key, value] of entries) {
        // Add to required array if the field is required
        if (!(value instanceof z.ZodOptional)) {
          required.push(key);
        }

        // Convert property - use type assertion to avoid lint error
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
