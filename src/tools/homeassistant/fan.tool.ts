/**
 * Fan Control Tool for Home Assistant
 *
 * This tool allows controlling fans in Home Assistant.
 * Supports turning on/off, speed control, direction, and oscillation.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Real Home Assistant API service
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
      const serviceData = { entity_id, ...data };
      await hass.callService("fan", service, serviceData);
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

// Singleton instance
const haFanService = new HomeAssistantFanService();

// Define the schema for our tool parameters using Zod
const fanControlSchema = z.object({
  action: z
    .enum([
      "list",
      "get",
      "turn_on",
      "turn_off",
      "toggle",
      "set_percentage",
      "set_preset_mode",
      "oscillate",
      "set_direction",
    ])
    .describe("The action to perform"),
  entity_id: z.string().optional().describe("The entity ID of the fan (required for most actions)"),
  percentage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Speed percentage between 0 and 100 (for set_percentage)"),
  preset_mode: z
    .string()
    .optional()
    .describe("Preset mode name like 'auto', 'smart', 'eco' (for set_preset_mode)"),
  oscillating: z.boolean().optional().describe("Whether to oscillate (for oscillate action)"),
  direction: z
    .enum(["forward", "reverse"])
    .optional()
    .describe("Fan direction (for set_direction)"),
});

type FanControlInput = z.infer<typeof fanControlSchema>;

// Main tool execution function
async function execute(params: FanControlInput): Promise<string> {
  const { action, entity_id, percentage, preset_mode, oscillating, direction } = params;

  try {
    switch (action) {
      case "list": {
        const fans = await haFanService.getFans();
        return JSON.stringify(
          {
            success: true,
            fans: fans,
            count: fans.length,
          },
          null,
          2,
        );
      }

      case "get": {
        if (!entity_id) {
          return JSON.stringify({ success: false, error: "entity_id is required for get action" });
        }
        const fan = await haFanService.getFan(entity_id);
        if (!fan) {
          return JSON.stringify({ success: false, error: `Fan ${entity_id} not found` });
        }
        return JSON.stringify({ success: true, fan: fan }, null, 2);
      }

      case "turn_on":
      case "turn_off":
      case "toggle": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: `entity_id is required for ${action} action`,
          });
        }
        const success = await haFanService.callService(action, entity_id);
        return JSON.stringify({
          success,
          message: success
            ? `Successfully executed ${action} on ${entity_id}`
            : `Failed to execute ${action} on ${entity_id}`,
        });
      }

      case "set_percentage": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: "entity_id is required for set_percentage action",
          });
        }
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
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: "entity_id is required for set_preset_mode action",
          });
        }
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
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: "entity_id is required for oscillate action",
          });
        }
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
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: "entity_id is required for set_direction action",
          });
        }
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

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    logger.error("Error in fan control tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

// Export the tool object
export const fanControlTool: Tool = {
  name: "fan_control",
  description:
    "Control fans in Home Assistant. Supports turning on/off, speed control via percentage, preset modes, oscillation, and direction control. Actions include: list (get all fans), get (get specific fan info), turn_on, turn_off, toggle, set_percentage, set_preset_mode, oscillate, and set_direction.",
  annotations: {
    title: "Fan Control",
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: true,
  },
  parameters: fanControlSchema,
  execute,
};
