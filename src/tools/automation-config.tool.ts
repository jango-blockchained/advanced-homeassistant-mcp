import { z } from "zod";
import type {
  Tool,
  AutomationConfigParams,
  AutomationConfig,
  AutomationResponse,
} from "../types/index.js";
import { APP_CONFIG } from "../config/app.config.ts";

const hassDictionarySchema = z
  .record(z.string(), z.unknown())
  .describe("Arbitrary Home Assistant data payload");

const stringOrStringArraySchema = z
  .union([z.string(), z.array(z.string()).min(1).describe("List of entity IDs")])
  .describe("Entity ID or list of entity IDs");

const templatedScalarSchema = z
  .union([z.string(), z.number(), hassDictionarySchema])
  .describe("Literal or templated value");

const automationTriggerSchema = z
  .object({
    id: z.string().optional().describe("Optional trigger identifier"),
    platform: z.string().min(1).describe("Trigger platform (state, time, event, device, etc.)"),
    entity_id: stringOrStringArraySchema.optional().describe("Entity IDs monitored by the trigger"),
    from: z.string().optional().describe("Starting state for state triggers"),
    to: z.string().optional().describe("Target state for state triggers"),
    attribute: z.string().optional().describe("Entity attribute used in state triggers"),
    for: templatedScalarSchema.optional().describe("Duration the trigger condition must hold"),
    at: z.string().optional().describe("Time expression for time triggers"),
    event: hassDictionarySchema.optional().describe("Event payload for event triggers"),
    device_id: z.string().optional().describe("Device identifier for device triggers"),
    domain: z.string().optional().describe("Device domain for device triggers"),
    type: z.string().optional().describe("Device trigger type"),
    zone: hassDictionarySchema.optional().describe("Zone configuration for zone triggers"),
    minutes: z.number().optional().describe("Minute interval for time pattern triggers"),
    seconds: z.number().optional().describe("Second interval for time pattern triggers"),
  })
  .passthrough()
  .describe("Home Assistant trigger definition");

const automationConditionSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      alias: z.string().optional().describe("Optional condition alias"),
      condition: z.string().min(1).describe("Condition type (state, numeric_state, and/or, etc.)"),
      enabled: z.boolean().optional().describe("Whether the condition is enabled"),
      entity_id: stringOrStringArraySchema
        .optional()
        .describe("Entity IDs referenced by the condition"),
      state: z.string().optional().describe("Expected state for state conditions"),
      attribute: z.string().optional().describe("Entity attribute evaluated by the condition"),
      for: templatedScalarSchema.optional().describe("Duration the condition must hold"),
      above: z
        .union([z.number(), z.string()])
        .optional()
        .describe("Upper threshold for numeric conditions"),
      below: z
        .union([z.number(), z.string()])
        .optional()
        .describe("Lower threshold for numeric conditions"),
      value_template: z.string().optional().describe("Template used by template conditions"),
      conditions: z.array(automationConditionSchema).optional().describe("Nested conditions"),
      sequence: z
        .array(automationActionSchema)
        .optional()
        .describe("Action sequence for choose/then blocks"),
      then: z
        .array(automationActionSchema)
        .optional()
        .describe("Actions executed when condition succeeds"),
      else: z
        .array(automationActionSchema)
        .optional()
        .describe("Actions executed when condition fails"),
    })
    .passthrough()
    .describe("Home Assistant condition definition"),
);

const automationTargetSchema = z
  .object({
    entity_id: stringOrStringArraySchema.optional().describe("Entity IDs to target"),
    device_id: z.string().optional().describe("Device identifier to target"),
    area_id: z.string().optional().describe("Area identifier to target"),
  })
  .passthrough()
  .describe("Target selector");

const automationActionSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      alias: z.string().optional().describe("Optional action alias"),
      service: z.string().optional().describe("Home Assistant service to call"),
      target: automationTargetSchema
        .optional()
        .describe("Entities, devices, or areas targeted by the action"),
      data: hassDictionarySchema.optional().describe("Service data payload"),
      metadata: hassDictionarySchema.optional().describe("Additional metadata for the action"),
      entity_id: stringOrStringArraySchema.optional().describe("Entities affected by the action"),
      device_id: z.string().optional().describe("Device affected by the action"),
      domain: z.string().optional().describe("Domain associated with the action"),
      type: z.string().optional().describe("Action type for device actions"),
      choose: z
        .array(
          z
            .object({
              alias: z.string().optional().describe("Optional branch alias"),
              conditions: z
                .array(automationConditionSchema)
                .optional()
                .describe("Conditions for this branch"),
              sequence: z
                .array(automationActionSchema)
                .min(1)
                .describe("Actions executed when branch conditions pass"),
              default: z
                .array(automationActionSchema)
                .optional()
                .describe("Fallback actions when branch conditions fail"),
            })
            .passthrough()
            .describe("Conditional branch definition"),
        )
        .optional()
        .describe("Conditional branches"),
      sequence: z.array(automationActionSchema).optional().describe("Nested sequence of actions"),
      if: z
        .array(automationConditionSchema)
        .optional()
        .describe("Inline conditions evaluated before actions"),
      then: z
        .array(automationActionSchema)
        .optional()
        .describe("Actions executed when inline conditions pass"),
      else: z
        .array(automationActionSchema)
        .optional()
        .describe("Actions executed when inline conditions fail"),
      repeat: z
        .object({
          count: templatedScalarSchema.optional().describe("Number of repetitions"),
          while: z
            .array(automationConditionSchema)
            .optional()
            .describe("Conditions checked before each iteration"),
          until: z
            .array(automationConditionSchema)
            .optional()
            .describe("Conditions that end the repetition"),
          sequence: z
            .array(automationActionSchema)
            .optional()
            .describe("Actions repeated on each iteration"),
          for_each: z
            .array(z.union([z.string(), z.number(), hassDictionarySchema]))
            .optional()
            .describe("Items to iterate over"),
        })
        .passthrough()
        .optional()
        .describe("Repeat configuration"),
      delay: templatedScalarSchema.optional().describe("Delay before continuing"),
      wait_template: z.string().optional().describe("Template evaluated until it returns true"),
      wait_for_trigger: z
        .array(automationTriggerSchema)
        .optional()
        .describe("Triggers to wait for before continuing"),
      parallel: z.array(automationActionSchema).optional().describe("Actions executed in parallel"),
    })
    .passthrough()
    .describe("Home Assistant action step"),
);

