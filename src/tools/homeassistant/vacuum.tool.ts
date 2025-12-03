/**
 * Vacuum Control Tool for Home Assistant
 *
 * This tool allows controlling robot vacuums in Home Assistant.
 * Supports start, stop, return to dock, and cleaning modes.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Real Home Assistant API service
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
      const serviceData = { entity_id, ...data };
      await hass.callService("vacuum", service, serviceData);
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

// Singleton instance
const haVacuumService = new HomeAssistantVacuumService();

// Define the schema for our tool parameters using Zod
const vacuumControlSchema = z.object({
  action: z
    .enum([
      "list",
      "get",
      "start",
      "pause",
      "stop",
      "return_to_base",
      "clean_spot",
      "locate",
      "set_fan_speed",
      "send_command",
    ])
    .describe("The action to perform"),
  entity_id: z
    .string()
    .optional()
    .describe("The entity ID of the vacuum (required for most actions)"),
  fan_speed: z.string().optional().describe("Fan speed/suction level name (for set_fan_speed)"),
  command: z.string().optional().describe("Custom command to send (for send_command)"),
  params: z.record(z.unknown()).optional().describe("Optional parameters for send_command"),
});

type VacuumControlInput = z.infer<typeof vacuumControlSchema>;

// Main tool execution function
async function execute(params: VacuumControlInput): Promise<string> {
  const { action, entity_id, fan_speed, command, params: commandParams } = params;

  try {
    switch (action) {
      case "list": {
        const vacuums = await haVacuumService.getVacuums();
        return JSON.stringify(
          {
            success: true,
            vacuums: vacuums,
            count: vacuums.length,
          },
          null,
          2,
        );
      }

      case "get": {
        if (!entity_id) {
          return JSON.stringify({ success: false, error: "entity_id is required for get action" });
        }
        const vacuum = await haVacuumService.getVacuum(entity_id);
        if (!vacuum) {
          return JSON.stringify({ success: false, error: `Vacuum ${entity_id} not found` });
        }
        return JSON.stringify({ success: true, vacuum: vacuum }, null, 2);
      }

      case "start":
      case "pause":
      case "stop":
      case "return_to_base":
      case "clean_spot":
      case "locate": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: `entity_id is required for ${action} action`,
          });
        }
        const success = await haVacuumService.callService(action, entity_id);
        return JSON.stringify({
          success,
          message: success
            ? `Successfully executed ${action} on ${entity_id}`
            : `Failed to execute ${action} on ${entity_id}`,
        });
      }

      case "set_fan_speed": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: "entity_id is required for set_fan_speed action",
          });
        }
        if (!fan_speed) {
          return JSON.stringify({
            success: false,
            error: "fan_speed is required for set_fan_speed action",
          });
        }
        const success = await haVacuumService.callService("set_fan_speed", entity_id, {
          fan_speed,
        });
        return JSON.stringify({
          success,
          message: success
            ? `Successfully set fan speed to ${fan_speed} on ${entity_id}`
            : `Failed to set fan speed on ${entity_id}`,
        });
      }

      case "send_command": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: "entity_id is required for send_command action",
          });
        }
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

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    logger.error("Error in vacuum control tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

// Export the tool object
export const vacuumControlTool: Tool = {
  name: "vacuum_control",
  description:
    "Control robot vacuums in Home Assistant. Supports starting, pausing, stopping, returning to dock, spot cleaning, locating the vacuum, fan speed control, and sending custom commands. Actions include: list (get all vacuums), get (get specific vacuum info), start, pause, stop, return_to_base, clean_spot, locate, set_fan_speed, and send_command for vendor-specific features.",
  annotations: {
    title: "Vacuum Control",
    description: "Control robot vacuums - start cleaning, pause, return to dock, and set fan speed",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: vacuumControlSchema,
  execute,
};
