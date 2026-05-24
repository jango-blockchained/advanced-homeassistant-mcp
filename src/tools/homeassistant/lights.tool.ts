/**
 * Lights tools for Home Assistant
 *
 * Split into:
 * - `lights` (read-only): list, get
 * - `lights_activate`: turn_on, turn_off (with brightness/color/etc.)
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../../utils/logger.js";

import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

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

const haLightsService = new HomeAssistantLightsService();

const lightsReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action to perform"),
  entity_id: z.string().optional().describe("Light entity_id (required for 'get')"),
});

const lightsActivateSchema = z.object({
  action: z.enum(["turn_on", "turn_off"]).describe("Activation action"),
  entity_id: z.string().describe("Light entity_id"),
  brightness: z.number().min(0).max(255).optional().describe("Brightness 0-255 (turn_on)"),
  color_temp: z
    .number()
    .min(153)
    .max(500)
    .optional()
    .describe("Color temperature in Mireds (turn_on)"),
  rgb_color: z
    .array(z.number().min(0).max(255))
    .length(3)
    .optional()
    .describe("RGB color [r,g,b] (turn_on)"),
  effect: z.string().optional().describe("Light effect (turn_on)"),
  transition: z.number().min(0).optional().describe("Transition seconds (turn_on)"),
});

type LightsReadParams = z.infer<typeof lightsReadSchema>;
type LightsActivateParams = z.infer<typeof lightsActivateSchema>;

async function executeLightsRead(params: LightsReadParams): Promise<string> {
  if (params.action === "list") {
    const lights = await haLightsService.getLights();
    return JSON.stringify({ success: true, lights });
  }
  if (params.entity_id == null) {
    throw new UserError("entity_id is required for 'get' action");
  }
  const lightDetails = await haLightsService.getLight(params.entity_id);
  if (!lightDetails) {
    throw new UserError(`Light entity_id '${params.entity_id}' not found.`);
  }
  return JSON.stringify({ success: true, ...lightDetails });
}

async function executeLightsActivate(params: LightsActivateParams): Promise<string> {
  if (params.action === "turn_on") {
    const attributes: Record<string, unknown> = {};
    if (params.brightness !== undefined) attributes.brightness = params.brightness;
    if (params.color_temp !== undefined) attributes.color_temp = params.color_temp;
    if (params.rgb_color !== undefined) attributes.rgb_color = params.rgb_color;
    if (params.effect !== undefined) attributes.effect = params.effect;
    if (params.transition !== undefined) attributes.transition = params.transition;
    const success = await haLightsService.turnOn(params.entity_id, attributes);
    if (!success) {
      throw new UserError(`Failed to turn on light '${params.entity_id}'.`);
    }
    const lightDetails = await haLightsService.getLight(params.entity_id);
    return JSON.stringify({ success: true, state: lightDetails });
  }

  // turn_off
  const success = await haLightsService.turnOff(params.entity_id);
  if (!success) {
    throw new UserError(`Failed to turn off light '${params.entity_id}'.`);
  }
  const lightDetails = await haLightsService.getLight(params.entity_id);
  return JSON.stringify({ success: true, state: lightDetails });
}

export const lightsTool: Tool = {
  name: "lights",
  description: "List all lights or get the state of a specific light.",
  annotations: {
    title: "Lights Inventory",
    description: "Read-only access to light entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: lightsReadSchema,
  execute: executeLightsRead,
};

export const lightsActivateTool: Tool = {
  name: "lights_activate",
  description: "Turn lights on (with optional brightness/color/effect) or off.",
  annotations: {
    title: "Lights Activate",
    description: "Actuate lights — turn on/off, set brightness and color",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: lightsActivateSchema,
  execute: executeLightsActivate,
};