const _automationConfigSchema = z
  .object({
    alias: z.string().min(1).describe("Friendly name for the automation"),
    description: z.string().optional().describe("Description of what the automation does"),
    mode: z
      .enum(["single", "parallel", "queued", "restart"])
      .optional()
      .describe("How multiple triggerings are handled"),
    trigger: z
      .array(automationTriggerSchema)
      .min(1, "At least one trigger is required")
      .describe("List of triggers"),
    condition: z.array(automationConditionSchema).optional().describe("List of conditions"),
    action: z
      .array(automationActionSchema)
      .min(1, "At least one action is required")
      .describe("List of actions"),
    variables: hassDictionarySchema
      .optional()
      .describe("Optional variables available to the automation"),
    trace: hassDictionarySchema.optional().describe("Optional trace configuration"),
  })
  .passthrough()
  .describe("Automation configuration (required for create and update)");

export const automationConfigTool: Tool = {
  name: "automation_config",
  description: "Advanced automation configuration and management",
  // Simplified schema to avoid recursive $ref issues in VSCode validation
  parameters: z.object({
    action: z
      .enum(["create", "update", "delete", "duplicate"])
      .describe("Action to perform with automation config"),
    automation_id: z
      .string()
      .optional()
      .describe("Automation ID (required for update, delete, and duplicate)"),
    config: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Automation configuration object (required for create and update)"),
  }),
  execute: async (params: AutomationConfigParams) => {
    try {
      switch (params.action) {
        case "create": {
          if (params.config == null) {
            throw new Error("Configuration is required for creating automation");
          }

          const response = await fetch(`${APP_CONFIG.HASS_HOST}/api/config/automation/config`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(params.config),
          });

          if (!response.ok) {
            throw new Error(`Failed to create automation: ${response.statusText}`);
          }

          const responseData = (await response.json()) as {
            automation_id: string;
          };
          return {
            success: true,
            message: "Successfully created automation",
            automation_id: responseData.automation_id,
          };
        }

        case "update": {
          if (params.automation_id == null || params.config == null) {
            throw new Error("Automation ID and configuration are required for updating automation");
          }

          const response = await fetch(
            `${APP_CONFIG.HASS_HOST}/api/config/automation/config/${params.automation_id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(params.config),
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to update automation: ${response.statusText}`);
          }

          const responseData = (await response.json()) as {
            automation_id: string;
          };
          return {
            success: true,
            automation_id: responseData.automation_id,
            message: "Automation updated successfully",
          };
        }

        case "delete": {
          if (!params.automation_id) {
            throw new Error("Automation ID is required for deleting automation");
          }

          const response = await fetch(
            `${APP_CONFIG.HASS_HOST}/api/config/automation/config/${params.automation_id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to delete automation: ${response.statusText}`);
          }

          return {
            success: true,
            message: `Successfully deleted automation ${params.automation_id}`,
          };
        }

        case "duplicate": {
          if (!params.automation_id) {
            throw new Error("Automation ID is required for duplicating automation");
          }

          // First, get the existing automation config
          const getResponse = await fetch(
            `${APP_CONFIG.HASS_HOST}/api/config/automation/config/${params.automation_id}`,
            {
              headers: {
                Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!getResponse.ok) {
            throw new Error(`Failed to get automation config: ${getResponse.statusText}`);
          }

          const config = (await getResponse.json()) as AutomationConfig;
          config.alias = `${config.alias} (Copy)`;

          // Create new automation with modified config
          const createResponse = await fetch(
            `${APP_CONFIG.HASS_HOST}/api/config/automation/config`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(config),
            },
          );

          if (!createResponse.ok) {
            throw new Error(`Failed to create duplicate automation: ${createResponse.statusText}`);
          }

          const newAutomation = (await createResponse.json()) as AutomationResponse;
          return {
            success: true,
            message: `Successfully duplicated automation ${params.automation_id}`,
            new_automation_id: newAutomation.automation_id,
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
};
