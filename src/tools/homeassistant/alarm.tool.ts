/**
 * Alarm Control Panel Tool for Home Assistant
 *
 * This tool allows controlling alarm systems in Home Assistant.
 * Supports arming (away/home/night), disarming, and triggering alarms.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Real Home Assistant API service
class HomeAssistantAlarmService {
  async getAlarms(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("alarm_control_panel."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }));
    } catch (error) {
      logger.error("Failed to get alarms from HA:", error);
      return [];
    }
  }

  async getAlarm(entity_id: string): Promise<Record<string, unknown> | null> {
    try {
      const hass = await get_hass();
      const state = await hass.getState(entity_id);
      return {
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
      };
    } catch (error) {
      logger.error(`Failed to get alarm ${entity_id} from HA:`, error);
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
      await hass.callService("alarm_control_panel", service, serviceData);
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

// Singleton instance
const haAlarmService = new HomeAssistantAlarmService();

// Define the schema for our tool parameters using Zod
const alarmControlSchema = z.object({
  action: z
    .enum([
      "list",
      "get",
      "alarm_disarm",
      "alarm_arm_home",
      "alarm_arm_away",
      "alarm_arm_night",
      "alarm_arm_vacation",
      "alarm_arm_custom_bypass",
      "alarm_trigger",
    ])
    .describe("The action to perform"),
  entity_id: z
    .string()
    .optional()
    .describe("The entity ID of the alarm (required for most actions)"),
  code: z.string().optional().describe("Optional security code for the alarm system"),
});

type AlarmControlInput = z.infer<typeof alarmControlSchema>;

// Main tool execution function
async function execute(params: AlarmControlInput): Promise<string> {
  const { action, entity_id, code } = params;

  try {
    switch (action) {
      case "list": {
        const alarms = await haAlarmService.getAlarms();
        return JSON.stringify(
          {
            success: true,
            alarms: alarms,
            count: alarms.length,
          },
          null,
          2,
        );
      }

      case "get": {
        if (!entity_id) {
          return JSON.stringify({ success: false, error: "entity_id is required for get action" });
        }
        const alarm = await haAlarmService.getAlarm(entity_id);
        if (!alarm) {
          return JSON.stringify({ success: false, error: `Alarm ${entity_id} not found` });
        }
        return JSON.stringify({ success: true, alarm: alarm }, null, 2);
      }

      case "alarm_disarm":
      case "alarm_arm_home":
      case "alarm_arm_away":
      case "alarm_arm_night":
      case "alarm_arm_vacation":
      case "alarm_arm_custom_bypass":
      case "alarm_trigger": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: `entity_id is required for ${action} action`,
          });
        }
        const serviceData = code ? { code } : {};
        const success = await haAlarmService.callService(action, entity_id, serviceData);
        return JSON.stringify({
          success,
          message: success
            ? `Successfully executed ${action} on ${entity_id}`
            : `Failed to execute ${action} on ${entity_id}`,
        });
      }

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    logger.error("Error in alarm control tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

// Export the tool object
export const alarmControlTool: Tool = {
  name: "alarm_control",
  description:
    "Control alarm systems in Home Assistant. Supports arming in different modes (home, away, night, vacation, custom bypass), disarming, and triggering alarms. Some systems may require a security code. Actions include: list (get all alarms), get (get specific alarm info), alarm_disarm, alarm_arm_home, alarm_arm_away, alarm_arm_night, alarm_arm_vacation, alarm_arm_custom_bypass, and alarm_trigger.",
  parameters: alarmControlSchema,
  execute,
};
