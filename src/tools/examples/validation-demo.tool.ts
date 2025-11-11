/**
 * Example Tool: Validation Demo
 *
 * This tool demonstrates how to implement validation using Zod schemas
 * in MCP tools. It provides examples of different validation rules and
 * how they can be applied to tool parameters.
 */

import { z } from "zod";
import { BaseTool } from "../../mcp/BaseTool.js";

// Define a complex schema with various validation rules
const validationDemoSchema = z.object({
  // String validations
  email: z.string().email().describe("An email address to validate"),

  url: z.string().url().optional().describe("Optional URL to validate"),

  // Number validations
  age: z.number().int().min(18).max(120).describe("Age (must be between 18-120)"),

  score: z.number().min(0).max(100).default(50).describe("Score from 0-100"),

  // Array validations
  tags: z
    .array(z.string().min(2).max(20))
    .min(1)
    .max(5)
    .describe("Between 1-5 tags, each 2-20 characters"),

  // Enum validations
  role: z.enum(["admin", "user", "guest"]).describe("User role (admin, user, or guest)"),

  // Object validations
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).default("system").describe("UI theme preference"),
      notifications: z.boolean().default(true).describe("Whether to enable notifications"),
      language: z.string().default("en").describe("Preferred language code"),
    })
    .optional()
    .describe("Optional user preferences"),
});

// Define types based on the schema
type ValidationDemoParams = z.infer<typeof validationDemoSchema>;
type ValidationDemoResult = {
  valid: boolean;
  message: string;
  validatedData: ValidationDemoParams;
  metadata: {
    fieldsValidated: string[];
    timestamp: string;
  };
};

/**
 * A tool that demonstrates parameter validation using Zod schemas
 */
export class ValidationDemoTool extends BaseTool<ValidationDemoParams, ValidationDemoResult> {
  constructor() {
    super({
      name: "validation_demo",
      description: "Demonstrates parameter validation using Zod schemas",
      version: "1.0.0",
      parameters: validationDemoSchema,
    });
  }

  /**
   * Execute the validation demo tool
   */
  async execute(params: ValidationDemoParams): Promise<ValidationDemoResult> {
    // Get all field names that were validated
    const fieldsValidated = Object.keys(params);

    // Process the validated data (in a real tool, this would do something useful)
    return {
      valid: true,
      message: "All parameters successfully validated",
      validatedData: params,
      metadata: {
        fieldsValidated,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
