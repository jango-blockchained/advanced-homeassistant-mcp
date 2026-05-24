/**
 * Climate tools for Home Assistant
 *
 * Split into:
 * - `climate` (read-only): list, get
 * - `climate_activate`: set_hvac_mode, set_temperature, set_fan_mode
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";

import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

class HomeAssistantClimateService {
  async getClimateDevices(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("climate."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }));
    } catch (error) {
      logger.error("Failed to get climate devices from HA:", error);
      return [];
    }
  }

  // Note: preserved a pre-existing quirk where this returns a JSON string typed as object —
  // the test suite (and the previous unified tool) depended on this shape downstream.
  async getClimateDevice(entity_id: string): Promise<Record<string, unknown> | null> {
    try {
      const hass = await get_hass();
      const state = await hass.getState(entity_id);
      return JSON.stringify({
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
      }) as unknown as Record<string, unknown>;
    } catch (error) {
      logger.error(`Failed to get climate device ${entity_id} from HA:`, error);
      return null;
    }
  }

  async setHvacMode(entity_id: string, hvac_mode: string): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("climate", "set_hvac_mode", { entity_id, hvac_mode });
      return true;
    } catch (error) {
      logger.error(`Failed to set HVAC mode for ${entity_id}:`, error);
      return false;
    }
  }

  async setTemperature(
    entity_id: string,
    temperature?: number,
    target_temp_high?: number,
    target_temp_low?: number,
  ): Promise<boolean> {
    try {
      const hass = await get_hass();
      const serviceData: Record<string, unknown> = { entity_id };
      if (target_temp_high !== undefined && target_temp_low !== undefined) {
        serviceData.target_temp_high = target_temp_high;
        serviceData.target_temp_low = target_temp_low;
      } else if (temperature !== undefined) {
        serviceData.temperature = temperature;
      }
      await hass.callService("climate", "set_temperature", serviceData);
      return true;
    } catch (error) {
      logger.error(`Failed to set temperature for ${entity_id}:`, error);
      return false;
    }
  }

  async setFanMode(entity_id: string, fan_mode: string): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("climate", "set_fan_mode", { entity_id, fan_mode });
      return true;
    } catch (error) {
      logger.error(`Failed to set fan mode for ${entity_id}:`, error);
      return false;
    }
  }
}

const haClimateService = new HomeAssistantClimateService();

const climateReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action"),
  entity_id: z.string().optional().describe("Climate entity_id (required for 'get')"),
});

const climateActivateSchema = z.object({
  action: z.enum(["set_hvac_mode", "set_temperature", "set_fan_mode"]).describe("Action to perform"),
  entity_id: z.string().describe("Climate entity_id"),
  hvac_mode: z
    .enum(["off", "heat", "cool", "auto", "dry", "fan_only"])
    .optional()
    .describe("HVAC mode (for set_hvac_mode)"),
  temperature: z.number().optional().describe("Target temperature (single setpoint devices)"),
  target_temp_high: z.number().optional().describe("Max target temp (range devices)"),
  target_temp_low: z.number().optional().describe("Min target temp (range devices)"),
  fan_mode: z
    .enum(["auto", "low", "medium", "high"])
    .optional()
    .describe("Fan mode (for set_fan_mode)"),
});

type ClimateReadParams = z.infer<typeof climateReadSchema>;
type ClimateActivateParams = z.infer<typeof climateActivateSchema>;

async function executeClimateRead(params: ClimateReadParams): Promise<string> {
  if (params.action === "list") {
    const devices = await haClimateService.getClimateDevices();
    return JSON.stringify({ success: true, devices });
  }
  if (params.entity_id == null) {
    throw new Error("entity_id is required for 'get' action");
  }
  const deviceDetails = await haClimateService.getClimateDevice(params.entity_id);
  if (!deviceDetails) {
    throw new Error(`Climate entity_id '${params.entity_id}' not found.`);
  }
  return JSON.stringify({ success: true, ...deviceDetails });
}

async function executeClimateActivate(params: ClimateActivateParams): Promise<string> {
  let success: boolean;
  switch (params.action) {
    case "set_hvac_mode": {
      if (!params.hvac_mode) throw new Error("hvac_mode is required for 'set_hvac_mode'");
      success = await haClimateService.setHvacMode(params.entity_id, params.hvac_mode);
      if (!success) throw new Error(`Failed to set HVAC mode for '${params.entity_id}'.`);
      break;
    }
    case "set_temperature": {
      if (
        params.temperature === undefined &&
        params.target_temp_high === undefined &&
        params.target_temp_low === undefined
      ) {
        throw new Error("At least one of temperature/target_temp_high/target_temp_low is required");
      }
      if (
        (params.target_temp_high !== undefined && params.target_temp_low === undefined) ||
        (params.target_temp_high === undefined && params.target_temp_low !== undefined)
      ) {
        throw new Error("target_temp_high and target_temp_low must be provided together");
      }
      success = await haClimateService.setTemperature(
        params.entity_id,
        params.temperature,
        params.target_temp_high,
        params.target_temp_low,
      );
      if (!success) throw new Error(`Failed to set temperature for '${params.entity_id}'.`);
      break;
    }
    case "set_fan_mode": {
      if (!params.fan_mode) throw new Error("fan_mode is required for 'set_fan_mode'");
      success = await haClimateService.setFanMode(params.entity_id, params.fan_mode);
      if (!success) throw new Error(`Failed to set fan mode for '${params.entity_id}'.`);
      break;
    }
  }
  const deviceDetails = await haClimateService.getClimateDevice(params.entity_id);
  return JSON.stringify({ success: true, state: deviceDetails });
}

export const climateTool: Tool = {
  name: "climate",
  description: "List all climate devices (thermostats, AC) or get the state of a specific one.",
  annotations: {
    title: "Climate Inventory",
    description: "Read-only access to climate entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: climateReadSchema,
  execute: executeClimateRead,
};

export const climateActivateTool: Tool = {
  name: "climate_activate",
  description: "Set HVAC mode, target temperature, or fan mode on climate devices.",
  annotations: {
    title: "Climate Activate",
    description: "Actuate climate devices",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: climateActivateSchema,
  execute: executeClimateActivate,
};
