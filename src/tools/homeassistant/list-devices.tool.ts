/**
 * List Devices Tool for Home Assistant
 *
 * This tool lists all available devices in Home Assistant,
 * with optional filtering by domain, area, or floor.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Define the schema for our tool parameters
const listDevicesSchema = z.object({
    domain: z.enum([
        "light",
        "climate",
        "alarm_control_panel",
        "cover",
        "switch",
        "contact",
        "media_player",
        "fan",
        "lock",
        "vacuum",
        "scene",
        "script",
        "camera",
    ]).optional().describe("Filter devices by domain"),
    area: z.string().optional().describe("Filter devices by area"),
    floor: z.string().optional().describe("Filter devices by floor"),
});

// Infer the type from the schema
type ListDevicesParams = z.infer<typeof listDevicesSchema>;

// Shared execution logic
async function executeListDevicesLogic(params: ListDevicesParams): Promise<Record<string, unknown>> {
    logger.debug(`Executing list devices logic with params: ${JSON.stringify(params)}`);

    try {
        const hass = await get_hass();
        const states = await hass.getStates();

        let filteredStates = states;

        // Apply filters
        if (params.domain) {
            filteredStates = filteredStates.filter(state =>
                state.entity_id.startsWith(`${params.domain}.`)
            );
        }

        if (params.area) {
            filteredStates = filteredStates.filter(state =>
                state.attributes?.area_id === params.area
            );
        }

        if (params.floor) {
            filteredStates = filteredStates.filter(state =>
                state.attributes?.floor_id === params.floor
            );
        }

        // Format the response
        const devices = filteredStates.map(state => ({
            entity_id: state.entity_id,
            state: state.state,
            attributes: {
                friendly_name: state.attributes?.friendly_name,
                area_id: state.attributes?.area_id,
                floor_id: state.attributes?.floor_id,
                ...state.attributes
            }
        }));

        logger.debug(`Found ${devices.length} devices matching criteria`);

        return {
            devices,
            total_count: devices.length,
            filters_applied: {
                domain: params.domain,
                area: params.area,
                floor: params.floor
            }
        };

    } catch (error) {
        logger.error(`Error in list devices logic: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

// Tool object export (for FastMCP)
export const listDevicesTool: Tool = {
    name: "list_devices",
    description: "List all available Home Assistant devices with optional filtering",
    parameters: listDevicesSchema,
    execute: executeListDevicesLogic
};

/**
 * ListDevicesTool class extending BaseTool (for compatibility with src/index.ts)
 */
export class ListDevicesTool extends BaseTool {
    constructor() {
        super({
            name: listDevicesTool.name,
            description: listDevicesTool.description,
            parameters: listDevicesSchema,
            metadata: {
                category: "home_assistant",
                version: "1.0.0",
                tags: ["devices", "home_assistant", "list"],
            }
        });
    }

    /**
     * Execute method for the BaseTool class
     */
    public async execute(params: ListDevicesParams, _context: MCPContext): Promise<Record<string, unknown>> {
        logger.debug(`Executing ListDevicesTool (BaseTool) with params: ${JSON.stringify(params)}`);
        const validatedParams = this.validateParams(params);
        return await executeListDevicesLogic(validatedParams);
    }
}