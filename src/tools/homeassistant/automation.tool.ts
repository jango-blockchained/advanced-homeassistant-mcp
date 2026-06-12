/**
 * Automation Tools for Home Assistant
 *
 * Split into:
 * - `automation` (read-only): list
 * - `automation_modify`: toggle (flips enable/disable; no actions fire)
 * - `automation_activate`: trigger (fires the automation's actions — real-world via what they do)
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";

import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

const automationReadSchema = z.object({
  action: z.literal("list").describe("List configured automations"),
});

const automationModifySchema = z.object({
  action: z.literal("toggle").describe("Enable or disable an automation"),
  automation_id: z
    .string()
    .describe(
      "Entity ID of the automation, e.g., 'automation.office_carbon_filter_person_detection'.",
    ),
});

const automationActivateSchema = z.object({
  action: z.literal("trigger").describe("Fire the automation's actions now"),
  automation_id: z
    .string()
    .describe(
      "Entity ID of the automation, e.g., 'automation.office_carbon_filter_person_detection'.",
    ),
});

type AutomationReadParams = z.infer<typeof automationReadSchema>;
type AutomationModifyParams = z.infer<typeof automationModifySchema>;
type AutomationActivateParams = z.infer<typeof automationActivateSchema>;

async function executeAutomationRead(_params: AutomationReadParams): Promise<string> {
  try {
    const hass = await get_hass();
    const states = await hass.getStates();
    const automations = states
      .filter((state) => state.entity_id.startsWith("automation."))
      .map((automation) => ({
        entity_id: automation.entity_id,
        id: automation.attributes?.id,
        name: automation.attributes?.friendly_name || automation.entity_id.split(".")[1],
        state: automation.state,
        last_triggered: automation.attributes?.last_triggered,
      }));

    return JSON.stringify({
      success: true,
      automations,
      total_count: automations.length,
    });
  } catch (error) {
    logger.error(
      `Error listing automations: ${error instanceof Error ? error.message : String(error)}`,
    );
    return JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

async function callAutomationService(
  service: "toggle" | "trigger",
  automation_id: string,
): Promise<string> {
  try {
    const hass = await get_hass();
    await hass.callService("automation", service, { entity_id: automation_id });
    return JSON.stringify({
      success: true,
      message: `Successfully ${service}d automation ${automation_id}`,
      automation_id,
      action: service,
    });
  } catch (error) {
    logger.error(
      `Error ${service}ing automation: ${error instanceof Error ? error.message : String(error)}`,
    );
    return JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const automationTool: Tool = {
  name: "automation",
  description: "List Home Assistant automations and their current state.",
  annotations: {
    title: "Automation Inventory",
    description: "Read-only listing of configured automations",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: automationReadSchema,
  execute: executeAutomationRead,
};

export const automationModifyTool: Tool = {
  name: "automation_modify",
  description:
    "Toggle (enable/disable) a Home Assistant automation. Does not fire the automation's actions.",
  annotations: {
    title: "Automation Toggle",
    description: "Enable or disable an automation",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: automationModifySchema,
  execute: (params: AutomationModifyParams) =>
    callAutomationService("toggle", params.automation_id),
};

export const automationActivateTool: Tool = {
  name: "automation_activate",
  description:
    "Fire a Home Assistant automation's actions now. Side effects depend on what the automation does (could control devices, send notifications, etc.).",
  annotations: {
    title: "Automation Trigger",
    description: "Fire an automation's actions now",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: automationActivateSchema,
  execute: (params: AutomationActivateParams) =>
    callAutomationService("trigger", params.automation_id),
};
