/**
 * Cover tools for Home Assistant
 *
 * Split into:
 * - `covers` (read-only): list, get
 * - `covers_activate`: open/close/stop/toggle + position/tilt
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

class HomeAssistantCoverService {
  async getCovers(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("cover."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }));
    } catch (error) {
      logger.error("Failed to get covers from HA:", error);
      return [];
    }
  }

  async getCover(entity_id: string): Promise<Record<string, unknown> | null> {
    try {
      const hass = await get_hass();
      const state = await hass.getState(entity_id);
      return {
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
      };
    } catch (error) {
      logger.error(`Failed to get cover ${entity_id} from HA:`, error);
      return null;
    }
  }

  async callService(
    service: string,
    entity_id: string,
    data: Record<string, unknown> = {},
  ): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("cover", service, { entity_id, ...data });
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

const haCoverService = new HomeAssistantCoverService();

const coversReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action"),
  entity_id: z.string().optional().describe("Cover entity_id (required for 'get')"),
});

const coversActivateSchema = z.object({
  action: z
    .enum([
      "open_cover",
      "close_cover",
      "stop_cover",
      "toggle",
      "set_cover_position",
      "open_cover_tilt",
      "close_cover_tilt",
      "stop_cover_tilt",
      "set_cover_tilt_position",
    ])
    .describe("Activation action"),
  entity_id: z.string().describe("Cover entity_id"),
  position: z.number().min(0).max(100).optional().describe("Position 0-100 (set_cover_position)"),
  tilt_position: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Tilt position 0-100 (set_cover_tilt_position)"),
});

type CoversReadParams = z.infer<typeof coversReadSchema>;
type CoversActivateParams = z.infer<typeof coversActivateSchema>;

async function executeCoversRead(params: CoversReadParams): Promise<string> {
  if (params.action === "list") {
    const covers = await haCoverService.getCovers();
    return JSON.stringify({ success: true, covers, count: covers.length }, null, 2);
  }
  if (!params.entity_id) {
    return JSON.stringify({ success: false, error: "entity_id is required for get action" });
  }
  const cover = await haCoverService.getCover(params.entity_id);
  if (!cover) {
    return JSON.stringify({ success: false, error: `Cover ${params.entity_id} not found` });
  }
  return JSON.stringify({ success: true, cover }, null, 2);
}

async function executeCoversActivate(params: CoversActivateParams): Promise<string> {
  const { action, entity_id, position, tilt_position } = params;
  try {
    if (action === "set_cover_position") {
      if (position === undefined) {
        return JSON.stringify({
          success: false,
          error: "position is required for set_cover_position action",
        });
      }
      const success = await haCoverService.callService("set_cover_position", entity_id, {
        position,
      });
      return JSON.stringify({
        success,
        message: success
          ? `Successfully set cover position to ${position}% on ${entity_id}`
          : `Failed to set cover position on ${entity_id}`,
      });
    }
    if (action === "set_cover_tilt_position") {
      if (tilt_position === undefined) {
        return JSON.stringify({
          success: false,
          error: "tilt_position is required for set_cover_tilt_position action",
        });
      }
      const success = await haCoverService.callService("set_cover_tilt_position", entity_id, {
        tilt_position,
      });
      return JSON.stringify({
        success,
        message: success
          ? `Successfully set cover tilt position to ${tilt_position}% on ${entity_id}`
          : `Failed to set cover tilt position on ${entity_id}`,
      });
    }
    const success = await haCoverService.callService(action, entity_id);
    return JSON.stringify({
      success,
      message: success
        ? `Successfully executed ${action} on ${entity_id}`
        : `Failed to execute ${action} on ${entity_id}`,
    });
  } catch (error) {
    logger.error("Error in cover activate tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const coversTool: Tool = {
  name: "covers",
  description: "List all covers (blinds, curtains, garage doors, shades) or get the state of one.",
  annotations: {
    title: "Covers Inventory",
    description: "Read-only access to cover entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: coversReadSchema,
  execute: executeCoversRead,
};

export const coversActivateTool: Tool = {
  name: "covers_activate",
  description: "Open, close, stop, toggle, or set the position/tilt of a cover.",
  annotations: {
    title: "Covers Activate",
    description: "Actuate covers (blinds, curtains, garage doors)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: coversActivateSchema,
  execute: executeCoversActivate,
};
