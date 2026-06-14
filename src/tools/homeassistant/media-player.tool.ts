/**
 * Media Player tools for Home Assistant
 *
 * Split into:
 * - `media_players` (read-only): list, get
 * - `media_players_activate`: turn_on/off, toggle, playback control, volume, source, sound mode, play media
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

class HomeAssistantMediaPlayerService {
  async getMediaPlayers(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("media_player."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }));
    } catch (error) {
      logger.error("Failed to get media players from HA:", error);
      return [];
    }
  }

  async getMediaPlayer(entity_id: string): Promise<Record<string, unknown> | null> {
    try {
      const hass = await get_hass();
      const state = await hass.getState(entity_id);
      return {
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
      };
    } catch (error) {
      logger.error(`Failed to get media player ${entity_id} from HA:`, error);
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
      await hass.callService("media_player", service, { entity_id, ...data });
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

const haMediaPlayerService = new HomeAssistantMediaPlayerService();

const mediaPlayersReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action"),
  entity_id: z.string().optional().describe("Media player entity_id (required for 'get')"),
});

const mediaPlayersActivateSchema = z.object({
  action: z
    .enum([
      "turn_on",
      "turn_off",
      "toggle",
      "play_media",
      "media_play",
      "media_pause",
      "media_stop",
      "media_next_track",
      "media_previous_track",
      "volume_up",
      "volume_down",
      "volume_mute",
      "volume_set",
      "select_source",
      "select_sound_mode",
    ])
    .describe("Activation action"),
  entity_id: z.string().describe("Media player entity_id"),
  volume_level: z.number().min(0).max(1).optional().describe("Volume 0-1 (volume_set)"),
  is_volume_muted: z.boolean().optional().describe("Mute state (volume_mute)"),
  media_content_id: z.string().optional().describe("Media content ID/URL (play_media)"),
  media_content_type: z
    .string()
    .optional()
    .describe("Media type: music/video/playlist (play_media)"),
  source: z.string().optional().describe("Input source (select_source)"),
  sound_mode: z.string().optional().describe("Sound mode (select_sound_mode)"),
});

type MediaPlayersReadParams = z.infer<typeof mediaPlayersReadSchema>;
type MediaPlayersActivateParams = z.infer<typeof mediaPlayersActivateSchema>;

async function executeMediaPlayersRead(params: MediaPlayersReadParams): Promise<string> {
  if (params.action === "list") {
    const players = await haMediaPlayerService.getMediaPlayers();
    return JSON.stringify(
      { success: true, media_players: players, count: players.length },
      null,
      2,
    );
  }
  if (!params.entity_id) {
    return JSON.stringify({ success: false, error: "entity_id is required for get action" });
  }
  const player = await haMediaPlayerService.getMediaPlayer(params.entity_id);
  if (!player) {
    return JSON.stringify({
      success: false,
      error: `Media player ${params.entity_id} not found`,
    });
  }
  return JSON.stringify({ success: true, media_player: player }, null, 2);
}

async function executeMediaPlayersActivate(params: MediaPlayersActivateParams): Promise<string> {
  const {
    action,
    entity_id,
    volume_level,
    is_volume_muted,
    media_content_id,
    media_content_type,
    source,
    sound_mode,
  } = params;

  try {
    // Verify entity exists before calling service
    const existingPlayer = await haMediaPlayerService.getMediaPlayer(entity_id);
    if (!existingPlayer) {
      return JSON.stringify({
        success: false,
        error: `Media player ${entity_id} not found`,
      });
    }

    let success = false;
    let serviceData: Record<string, unknown> = {};

    switch (action) {
      case "turn_on":
      case "turn_off":
      case "toggle":
      case "media_play":
      case "media_pause":
      case "media_stop":
      case "media_next_track":
      case "media_previous_track":
      case "volume_up":
      case "volume_down":
        success = await haMediaPlayerService.callService(action, entity_id);
        break;
      case "volume_set":
        if (volume_level === undefined) {
          return JSON.stringify({
            success: false,
            error: "volume_level is required for volume_set action",
          });
        }
        serviceData = { volume_level };
        success = await haMediaPlayerService.callService("volume_set", entity_id, serviceData);
        break;
      case "volume_mute":
        if (is_volume_muted === undefined) {
          return JSON.stringify({
            success: false,
            error: "is_volume_muted is required for volume_mute action",
          });
        }
        serviceData = { is_volume_muted };
        success = await haMediaPlayerService.callService("volume_mute", entity_id, serviceData);
        break;
      case "play_media":
        if (!media_content_id || !media_content_type) {
          return JSON.stringify({
            success: false,
            error: "media_content_id and media_content_type are required for play_media action",
          });
        }
        serviceData = { media_content_id, media_content_type };
        success = await haMediaPlayerService.callService("play_media", entity_id, serviceData);
        break;
      case "select_source":
        if (!source) {
          return JSON.stringify({
            success: false,
            error: "source is required for select_source action",
          });
        }
        serviceData = { source };
        success = await haMediaPlayerService.callService("select_source", entity_id, serviceData);
        break;
      case "select_sound_mode":
        if (!sound_mode) {
          return JSON.stringify({
            success: false,
            error: "sound_mode is required for select_sound_mode action",
          });
        }
        serviceData = { sound_mode };
        success = await haMediaPlayerService.callService(
          "select_sound_mode",
          entity_id,
          serviceData,
        );
        break;
    }

    if (!success) {
      return JSON.stringify({
        success: false,
        message: `Failed to execute ${action} on ${entity_id}`,
      });
    }

    // Read back state after service call to verify
    const updatedPlayer = await haMediaPlayerService.getMediaPlayer(entity_id);
    return JSON.stringify({
      success: true,
      message: `Successfully executed ${action} on ${entity_id}`,
      state: updatedPlayer,
    });
  } catch (error) {
    logger.error("Error in media player activate tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const mediaPlayersTool: Tool = {
  name: "media_players",
  description: "List all media players or get the state of a specific media player.",
  annotations: {
    title: "Media Players Inventory",
    description: "Read-only access to media player entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: mediaPlayersReadSchema,
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      media_players: z.array(
        z.object({
          entity_id: z.string(),
          state: z.string(),
          attributes: z.record(z.unknown()),
        }),
      ),
      count: z.number(),
    }),
    z.object({
      success: z.literal(true),
      media_player: z.object({
        entity_id: z.string(),
        state: z.string(),
        attributes: z.record(z.unknown()),
      }),
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
    }),
  ]),
  execute: executeMediaPlayersRead,
};

export const mediaPlayersActivateTool: Tool = {
  name: "media_players_activate",
  description:
    "Control media players: playback, volume, source/sound mode selection, play media on TVs and speakers.",
  annotations: {
    title: "Media Players Activate",
    description: "Actuate media players (audio/video output)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: mediaPlayersActivateSchema,
  outputSchema: z.union([
    z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
    }),
  ]),
  execute: executeMediaPlayersActivate,
};
