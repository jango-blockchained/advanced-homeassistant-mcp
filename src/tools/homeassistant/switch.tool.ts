/**
 * Switch Control Tool for Home Assistant (fastmcp format)
 *
 * This tool allows controlling switches in Home Assistant through the MCP.
 * Supports on/off/toggle operations for any switch entity.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Home Assistant API service for switches
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

  async turnOn(entity_id: string): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("switch", "turn_on", { entity_id });
      return true;
    } catch (error) {
      logger.error(`Failed to turn on switch ${entity_id}:`, error);
      return false;
    }
  }

  async turnOff(entity_id: string): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("switch", "turn_off", { entity_id });
      return true;
    } catch (error) {
      logger.error(`Failed to turn off switch ${entity_id}:`, error);
      return false;
    }
  }

  async toggle(entity_id: string): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("switch", "toggle", { entity_id });
      return true;
    } catch (error) {
      logger.error(`Failed to toggle switch ${entity_id}:`, error);
      return false;
    }
  }
}

// Singleton instance
const haSwitchService = new HomeAssistantSwitchService();

// Define the schema for our tool parameters using Zod
const switchControlSchema = z.object({
  action: z
    .enum(["list", "get", "turn_on", "turn_off", "toggle"])
    .describe("The action to perform"),
  entity_id: z
    .string()
    .optional()
    .describe(
      "The entity ID of the switch to control (required for get, turn_on, turn_off, toggle)",
    ),
});

// Infer the type from the schema
type SwitchControlParams = z.infer<typeof switchControlSchema>;

// Shared execution logic
async function executeSwitchControlLogic(params: SwitchControlParams): Promise<string> {
  let success: boolean;
  let switchDetails: Record<string, unknown> | null;

  switch (params.action) {
    case "list": {
      const switches = await haSwitchService.getSwitches();
      return JSON.stringify({
        switches,
        total_count: switches.length,
      });
    }

    case "get": {
      if (params.entity_id == null) {
        throw new UserError("entity_id is required for 'get' action");
      }
      switchDetails = await haSwitchService.getSwitch(params.entity_id);
      if (!switchDetails) {
        throw new UserError(`Switch entity_id '${params.entity_id}' not found.`);
      }
      return JSON.stringify(switchDetails);
    }

    case "turn_on": {
      if (params.entity_id == null) {
        throw new UserError("entity_id is required for 'turn_on' action");
      }
      success = await haSwitchService.turnOn(params.entity_id);
      if (!success) {
        throw new UserError(`Failed to turn on switch '${params.entity_id}'.`);
      }
      switchDetails = await haSwitchService.getSwitch(params.entity_id);
      return JSON.stringify({ status: "success", state: switchDetails });
    }

    case "turn_off": {
      if (params.entity_id == null) {
        throw new UserError("entity_id is required for 'turn_off' action");
      }
      success = await haSwitchService.turnOff(params.entity_id);
      if (!success) {
        throw new UserError(`Failed to turn off switch '${params.entity_id}'.`);
      }
      switchDetails = await haSwitchService.getSwitch(params.entity_id);
      return JSON.stringify({ status: "success", state: switchDetails });
    }

    case "toggle": {
      if (params.entity_id == null) {
        throw new UserError("entity_id is required for 'toggle' action");
      }
      success = await haSwitchService.toggle(params.entity_id);
      if (!success) {
        throw new UserError(`Failed to toggle switch '${params.entity_id}'.`);
      }
      switchDetails = await haSwitchService.getSwitch(params.entity_id);
      return JSON.stringify({ status: "success", state: switchDetails });
    }

    default:
      throw new UserError(`Unknown action: ${String(params.action)}`);
  }
}

// Define the tool using the Tool interface
export const switchControlTool: Tool = {
  name: "switch_control",
  description:
    "Control switches in Home Assistant. Supports listing all switches, getting state of a specific switch, and turning switches on/off/toggle. Works with any switch.* entity including smart plugs, relays, and virtual switches.",
  parameters: switchControlSchema,
  execute: executeSwitchControlLogic,
  annotations: {
    title: "Switch Control",
    description: "Manage switches - turn on/off, toggle, get state",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

// BaseTool class for compatibility
export class SwitchControlTool extends BaseTool {
  constructor() {
    super({
      name: switchControlTool.name,
      description: switchControlTool.description,
      parameters: switchControlSchema,
      metadata: {
        category: "home_assistant",
        version: "1.0.0",
        tags: ["switch", "home_assistant", "control"],
      },
    });
  }

  public async execute(params: SwitchControlParams, _context: MCPContext): Promise<string> {
    logger.debug(`Executing SwitchControlTool with params: ${JSON.stringify(params)}`);
    const validatedParams = this.validateParams(params);
    return await executeSwitchControlLogic(validatedParams);
  }
}
