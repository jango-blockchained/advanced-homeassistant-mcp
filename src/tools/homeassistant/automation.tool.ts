/**
 * Automation Tool for Home Assistant
 *
 * This tool manages Home Assistant automations - list, toggle, and trigger.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Define the schema for our tool parameters
const automationSchema = z.object({
    action: z.enum(["list", "toggle", "trigger"]).describe("Action to perform with automation"),
    automation_id: z.string().optional().describe("Automation ID (required for toggle and trigger actions)"),
});

// Infer the type from the schema
type AutomationParams = z.infer<typeof automationSchema>;

// Shared execution logic
async function executeAutomationLogic(params: AutomationParams): Promise<Record<string, unknown>> {
    logger.debug(`Executing automation logic with params: ${JSON.stringify(params)}`);

    try {
        const hass = await get_hass();

        if (params.action === "list") {
            const states = await hass.getStates();
            const automations = states
                .filter(state => state.entity_id.startsWith("automation."))
                .map(automation => ({
                    entity_id: automation.entity_id,
                    name: automation.attributes?.friendly_name || automation.entity_id.split(".")[1],
                    state: automation.state,
                    last_triggered: automation.attributes?.last_triggered
                }));

            return {
                success: true,
                automations,
                total_count: automations.length
            };

        } else {
            if (!params.automation_id) {
                throw new Error("Automation ID is required for toggle and trigger actions");
            }

            const service = params.action === "toggle" ? "toggle" : "trigger";
            await hass.callService("automation", service, {
                entity_id: params.automation_id
            });

            return {
                success: true,
                message: `Successfully ${service}d automation ${params.automation_id}`,
                automation_id: params.automation_id,
                action: params.action
            };
        }

    } catch (error) {
        logger.error(`Error in automation logic: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
}

// Tool object export (for FastMCP)
export const automationTool: Tool = {
    name: "automation",
    description: "Manage Home Assistant automations (list, toggle, trigger)",
    parameters: automationSchema,
    execute: executeAutomationLogic
};

/**
 * AutomationTool class extending BaseTool (for compatibility with src/index.ts)
 */
export class AutomationTool extends BaseTool {
    constructor() {
        super({
            name: automationTool.name,
            description: automationTool.description,
            parameters: automationSchema,
            metadata: {
                category: "home_assistant",
                version: "1.0.0",
                tags: ["automation", "home_assistant", "control"],
            }
        });
    }

    /**
     * Execute method for the BaseTool class
     */
    public async execute(params: AutomationParams, _context: MCPContext): Promise<Record<string, unknown>> {
        logger.debug(`Executing AutomationTool (BaseTool) with params: ${JSON.stringify(params)}`);
        const validatedParams = this.validateParams(params);
        return await executeAutomationLogic(validatedParams);
    }
}