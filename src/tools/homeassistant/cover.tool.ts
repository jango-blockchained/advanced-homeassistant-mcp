/**
 * Cover Control Tool for Home Assistant
 *
 * This tool allows controlling covers (blinds, curtains, garage doors, etc.) in Home Assistant.
 * Supports open, close, stop, and position control.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Real Home Assistant API service
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
      const serviceData = { entity_id, ...data };
      await hass.callService("cover", service, serviceData);
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

// Singleton instance
const haCoverService = new HomeAssistantCoverService();

// Define the schema for our tool parameters using Zod
const coverControlSchema = z.object({
  action: z
    .enum([
      "list",
      "get",
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
    .describe("The action to perform"),
  entity_id: z
    .string()
    .optional()
    .describe("The entity ID of the cover (required for most actions)"),
  position: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Position between 0 (closed) and 100 (open) for set_cover_position"),
  tilt_position: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Tilt position between 0 and 100 for set_cover_tilt_position"),
});

type CoverControlInput = z.infer<typeof coverControlSchema>;

// Main tool execution function
async function execute(params: CoverControlInput): Promise<string> {
  const { action, entity_id, position, tilt_position } = params;

  try {
    switch (action) {
      case "list": {
        const covers = await haCoverService.getCovers();
        return JSON.stringify(
          {
            success: true,
            covers: covers,
            count: covers.length,
          },
          null,
          2,
        );
      }

      case "get": {
        if (!entity_id) {
          return JSON.stringify({ success: false, error: "entity_id is required for get action" });
        }
        const cover = await haCoverService.getCover(entity_id);
        if (!cover) {
          return JSON.stringify({ success: false, error: `Cover ${entity_id} not found` });
        }
        return JSON.stringify({ success: true, cover: cover }, null, 2);
      }

      case "open_cover":
      case "close_cover":
      case "stop_cover":
      case "toggle":
      case "open_cover_tilt":
      case "close_cover_tilt":
      case "stop_cover_tilt": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: `entity_id is required for ${action} action`,
          });
        }
        const success = await haCoverService.callService(action, entity_id);
        return JSON.stringify({
          success,
          message: success
            ? `Successfully executed ${action} on ${entity_id}`
            : `Failed to execute ${action} on ${entity_id}`,
        });
      }

      case "set_cover_position": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: "entity_id is required for set_cover_position action",
          });
        }
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

      case "set_cover_tilt_position": {
        if (!entity_id) {
          return JSON.stringify({
            success: false,
            error: "entity_id is required for set_cover_tilt_position action",
          });
        }
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

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    logger.error("Error in cover control tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

// Export the tool object
export const coverControlTool: Tool = {
  name: "cover_control",
  description:
    "Control covers (blinds, curtains, garage doors, shades, etc.) in Home Assistant. Supports opening, closing, stopping, toggling, and position control. Actions include: list (get all covers), get (get specific cover info), open_cover, close_cover, stop_cover, toggle, set_cover_position, and tilt controls for venetian blinds.",
  parameters: coverControlSchema,
  execute,
};
