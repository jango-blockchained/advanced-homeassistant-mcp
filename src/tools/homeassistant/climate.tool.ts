/**
 * Climate Control Tool for Home Assistant (fastmcp format)
 *
 * This tool allows controlling climate devices (thermostats, AC units, etc.)
 * in Home Assistant through the MCP. It supports modes, temperature settings,
 * and fan modes.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Real Home Assistant API service
class HomeAssistantClimateService {
    async getClimateDevices(): Promise<Record<string, unknown>[]> {
        try {
            const hass = await get_hass();
            const states = await hass.getStates();
            return states
                .filter(state => state.entity_id.startsWith('climate.'))
                .map(state => ({
                    entity_id: state.entity_id,
                    state: state.state,
                    attributes: state.attributes
                }));
        } catch (error) {
            logger.error('Failed to get climate devices from HA:', error);
            return [];
        }
    }

    async getClimateDevice(entity_id: string): Promise<Record<string, unknown> | null> {
        try {
            const hass = await get_hass();
            const state = await hass.getState(entity_id);
            return {
                entity_id: state.entity_id,
                state: state.state,
                attributes: state.attributes
            };
        } catch (error) {
            logger.error(`Failed to get climate device ${entity_id} from HA:`, error);
            return null;
        }
    }

    async setHvacMode(entity_id: string, hvac_mode: string): Promise<boolean> {
        try {
            const hass = await get_hass();
            await hass.callService('climate', 'set_hvac_mode', {
                entity_id,
                hvac_mode
            });
            return true;
        } catch (error) {
            logger.error(`Failed to set HVAC mode for ${entity_id}:`, error);
            return false;
        }
    }

    async setTemperature(entity_id: string, temperature?: number, target_temp_high?: number, target_temp_low?: number): Promise<boolean> {
        try {
            const hass = await get_hass();
            const serviceData: Record<string, unknown> = { entity_id };

            if (target_temp_high !== undefined && target_temp_low !== undefined) {
                serviceData.target_temp_high = target_temp_high;
                serviceData.target_temp_low = target_temp_low;
            } else if (temperature !== undefined) {
                serviceData.temperature = temperature;
            }

            await hass.callService('climate', 'set_temperature', serviceData);
            return true;
        } catch (error) {
            logger.error(`Failed to set temperature for ${entity_id}:`, error);
            return false;
        }
    }

    async setFanMode(entity_id: string, fan_mode: string): Promise<boolean> {
        try {
            const hass = await get_hass();
            await hass.callService('climate', 'set_fan_mode', {
                entity_id,
                fan_mode
            });
            return true;
        } catch (error) {
            logger.error(`Failed to set fan mode for ${entity_id}:`, error);
            return false;
        }
    }
}

// Singleton instance
const haClimateService = new HomeAssistantClimateService();

// Define the schema for our tool parameters using Zod
const climateControlSchema = z.object({
    action: z.enum(["list", "get", "set_hvac_mode", "set_temperature", "set_fan_mode"])
        .describe("The action to perform on the climate device"),
    entity_id: z.string()
        .optional()
        .describe("The entity ID of the climate device (required for get and set actions)"),
    hvac_mode: z.enum(["off", "heat", "cool", "auto", "dry", "fan_only"])
        .optional()
        .describe("The HVAC mode to set (required for set_hvac_mode)"),
    temperature: z.number()
        .optional()
        .describe("The target temperature to set (use for single setpoint devices)"),
    target_temp_high: z.number()
        .optional()
        .describe("The maximum target temperature for range devices (use with target_temp_low)"),
    target_temp_low: z.number()
        .optional()
        .describe("The minimum target temperature for range devices (use with target_temp_high)"),
    fan_mode: z.enum(["auto", "low", "medium", "high"])
        .optional()
        .describe("The fan mode to set (required for set_fan_mode)"),
});

// Infer the type from the schema
type ClimateControlParams = z.infer<typeof climateControlSchema>;

// --- Shared Execution Logic ---
async function executeClimateControlLogic(params: ClimateControlParams): Promise<Record<string, unknown>> {
    let success: boolean;
    let deviceDetails: Record<string, unknown> | null;

    switch (params.action) {
        case "list": {
            const devices = await haClimateService.getClimateDevices();
            return { devices };
        }

        case "get": {
            if (!params.entity_id) {
                throw new Error("entity_id is required for 'get' action");
            }
            deviceDetails = await haClimateService.getClimateDevice(params.entity_id);
            if (!deviceDetails) {
                throw new Error(`Climate entity_id '${params.entity_id}' not found.`);
            }
            return deviceDetails;
        }

        case "set_hvac_mode": {
            if (!params.entity_id) {
                throw new Error("entity_id is required for 'set_hvac_mode' action");
            }
            if (!params.hvac_mode) {
                throw new Error("hvac_mode is required for 'set_hvac_mode' action");
            }
            success = await haClimateService.setHvacMode(params.entity_id, params.hvac_mode);
            if (!success) {
                 throw new Error(`Failed to set HVAC mode for '${params.entity_id}'. Entity not found or mode not supported?`);
            }
            deviceDetails = await haClimateService.getClimateDevice(params.entity_id);
            return { status: "success", state: deviceDetails };
        }

         case "set_temperature": {
            if (!params.entity_id) {
                throw new Error("entity_id is required for 'set_temperature' action");
            }
            if (params.temperature === undefined && params.target_temp_high === undefined && params.target_temp_low === undefined) {
                 throw new Error("At least one temperature parameter (temperature, target_temp_high, target_temp_low) is required for 'set_temperature' action");
            }
            if ((params.target_temp_high !== undefined && params.target_temp_low === undefined) || (params.target_temp_high === undefined && params.target_temp_low !== undefined)){
                 throw new Error("Both target_temp_high and target_temp_low must be provided together for temperature range setting");
            }

            success = await haClimateService.setTemperature(
                params.entity_id,
                params.temperature,
                params.target_temp_high,
                params.target_temp_low
            );
             if (!success) {
                 throw new Error(`Failed to set temperature for '${params.entity_id}'. Entity not found or temperature setting not supported?`);
            }
            deviceDetails = await haClimateService.getClimateDevice(params.entity_id);
            return { status: "success", state: deviceDetails };
        }

        case "set_fan_mode": {
             if (!params.entity_id) {
                throw new Error("entity_id is required for 'set_fan_mode' action");
            }
            if (!params.fan_mode) {
                throw new Error("fan_mode is required for 'set_fan_mode' action");
            }
            success = await haClimateService.setFanMode(params.entity_id, params.fan_mode);
             if (!success) {
                 throw new Error(`Failed to set fan mode for '${params.entity_id}'. Entity not found or mode not supported?`);
            }
            deviceDetails = await haClimateService.getClimateDevice(params.entity_id);
            return { status: "success", state: deviceDetails };
        }

        default:
            throw new Error(`Unknown action: ${String(params.action)}`);
    }
}

// --- Tool Definition ---
export const climateControlTool: Tool = {
    name: "climate_control",
    description: "Control climate devices (thermostats, AC) in Home Assistant",
    parameters: climateControlSchema,

    execute: executeClimateControlLogic,
};

// --- Original BaseTool Class Definition (for compatibility with src/index.ts) ---
export class ClimateControlTool extends BaseTool {
    constructor() {
        super({
            name: climateControlTool.name, // Reuse name from fastmcp definition
            description: climateControlTool.description, // Reuse description
            parameters: climateControlSchema, // Reuse schema
            metadata: {
                category: "home_assistant", // Keep original metadata if needed
                version: "1.0.0",
                tags: ["climate", "thermostat", "hvac", "home_assistant"],
                // Add examples if BaseTool/MCPServer uses them
            }
        });
    }

    /**
     * Execute method for the BaseTool class
     */
    public async execute(params: ClimateControlParams, context: MCPContext): Promise<Record<string, unknown>> {
         logger.debug(`Executing ClimateControlTool (BaseTool) with params: ${JSON.stringify(params)}`);
        try {
            const validatedParams = this.validateParams(params);
            const result = await executeClimateControlLogic(validatedParams);
            // return this.validateResult(result); // Optional result validation
            return result;
        } catch (error) {
            logger.error(`Error in ClimateControlTool (BaseTool): ${String(error)}`);
            throw error;
        }
    }
}