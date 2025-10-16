/**
 * Scene Tool for Home Assistant
 *
 * This tool manages Home Assistant scenes - list and activate.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Define the schema for our tool parameters
const sceneSchema = z.object({
    action: z.enum(["list", "activate"]).describe("Action to perform with scenes"),
    scene_id: z.string().optional().describe("Scene ID to activate (required for activate action)"),
});

// Infer the type from the schema
type SceneParams = z.infer<typeof sceneSchema>;

// Shared execution logic
async function executeSceneLogic(params: SceneParams): Promise<Record<string, unknown>> {
    logger.debug(`Executing scene logic with params: ${JSON.stringify(params)}`);

    try {
        const hass = await get_hass();

        if (params.action === "list") {
            const states = await hass.getStates();
            const scenes = states
                .filter(state => state.entity_id.startsWith("scene."))
                .map(scene => ({
                    entity_id: scene.entity_id,
                    name: scene.attributes?.friendly_name || scene.entity_id.split(".")[1],
                    description: scene.attributes?.description
                }));

            return {
                success: true,
                scenes,
                total_count: scenes.length
            };

        } else if (params.action === "activate") {
            if (!params.scene_id) {
                throw new Error("Scene ID is required for activate action");
            }

            await hass.callService("scene", "turn_on", {
                entity_id: params.scene_id
            });

            return {
                success: true,
                message: `Successfully activated scene ${params.scene_id}`,
                scene_id: params.scene_id
            };
        }

        throw new Error("Invalid action specified");

    } catch (error) {
        logger.error(`Error in scene logic: ${error instanceof Error ? error.message : String(error)}`);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
}

// Tool object export (for FastMCP)
export const sceneTool: Tool = {
    name: "scene",
    description: "Manage and activate Home Assistant scenes",
    parameters: sceneSchema,
    execute: executeSceneLogic
};

/**
 * SceneTool class extending BaseTool (for compatibility with src/index.ts)
 */
export class SceneTool extends BaseTool {
    constructor() {
        super({
            name: sceneTool.name,
            description: sceneTool.description,
            parameters: sceneSchema,
            metadata: {
                category: "home_assistant",
                version: "1.0.0",
                tags: ["scene", "home_assistant", "control"],
            }
        });
    }

    /**
     * Execute method for the BaseTool class
     */
    public async execute(params: SceneParams, _context: MCPContext): Promise<Record<string, unknown>> {
        logger.debug(`Executing SceneTool (BaseTool) with params: ${JSON.stringify(params)}`);
        const validatedParams = this.validateParams(params);
        return await executeSceneLogic(validatedParams);
    }
}