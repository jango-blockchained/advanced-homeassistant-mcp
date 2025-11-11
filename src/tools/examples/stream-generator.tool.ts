/**
 * Example Tool: Stream Generator
 *
 * This tool demonstrates how to implement streaming functionality in MCP tools.
 * It generates a stream of data that can be consumed by clients in real-time.
 */

import { z } from "zod";
import { BaseTool } from "../../mcp/BaseTool.js";
import { MCPResponseStream } from "../../mcp/types.js";

// Schema for the stream generator parameters
const streamGeneratorSchema = z.object({
  count: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Number of items to generate in the stream (1-100)"),

  delay: z
    .number()
    .int()
    .min(100)
    .max(2000)
    .default(500)
    .describe("Delay between items in milliseconds (100-2000)"),

  includeTimestamp: z
    .boolean()
    .default(false)
    .describe("Whether to include timestamp with each streamed item"),

  failAfter: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("If greater than 0, fail after this many items (for error handling testing)"),
});

// Define the parameter and result types
type StreamGeneratorParams = z.infer<typeof streamGeneratorSchema>;
type StreamGeneratorResult = {
  message: string;
  count: number;
  timestamp?: string;
  items: string[];
};

/**
 * A tool that demonstrates streaming capabilities by generating a stream of data
 * with configurable parameters for count, delay, and error scenarios.
 */
export class StreamGeneratorTool extends BaseTool<StreamGeneratorParams, StreamGeneratorResult> {
  constructor() {
    super({
      name: "stream_generator",
      description: "Generates a stream of data with configurable delay and count",
      version: "1.0.0",
      parameters: streamGeneratorSchema,
    });
  }

  /**
   * Execute the tool and stream results back to the client
   */
  async execute(
    params: StreamGeneratorParams,
    stream?: MCPResponseStream,
  ): Promise<StreamGeneratorResult> {
    const { count, delay, includeTimestamp, failAfter } = params;
    const items: string[] = [];

    // If we have a stream, use it to send intermediate results
    if (stream) {
      for (let i = 1; i <= count; i++) {
        // Simulate a processing delay
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Check if we should fail for testing error handling
        if (failAfter > 0 && i > failAfter) {
          throw new Error(`Intentional failure after ${failAfter} items (for testing)`);
        }

        const item = `Item ${i} of ${count}`;
        items.push(item);

        // Create the intermediate result
        const partialResult: Partial<StreamGeneratorResult> = {
          message: `Generated ${i} of ${count} items`,
          count: i,
          items: [...items],
        };

        // Add timestamp if requested
        if (includeTimestamp) {
          partialResult.timestamp = new Date().toISOString();
        }

        // Stream the intermediate result
        stream.write(partialResult);
      }
    } else {
      // No streaming, generate all items at once with delay between
      for (let i = 1; i <= count; i++) {
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (failAfter > 0 && i > failAfter) {
          throw new Error(`Intentional failure after ${failAfter} items (for testing)`);
        }

        items.push(`Item ${i} of ${count}`);
      }
    }

    // Return the final result
    const result: StreamGeneratorResult = {
      message: `Successfully generated ${count} items`,
      count,
      items,
    };

    if (includeTimestamp) {
      result.timestamp = new Date().toISOString();
    }

    return result;
  }
}
