/**
 * Alarm Control Panel tools for Home Assistant
 *
 * Split into:
 * - `alarms` (read-only): list, get
 * - `alarms_activate`: arm_*, disarm, trigger (destructive — sounds the alarm or disarms security)
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

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
      await hass.callService("alarm_control_panel", service, { entity_id, ...data });
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

const haAlarmService = new HomeAssistantAlarmService();

const alarmsReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action"),
  entity_id: z.string().optional().describe("Alarm entity_id (required for 'get')"),
});

const alarmsActivateSchema = z.object({
  action: z
    .enum([
      "alarm_disarm",
      "alarm_arm_home",
      "alarm_arm_away",
      "alarm_arm_night",
      "alarm_arm_vacation",
      "alarm_arm_custom_bypass",
      "alarm_trigger",
    ])
    .describe("Activation action"),
  entity_id: z.string().describe("Alarm entity_id"),
  code: z.string().optional().describe("Optional security code"),
});

type AlarmsReadParams = z.infer<typeof alarmsReadSchema>;
type AlarmsActivateParams = z.infer<typeof alarmsActivateSchema>;

async function executeAlarmsRead(params: AlarmsReadParams): Promise<string> {
  if (params.action === "list") {
    const alarms = await haAlarmService.getAlarms();
    return JSON.stringify({ success: true, alarms, count: alarms.length }, null, 2);
  }
  if (!params.entity_id) {
    return JSON.stringify({ success: false, error: "entity_id is required for get action" });
  }
  const alarm = await haAlarmService.getAlarm(params.entity_id);
  if (!alarm) {
    return JSON.stringify({ success: false, error: `Alarm ${params.entity_id} not found` });
  }
  return JSON.stringify({ success: true, alarm }, null, 2);
}

async function executeAlarmsActivate(params: AlarmsActivateParams): Promise<string> {
  try {
    // Verify entity exists before calling service
    const existingAlarm = await haAlarmService.getAlarm(params.entity_id);
    if (!existingAlarm) {
      return JSON.stringify({
        success: false,
        error: `Alarm ${params.entity_id} not found`,
      });
    }

    const serviceData = params.code ? { code: params.code } : {};
    const success = await haAlarmService.callService(params.action, params.entity_id, serviceData);

    if (!success) {
      return JSON.stringify({
        success: false,
        message: `Failed to execute ${params.action} on ${params.entity_id}`,
      });
    }

    // Read back state after service call to verify
    const updatedAlarm = await haAlarmService.getAlarm(params.entity_id);
    return JSON.stringify({
      success: true,
      message: `Successfully executed ${params.action} on ${params.entity_id}`,
      state: updatedAlarm,
    });
  } catch (error) {
    logger.error("Error in alarm activate tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const alarmsTool: Tool = {
  name: "alarms",
  description: "List all alarm panels or get the state of a specific alarm panel.",
  annotations: {
    title: "Alarms Inventory",
    description: "Read-only access to alarm panel entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: alarmsReadSchema,
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      alarms: z.array(
        z.object({
          entity_id: z.string(),
          state: z.string(),
          attributes: z.record(z.unknown()),
        }),
      ),
      count: z.number(),
    }),
    z.object({
      success: z.literal(true),
      alarm: z.object({
        entity_id: z.string(),
        state: z.string(),
        attributes: z.record(z.unknown()),
      }),
    }),
  ]),
  execute: executeAlarmsRead,
};

export const alarmsActivateTool: Tool = {
  name: "alarms_activate",
  description:
    "Arm in various modes (home, away, night, vacation, custom bypass), disarm, or trigger an alarm. Security-sensitive operations.",
  annotations: {
    title: "Alarms Activate",
    description: "Arm/disarm/trigger security alarms (security-sensitive)",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: alarmsActivateSchema,
  outputSchema: z.union([
    z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
    }),
  ]),
  execute: executeAlarmsActivate,
};
