/**
 * Lights Control Tool for Home Assistant (fastmcp format)
 *
 * This tool allows controlling lights in Home Assistant through the MCP.
 * It supports turning lights on/off, changing brightness, color, and color temperature.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../../utils/logger.js";
// Re-import BaseTool and MCPContext for the class definition

import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Real Home Assistant API service
class HomeAssistantLightsService {
  async getLights(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("light."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }));
    } catch (error) {
      logger.error("Failed to get lights from HA:", error);
      return [];
    }
  }

  async getLight(entity_id: string): Promise<Record<string, unknown> | null> {
    try {
      const hass = await get_hass();
      const state = await hass.getState(entity_id);
      return {
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
      };
    } catch (error) {
      logger.error(`Failed to get light ${entity_id} from HA:`, error);
      return null;
    }
  }

  async turnOn(entity_id: string, attributes: Record<string, unknown> = {}): Promise<boolean> {
    try {
      const hass = await get_hass();
      const serviceData = { entity_id, ...attributes };
      await hass.callService("light", "turn_on", serviceData);
      return true;
    } catch (error) {
      logger.error(`Failed to turn on light ${entity_id}:`, error);
      return false;
    }
  }

  async turnOff(entity_id: string): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("light", "turn_off", { entity_id });
      return true;
    } catch (error) {
      logger.error(`Failed to turn off light ${entity_id}:`, error);
      return false;
    }
  }
}

// Singleton instance
const haLightsService = new HomeAssistantLightsService();

// Define the schema for our tool parameters using Zod
const lightsControlSchema = z.object({
  action: z.enum(["list", "get", "turn_on", "turn_off"]).describe("The action to perform"),
  entity_id: z
    .string()
    .optional()
    .describe("The entity ID of the light to control (required for get, turn_on, turn_off)"),
  brightness: z.number().min(0).max(255).optional().describe("Brightness level (0-255)"),
  color_temp: z
    .number()
    .min(153)
    .max(500)
    .optional()
    .describe("Color temperature in Mireds (153-500)"),
  rgb_color: z
    .tuple([z.number().min(0).max(255), z.number().min(0).max(255), z.number().min(0).max(255)])
    .optional()
    .describe("RGB color as [r, g, b] (0-255 each)"),
});

// Infer the type from the schema
type LightsControlParams = z.infer<typeof lightsControlSchema>;

// Define the tool using the Tool interface
export const lightsControlTool: Tool = {
  name: "lights_control",
  description: "Control lights in Home Assistant. Supports listing all lights, getting state of a specific light, turning lights on with optional brightness/color settings, and turning lights off.",
  parameters: lightsControlSchema,
  execute: executeLightsControlLogic,
  annotations: {
    title: "Lights Control",
    description: "Manage lighting in your home - turn on/off, adjust brightness, change colors",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

// No need for the class wrapper anymore
// export class LightsControlTool extends BaseTool { ... }

// --- Shared Execution Logic ---
// Extracted logic to be used by both fastmcp object and BaseTool class
async function executeLightsControlLogic(params: LightsControlParams): Promise<string> {
  let attributes: Record<string, unknown>;
  let success: boolean;
  let lightDetails: Record<string, unknown> | null;

  switch (params.action) {
    case "list": {
      const lights = await haLightsService.getLights();
      return JSON.stringify({ lights });
    }

    case "get": {
      if (params.entity_id == null) {
        throw new UserError("entity_id is required for 'get' action");
      }
      lightDetails = await haLightsService.getLight(params.entity_id);
      if (!lightDetails) {
        throw new UserError(`Light entity_id '${params.entity_id}' not found.`);
      }
      return JSON.stringify(lightDetails);
    }

    case "turn_on": {
      if (params.entity_id == null) {
        throw new UserError("entity_id is required for 'turn_on' action");
      }
      attributes = {};
      if (params.brightness !== undefined) attributes.brightness = params.brightness;
      if (params.color_temp !== undefined) attributes.color_temp = params.color_temp;
      if (params.rgb_color !== undefined) attributes.rgb_color = params.rgb_color;

      success = await haLightsService.turnOn(params.entity_id, attributes);
      if (!success) {
        throw new UserError(`Failed to turn on light '${params.entity_id}'. Entity not found?`);
      }
      lightDetails = await haLightsService.getLight(params.entity_id); // Get updated state
      return JSON.stringify({ status: "success", state: lightDetails });
    }

    case "turn_off": {
      if (params.entity_id == null) {
        throw new UserError("entity_id is required for 'turn_off' action");
      }
      success = await haLightsService.turnOff(params.entity_id);
      if (!success) {
        throw new UserError(`Failed to turn off light '${params.entity_id}'. Entity not found?`);
      }
      lightDetails = await haLightsService.getLight(params.entity_id); // Get updated state
      return JSON.stringify({ status: "success", state: lightDetails });
    }

    default:
      // Should be unreachable due to Zod validation
      throw new UserError(`Unknown action: ${String(params.action)}`);
  }
}


