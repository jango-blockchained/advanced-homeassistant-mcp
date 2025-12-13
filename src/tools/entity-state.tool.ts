/**
 * Entity State Tool for Home Assistant
 *
 * Generic tool to get the current state of any Home Assistant entity.
 * Works with all entity types (sensor, binary_sensor, switch, light, etc.)
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../utils/logger.js";
import { get_hass } from "../hass/index.js";
import { Tool } from "../types/index.js";

// Define the schema for our tool parameters
const entityStateSchema = z.object({
  entity_id: z
    .string()
    .describe(
      "The entity ID to get state for (e.g., 'sensor.temperature', 'binary_sensor.motion', 'switch.plug')",
    ),
  include_attributes: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include entity attributes in response (default: true)"),
});

type EntityStateParams = z.infer<typeof entityStateSchema>;

async function executeEntityStateLogic(params: EntityStateParams): Promise<string> {
  try {
    const hass = await get_hass();
    const state = await hass.getState(params.entity_id);

    if (!state) {
      throw new UserError(`Entity '${params.entity_id}' not found`);
    }

    const result: Record<string, unknown> = {
      entity_id: state.entity_id,
      state: state.state,
      last_changed: state.last_changed,
      last_updated: state.last_updated,
    };

    if (params.include_attributes) {
      result.attributes = state.attributes;
    }

    return JSON.stringify(result);
  } catch (error) {
    if (error instanceof UserError) throw error;
    logger.error(`Failed to get entity state: ${error}`);
    throw new UserError(`Failed to get state for '${params.entity_id}'`);
  }
}

export const entityStateTool: Tool = {
  name: "get_entity_state",
  description:
    "Get the current state of any Home Assistant entity. Works with all entity types: sensors, binary_sensors, switches, lights, climate, covers, etc. Returns state value, timestamps, and optionally all attributes.",
  parameters: entityStateSchema,
  execute: executeEntityStateLogic,
  annotations: {
    title: "Get Entity State",
    description: "Query current state of any Home Assistant entity",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};
