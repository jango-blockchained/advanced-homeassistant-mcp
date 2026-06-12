/**
 * Switch tools for Home Assistant
 *
 * Split into:
 * - `switches` (read-only): list, get
 * - `switches_activate`: turn_on, turn_off, toggle
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

class HomeAssistantSwitchService {
  async getSwitches(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("switch."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          friendly_name: state.attributes?.friendly_name,
          device_class: state.attributes?.device_class,
        }));
    } catch (error) {
      logger.error("Failed to get switches from HA:", error);
      return [];
    }
  }

  async getSwitch(entity_id: string): Promise<Record<string, unknown> | null> {
    try {
      const hass = await get_hass();
      const state = await hass.getState(entity_id);
      return {
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
      };
    } catch (error) {
      logger.error(`Failed to get switch ${entity_id} from HA:`, error);
      return null;
    }
  }

  async callService(
    service: "turn_on" | "turn_off" | "toggle",
    entity_id: string,
  ): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("switch", service, { entity_id });
      return true;
    } catch (error) {
      logger.error(`Failed to ${service} switch ${entity_id}:`, error);
      return false;
    }
  }
}

const haSwitchService = new HomeAssistantSwitchService();

const switchesReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action"),
  entity_id: z.string().optional().describe("Switch entity_id (required for 'get')"),
});

const switchesActivateSchema = z.object({
  action: z.enum(["turn_on", "turn_off", "toggle"]).describe("Activation action"),
  entity_id: z.string().describe("Switch entity_id"),
});

type SwitchesReadParams = z.infer<typeof switchesReadSchema>;
type SwitchesActivateParams = z.infer<typeof switchesActivateSchema>;

async function executeSwitchesRead(params: SwitchesReadParams): Promise<string> {
  if (params.action === "list") {
    const switches = await haSwitchService.getSwitches();
    return JSON.stringify({ success: true, switches, total_count: switches.length });
  }
  if (params.entity_id == null) {
    throw new UserError("entity_id is required for 'get' action");
  }
  const switchDetails = await haSwitchService.getSwitch(params.entity_id);
  if (!switchDetails) {
    throw new UserError(`Switch entity_id '${params.entity_id}' not found.`);
  }
  return JSON.stringify({ success: true, ...switchDetails });
}

async function executeSwitchesActivate(params: SwitchesActivateParams): Promise<string> {
  const success = await haSwitchService.callService(params.action, params.entity_id);
  if (!success) {
    throw new UserError(`Failed to ${params.action} switch '${params.entity_id}'.`);
  }
  const switchDetails = await haSwitchService.getSwitch(params.entity_id);
  return JSON.stringify({ success: true, state: switchDetails });
}

export const switchesTool: Tool = {
  name: "switches",
  description:
    "List all switches or get the state of a specific switch (smart plugs, relays, virtual switches).",
  annotations: {
    title: "Switches Inventory",
    description: "Read-only access to switch entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: switchesReadSchema,
  execute: executeSwitchesRead,
};

export const switchesActivateTool: Tool = {
  name: "switches_activate",
  description: "Turn switches on, off, or toggle.",
  annotations: {
    title: "Switches Activate",
    description: "Actuate switches (smart plugs, relays)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: switchesActivateSchema,
  execute: executeSwitchesActivate,
};
