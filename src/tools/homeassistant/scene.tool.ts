/**
 * Scene Tools for Home Assistant
 *
 * Split into:
 * - `scene` (read-only): list
 * - `scene_activate`: activate (calls scene.turn_on, real-world effects via lights/climate)
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";

import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

const sceneReadSchema = z.object({
  action: z.literal("list").describe("List configured scenes"),
});

const sceneActivateSchema = z.object({
  action: z.literal("activate").describe("Activate a scene"),
  scene_id: z.string().describe("Scene entity ID to activate"),
});

type SceneReadParams = z.infer<typeof sceneReadSchema>;
type SceneActivateParams = z.infer<typeof sceneActivateSchema>;

async function executeSceneRead(_params: SceneReadParams): Promise<string> {
  try {
    const hass = await get_hass();
    const states = await hass.getStates();
    const scenes = states
      .filter((state) => state.entity_id.startsWith("scene."))
      .map((scene) => ({
        entity_id: scene.entity_id,
        name: scene.attributes?.friendly_name || scene.entity_id.split(".")[1],
        description: scene.attributes?.description,
      }));

    return JSON.stringify({
      success: true,
      scenes,
      total_count: scenes.length,
    });
  } catch (error) {
    logger.error(`Error listing scenes: ${error instanceof Error ? error.message : String(error)}`);
    return JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

async function executeSceneActivate(params: SceneActivateParams): Promise<string> {
  try {
    const hass = await get_hass();
    await hass.callService("scene", "turn_on", { entity_id: params.scene_id });
    return JSON.stringify({
      success: true,
      message: `Successfully activated scene ${params.scene_id}`,
      scene_id: params.scene_id,
    });
  } catch (error) {
    logger.error(
      `Error activating scene: ${error instanceof Error ? error.message : String(error)}`,
    );
    return JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const sceneTool: Tool = {
  name: "scene",
  description: "List Home Assistant scenes.",
  annotations: {
    title: "Scene Inventory",
    description: "Read-only listing of configured scenes",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: sceneReadSchema,
  execute: executeSceneRead,
};

export const sceneActivateTool: Tool = {
  name: "scene_activate",
  description:
    "Activate a pre-configured Home Assistant scene (calls scene.turn_on, actuates the underlying devices).",
  annotations: {
    title: "Scene Activate",
    description: "Activate a scene — actuates the devices it controls",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: sceneActivateSchema,
  execute: executeSceneActivate,
};
