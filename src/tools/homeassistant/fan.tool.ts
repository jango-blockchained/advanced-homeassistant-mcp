/**
 * Fan tools for Home Assistant
 *
 * Split into:
 * - `fans` (read-only): list, get
 * - `fans_activate`: turn_on/off/toggle, set_percentage, set_preset_mode, oscillate, set_direction
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

class HomeAssistantFanService {
  async getFans(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("fan."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }));
    } catch (error) {
      logger.error("Failed to get fans from HA:", error);
      return [];
    }
  }

  async getFan(entity_id: string): Promise<Record<string, unknown> | null> {
    try {
      const hass = await get_hass();
      const state = await hass.getState(entity_id);
      return {
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
      };
    } catch (error) {
      logger.error(`Failed to get fan ${entity_id} from HA:`, error);
      return null;
    }
  }

  async callService(
    service: string,
    entity_id: string,
    data: Record<string, unknown> = {},
  ): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("fan", service, { entity_id, ...data });
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

const haFanService = new HomeAssistantFanService();

const fansReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action"),
  entity_id: z.string().optional().describe("Fan entity_id (required for 'get')"),
});

const fansActivateSchema = z.object({
  action: z
    .enum([
      "turn_on",
      "turn_off",
      "toggle",
      "set_percentage",
      "set_preset_mode",
      "oscillate",
      "set_direction",
    ])
    .describe("Activation action"),
  entity_id: z.string().describe("Fan entity_id"),
  percentage: z.number().min(0).max(100).optional().describe("Speed percentage 0-100"),
  preset_mode: z.string().optional().describe("Preset mode like 'auto', 'smart', 'eco'"),
  oscillating: z.boolean().optional().describe("Whether to oscillate"),
  direction: z.enum(["forward", "reverse"]).optional().describe("Fan direction"),
});

type FansReadParams = z.infer<typeof fansReadSchema>;
type FansActivateParams = z.infer<typeof fansActivateSchema>;

async function executeFansRead(params: FansReadParams): Promise<string> {
  if (params.action === "list") {
    const fans = await haFanService.getFans();
    return JSON.stringify({ success: true, fans, count: fans.length }, null, 2);
  }
  if (!params.entity_id) {
    return JSON.stringify({ success: false, error: "entity_id is required for get action" });
  }
  const fan = await haFanService.getFan(params.entity_id);
  if (!fan) {
    return JSON.stringify({ success: false, error: `Fan ${params.entity_id} not found` });
  }
  return JSON.stringify({ success: true, fan }, null, 2);
}

async function executeFansActivate(params: FansActivateParams): Promise<string> {
  const { action, entity_id, percentage, preset_mode, oscillating, direction } = params;
  try {
    switch (action) {
      case "turn_on":
      case "turn_off":
      case "toggle": {
        const success = await haFanService.callService(action, entity_id);
        return JSON.stringify({
          success,
          message: success
            ? `Successfully executed ${action} on ${entity_id}`
            : `Failed to execute ${action} on ${entity_id}`,
        });
      }
      case "set_percentage": {
        if (percentage === undefined) {
          return JSON.stringify({
            success: false,
            error: "percentage is required for set_percentage action",
          });
        }
        const success = await haFanService.callService("set_percentage", entity_id, { percentage });
        return JSON.stringify({
          success,
          message: success
            ? `Successfully set fan speed to ${percentage}% on ${entity_id}`
            : `Failed to set fan speed on ${entity_id}`,
        });
      }
      case "set_preset_mode": {
        if (!preset_mode) {
          return JSON.stringify({
            success: false,
            error: "preset_mode is required for set_preset_mode action",
          });
        }
        const success = await haFanService.callService("set_preset_mode", entity_id, {
          preset_mode,
        });
        return JSON.stringify({
          success,
          message: success
            ? `Successfully set preset mode to ${preset_mode} on ${entity_id}`
            : `Failed to set preset mode on ${entity_id}`,
        });
      }
      case "oscillate": {
        if (oscillating === undefined) {
          return JSON.stringify({
            success: false,
            error: "oscillating is required for oscillate action",
          });
        }
        const success = await haFanService.callService("oscillate", entity_id, { oscillating });
        return JSON.stringify({
          success,
          message: success
            ? `Successfully ${oscillating ? "enabled" : "disabled"} oscillation on ${entity_id}`
            : `Failed to set oscillation on ${entity_id}`,
        });
      }
      case "set_direction": {
        if (!direction) {
          return JSON.stringify({
            success: false,
            error: "direction is required for set_direction action",
          });
        }
        const success = await haFanService.callService("set_direction", entity_id, { direction });
        return JSON.stringify({
          success,
          message: success
            ? `Successfully set fan direction to ${direction} on ${entity_id}`
            : `Failed to set fan direction on ${entity_id}`,
        });
      }
    }
  } catch (error) {
    logger.error("Error in fan activate tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const fansTool: Tool = {
  name: "fans",
  description: "List all fans or get the state of a specific fan.",
  annotations: {
    title: "Fans Inventory",
    description: "Read-only access to fan entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: fansReadSchema,
  execute: executeFansRead,
};

export const fansActivateTool: Tool = {
  name: "fans_activate",
  description:
    "Control fans: turn on/off/toggle, set speed percentage, preset mode, oscillation, direction.",
  annotations: {
    title: "Fans Activate",
    description: "Actuate fans",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: fansActivateSchema,
  execute: executeFansActivate,
};
