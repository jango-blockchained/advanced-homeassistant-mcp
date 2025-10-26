import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const hassDictionarySchema = z
  .record(z.string(), z.unknown())
  .describe("Arbitrary Home Assistant data payload");

const stringOrStringArraySchema = z
  .union([
    z.string(),
    z.array(z.string()).min(1).describe("List of entity IDs"),
  ])
  .describe("Entity ID or list of entity IDs");

const templatedScalarSchema = z
  .union([z.string(), z.number(), hassDictionarySchema])
  .describe("Literal or templated value");

const automationTriggerSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe("Optional trigger identifier"),
    platform: z
      .string()
      .min(1)
      .describe("Trigger platform (state, time, event, device, etc.)"),
  })
  .passthrough()
  .describe("Home Assistant trigger definition");

const automationConditionSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      alias: z
        .string()
        .optional()
        .describe("Optional condition alias"),
      condition: z
        .string()
        .min(1)
        .describe("Condition type (state, numeric_state, and/or, etc.)"),
      conditions: z
        .array(automationConditionSchema)
        .optional()
        .describe("Nested conditions"),
    })
    .passthrough()
    .describe("Home Assistant condition definition"),
);

const automationActionSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      alias: z
        .string()
        .optional()
        .describe("Optional action alias"),
      service: z
        .string()
        .optional()
        .describe("Home Assistant service to call"),
    })
    .passthrough()
    .describe("Home Assistant action step"),
);

const automationConfigSchema = z
  .object({
    alias: z
      .string()
      .min(1)
      .describe("Friendly name for the automation"),
    trigger: z
      .array(automationTriggerSchema)
      .min(1, "At least one trigger is required")
      .describe("List of triggers"),
    condition: z
      .array(automationConditionSchema)
      .optional()
      .describe("List of conditions"),
    action: z
      .array(automationActionSchema)
      .min(1, "At least one action is required")
      .describe("List of actions"),
  })
  .passthrough()
  .describe("Automation configuration (required for create and update)");

const automationConfigTool = {
  name: "automation_config",
  description: "Advanced automation configuration and management",
  parameters: z.object({
    action: z
      .enum(["create", "update", "delete", "duplicate"])
      .describe("Action to perform with automation config"),
    automation_id: z
      .string()
      .optional()
      .describe("Automation ID (required for update, delete, and duplicate)"),
    config: automationConfigSchema
      .optional()
      .describe("Automation configuration (required for create and update)"),
  }),
};

try {
  const jsonSchema = zodToJsonSchema(automationConfigTool.parameters);
  console.log(JSON.stringify(jsonSchema, null, 2));
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : error);
}
