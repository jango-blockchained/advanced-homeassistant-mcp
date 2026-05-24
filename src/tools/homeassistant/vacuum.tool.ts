/**
 * Vacuum tools for Home Assistant
 *
 * Split into:
 * - `vacuums` (read-only): list, get
 * - `vacuums_activate`: start/pause/stop/return_to_base/clean_spot/locate, set_fan_speed, send_command
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

class HomeAssistantVacuumService {
  async getVacuums(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("vacuum."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }));
    } catch (error) {
      logger.error("Failed to get vacuums from HA:", error);
      return [];
    }
  }

  async getVacuum(entity_id: string): Promise<Record<string, unknown> | null> {
    try {
      const hass = await get_hass();
      const state = await hass.getState(entity_id);
      return {
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
      };
    } catch (error) {
      logger.error(`Failed to get vacuum ${entity_id} from HA:`, error);
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
      await hass.callService("vacuum", service, { entity_id, ...data });
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

const haVacuumService = new HomeAssistantVacuumService();

const vacuumsReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action"),
  entity_id: z.string().optional().describe("Vacuum entity_id (required for 'get')"),
});

const vacuumsActivateSchema = z.object({
  action: z
    .enum([
      "start",
      "pause",
      "stop",
      "return_to_base",
      "clean_spot",
      "locate",
      "set_fan_speed",
      "send_command",
    ])
    .describe("Activation action"),
  entity_id: z.string().describe("Vacuum entity_id"),
  fan_speed: z.string().optional().describe("Fan speed/suction level (set_fan_speed)"),
  command: z.string().optional().describe("Vendor-specific command (send_command)"),
  params: z.record(z.unknown()).optional().describe("Optional params for send_command"),
});

type VacuumsReadParams = z.infer<typeof vacuumsReadSchema>;
type VacuumsActivateParams = z.infer<typeof vacuumsActivateSchema>;

async function executeVacuumsRead(params: VacuumsReadParams): Promise<string> {
  if (params.action === "list") {
    const vacuums = await haVacuumService.getVacuums();
    return JSON.stringify({ success: true, vacuums, count: vacuums.length }, null, 2);
  }
  if (!params.entity_id) {
    return JSON.stringify({ success: false, error: "entity_id is required for get action" });
  }
  const vacuum = await haVacuumService.getVacuum(params.entity_id);
  if (!vacuum) {
    return JSON.stringify({ success: false, error: `Vacuum ${params.entity_id} not found` });
  }
  return JSON.stringify({ success: true, vacuum }, null, 2);
}

async function executeVacuumsActivate(params: VacuumsActivateParams): Promise<string> {
  const { action, entity_id, fan_speed, command, params: commandParams } = params;
  try {
    if (action === "set_fan_speed") {
      if (!fan_speed) {
        return JSON.stringify({
          success: false,
          error: "fan_speed is required for set_fan_speed action",
        });
      }
      const success = await haVacuumService.callService("set_fan_speed", entity_id, { fan_speed });
      return JSON.stringify({
        success,
        message: success
          ? `Successfully set fan speed to ${fan_speed} on ${entity_id}`
          : `Failed to set fan speed on ${entity_id}`,
      });
    }
    if (action === "send_command") {
      if (!command) {
        return JSON.stringify({
          success: false,
          error: "command is required for send_command action",
        });
      }
      const serviceData = commandParams ? { command, params: commandParams } : { command };
      const success = await haVacuumService.callService("send_command", entity_id, serviceData);
      return JSON.stringify({
        success,
        message: success
          ? `Successfully sent command ${command} to ${entity_id}`
          : `Failed to send command to ${entity_id}`,
      });
    }
    const success = await haVacuumService.callService(action, entity_id);
    return JSON.stringify({
      success,
      message: success
        ? `Successfully executed ${action} on ${entity_id}`
        : `Failed to execute ${action} on ${entity_id}`,
    });
  } catch (error) {
    logger.error("Error in vacuum activate tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const vacuumsTool: Tool = {
  name: "vacuums",
  description: "List all robot vacuums or get the state of a specific vacuum.",
  annotations: {
    title: "Vacuums Inventory",
    description: "Read-only access to vacuum entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: vacuumsReadSchema,
  execute: executeVacuumsRead,
};

export const vacuumsActivateTool: Tool = {
  name: "vacuums_activate",
  description:
    "Control robot vacuums: start/pause/stop, return to dock, spot cleaning, locate, fan speed, vendor-specific commands.",
  annotations: {
    title: "Vacuums Activate",
    description: "Actuate robot vacuums (vendor send_command can do anything)",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: vacuumsActivateSchema,
  execute: executeVacuumsActivate,
};
