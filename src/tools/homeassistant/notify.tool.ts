/**
 * Notify Tool for Home Assistant
 *
 * This tool sends notifications through Home Assistant.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Define the schema for our tool parameters
const notifySchema = z.object({
    message: z.string().describe("The notification message"),
    title: z.string().optional().describe("The notification title"),
    target: z.string().optional().describe("Specific notification target (e.g., mobile_app_phone)"),
    data: z.record(z.any()).optional().describe("Additional notification data"),
});

// Infer the type from the schema
type NotifyParams = z.infer<typeof notifySchema>;

// Shared execution logic
async function executeNotifyLogic(params: NotifyParams): Promise<Record<string, unknown>> {
    logger.debug(`Executing notify logic with params: ${JSON.stringify(params)}`);

    try {
        const hass = await get_hass();

        const service = params.target ? `notify.${params.target}` : "notify.notify";
        const [domain, service_name] = service.split(".");

        const serviceData: Record<string, unknown> = {
            message: params.message
        };

        if (params.title) serviceData.title = params.title;
        if (params.data) serviceData.data = params.data;

        await hass.callService(domain, service_name, serviceData);

        return {
            success: true,
            message: "Notification sent successfully",
            target: params.target || "default"
        };

    } catch (error) {
        logger.error(`Error in notify logic: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
}

// Tool object export (for FastMCP)
export const notifyTool: Tool = {
    name: "notify",
    description: "Send notifications through Home Assistant",
    parameters: notifySchema,
    execute: executeNotifyLogic
};

/**
 * NotifyTool class extending BaseTool (for compatibility with src/index.ts)
 */
export class NotifyTool extends BaseTool {
    constructor() {
        super({
            name: notifyTool.name,
            description: notifyTool.description,
            parameters: notifySchema,
            metadata: {
                category: "home_assistant",
                version: "1.0.0",
                tags: ["notification", "home_assistant", "alert"],
            }
        });
    }

    /**
     * Execute method for the BaseTool class
     */
    public async execute(params: NotifyParams, _context: MCPContext): Promise<Record<string, unknown>> {
        logger.debug(`Executing NotifyTool (BaseTool) with params: ${JSON.stringify(params)}`);
        const validatedParams = this.validateParams(params);
        return await executeNotifyLogic(validatedParams);
    }
}