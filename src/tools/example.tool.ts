/**
 * Example Tool Implementation
 *
 * This file demonstrates how to create tools using the new BaseTool class,
 * including streaming responses and parameter validation.
 */

import { z } from "zod";
import { BaseTool } from "../mcp/index";
import { MCPContext } from "../mcp/types";

/**
 * Example streaming tool that generates a series of responses
 */
export class StreamGeneratorTool extends BaseTool {
  constructor() {
    super({
      name: "stream_generator",
      description: "Generate a stream of data with configurable delay and count",
      parameters: z.object({
        count: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .describe("Number of items to generate (1-20)"),
        delay: z
          .number()
          .int()
          .min(100)
          .max(2000)
          .default(500)
          .describe("Delay in ms between items (100-2000)"),
        prefix: z.string().optional().default("Item").describe("Optional prefix for item labels"),
      }),
      metadata: {
        category: "examples",
        version: "1.0.0",
        tags: ["streaming", "demo"],
        isStreaming: true,
      },
    });
  }

  /**
   * Execute method that demonstrates streaming capabilities
   */
  async execute(
    params: {
      count: number;
      delay: number;
      prefix: string;
    },
    context: MCPContext,
  ): Promise<any> {
    // Create streaming executor from generator function
    const streamingExecutor = this.createStreamingExecutor(this.generateItems.bind(this), context);

    // Execute with validated parameters
    return streamingExecutor(params);
  }

  /**
   * Generator function that produces stream parts
   */
  private async *generateItems(
    params: {
      count: number;
      delay: number;
      prefix: string;
    },
    context: MCPContext,
  ): AsyncGenerator<any, any, void> {
    const { count, delay, prefix } = params;
    const results = [];

    // Helper function to create a delay
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Generate items with delay
    for (let i = 1; i <= count; i++) {
      // Sleep to simulate async work
      await sleep(delay);

      // Create an item
      const item = {
        id: i,
        label: `${prefix} ${i}`,
        timestamp: new Date().toISOString(),
        progress: Math.round((i / count) * 100),
      };

      results.push(item);

      // Yield current results for streaming
      yield {
        items: [...results],
        completed: i,
        total: count,
        progress: Math.round((i / count) * 100),
      };
    }

    // Final result - this will also be returned from the execute method
    return {
      items: results,
      completed: count,
      total: count,
      progress: 100,
      finished: true,
    };
  }
}

/**
 * Example tool that validates complex input
 */
export class ValidationDemoTool extends BaseTool {
  constructor() {
    super({
      name: "validation_demo",
      description: "Demonstrates parameter validation with Zod schemas",
      parameters: z.object({
        user: z
          .object({
            name: z.string().min(2).max(50),
            email: z.string().email(),
            age: z.number().int().min(13).optional(),
          })
          .describe("User information"),
        preferences: z
          .object({
            theme: z.enum(["light", "dark", "system"]).default("system"),
            notifications: z.boolean().default(true),
          })
          .optional()
          .describe("User preferences"),
        tags: z.array(z.string()).min(1).max(5).optional().describe("Optional list of tags (1-5)"),
      }),
      metadata: {
        category: "examples",
        version: "1.0.0",
        tags: ["validation", "demo"],
      },
    });
  }

  /**
   * Execute method that demonstrates parameter validation
   */
  async execute(
    params: {
      user: {
        name: string;
        email: string;
        age?: number;
      };
      preferences?: {
        theme: "light" | "dark" | "system";
        notifications: boolean;
      };
      tags?: string[];
    },
    context: MCPContext,
  ): Promise<any> {
    // We don't need to validate here since the BaseTool does it for us
    // This just demonstrates how validated parameters look

    // Access validated and defaulted parameters
    const { user, preferences, tags } = params;

    // Wait to simulate async processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return validated data with additional information
    return {
      validated: true,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      user,
      preferences: preferences || { theme: "system", notifications: true },
      tags: tags || [],
      message: `Hello ${user.name}, your validation was successful!`,
    };
  }
}
