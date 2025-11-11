/**
 * Base Tool Implementation for MCP
 *
 * This base class provides the foundation for all tools in the MCP implementation,
 * with typed parameters, validation, and error handling.
 */

import { z } from "zod";
import { ToolDefinition, ToolMetadata, MCPResponseStream } from "./types.js";

/**
 * Configuration options for creating a tool
 */
export interface ToolOptions<P = unknown> {
  name: string;
  description: string;
  version: string;
  parameters?: z.ZodType<P>;
  metadata?: ToolMetadata;
}

/**
 * Base class for all MCP tools
 *
 * Provides:
 * - Parameter validation with Zod
 * - Error handling
 * - Streaming support
 * - Type safety
 */
export abstract class BaseTool<P = unknown, R = unknown> implements ToolDefinition {
  public readonly name: string;
  public readonly description: string;
  public readonly parameters?: z.ZodType<P>;
  public readonly metadata: ToolMetadata;

  /**
   * Create a new tool
   */
  constructor(options: ToolOptions<P>) {
    this.name = options.name;
    this.description = options.description;
    this.parameters = options.parameters;
    this.metadata = {
      version: options.version,
      category: options.metadata?.category || "general",
      tags: options.metadata?.tags || [],
      examples: options.metadata?.examples || [],
    };
  }

  /**
   * Execute the tool with the given parameters
   *
   * @param params The validated parameters for the tool
   * @param stream Optional stream for sending partial results
   * @returns The result of the tool execution
   */
  abstract execute(params: P, stream?: MCPResponseStream): Promise<R>;

  /**
   * Get the parameter schema as JSON schema
   */
  public getParameterSchema(): Record<string, unknown> | undefined {
    if (!this.parameters) return undefined;
    return this.parameters.isOptional()
      ? { type: "object", properties: {} }
      : this.parameters.shape;
  }

  /**
   * Get tool definition for registration
   */
  public getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      metadata: this.metadata,
    };
  }

  /**
   * Validate parameters against the schema
   *
   * @param params Parameters to validate
   * @returns Validated parameters
   * @throws Error if validation fails
   */
  protected validateParams(params: unknown): P {
    if (!this.parameters) {
      return {} as P;
    }

    try {
      return this.parameters.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new Error(`Parameter validation failed: ${issues}`);
      }
      throw error;
    }
  }
}
