/**
 * Media Player Control Tool for Home Assistant
 *
 * This tool allows controlling media players in Home Assistant.
 * Supports play, pause, volume control, source selection, and media search.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Real Home Assistant API service
class HomeAssistantMediaPlayerService {
    async getMediaPlayers(): Promise<Record<string, unknown>[]> {
        try {
            const hass = await get_hass();
            const states = await hass.getStates();
            return states
                .filter(state => state.entity_id.startsWith('media_player.'))
                .map(state => ({
                    entity_id: state.entity_id,
                    state: state.state,
                    attributes: state.attributes
                }));
        } catch (error) {
            logger.error('Failed to get media players from HA:', error);
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
                attributes: state.attributes
            };
        } catch (error) {
            logger.error(`Failed to get media player ${entity_id} from HA:`, error);
            return null;
        }
    }

    async callService(service: string, entity_id: string, data: Record<string, unknown> = {}): Promise<boolean> {
        try {
            const hass = await get_hass();
            const serviceData = { entity_id, ...data };
            await hass.callService('media_player', service, serviceData);
            return true;
        } catch (error) {
            logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
            return false;
        }
    }
}

// Singleton instance
const haMediaPlayerService = new HomeAssistantMediaPlayerService();

// Define the schema for our tool parameters using Zod
const mediaPlayerControlSchema = z.object({
    action: z.enum([
        "list",
        "get",
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
        "select_sound_mode"
    ]).describe("The action to perform"),
    entity_id: z.string().optional().describe("The entity ID of the media player (required for most actions)"),
    volume_level: z.number().min(0).max(1).optional().describe("Volume level between 0 and 1 (for volume_set)"),
    is_volume_muted: z.boolean().optional().describe("Mute state (for volume_mute)"),
    media_content_id: z.string().optional().describe("Media content ID or URL (for play_media)"),
    media_content_type: z.string().optional().describe("Media content type like 'music', 'video', 'playlist' (for play_media)"),
    source: z.string().optional().describe("Input source name (for select_source)"),
    sound_mode: z.string().optional().describe("Sound mode name (for select_sound_mode)")
});

type MediaPlayerControlInput = z.infer<typeof mediaPlayerControlSchema>;

// Main tool execution function
async function execute(params: MediaPlayerControlInput): Promise<string> {
    const { action, entity_id, volume_level, is_volume_muted, media_content_id, media_content_type, source, sound_mode } = params;

    try {
        switch (action) {
            case "list": {
                const players = await haMediaPlayerService.getMediaPlayers();
                return JSON.stringify({
                    success: true,
                    media_players: players,
                    count: players.length
                }, null, 2);
            }

            case "get": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: "entity_id is required for get action" });
                }
                const player = await haMediaPlayerService.getMediaPlayer(entity_id);
                if (!player) {
                    return JSON.stringify({ success: false, error: `Media player ${entity_id} not found` });
                }
                return JSON.stringify({ success: true, media_player: player }, null, 2);
            }

            case "turn_on":
            case "turn_off":
            case "toggle":
            case "media_play":
            case "media_pause":
            case "media_stop":
            case "media_next_track":
            case "media_previous_track":
            case "volume_up":
            case "volume_down": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: `entity_id is required for ${action} action` });
                }
                const success = await haMediaPlayerService.callService(action, entity_id);
                return JSON.stringify({
                    success,
                    message: success ? `Successfully executed ${action} on ${entity_id}` : `Failed to execute ${action} on ${entity_id}`
                });
            }

            case "volume_set": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: "entity_id is required for volume_set action" });
                }
                if (volume_level === undefined) {
                    return JSON.stringify({ success: false, error: "volume_level is required for volume_set action" });
                }
                const success = await haMediaPlayerService.callService("volume_set", entity_id, { volume_level });
                return JSON.stringify({
                    success,
                    message: success ? `Successfully set volume to ${volume_level} on ${entity_id}` : `Failed to set volume on ${entity_id}`
                });
            }

            case "volume_mute": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: "entity_id is required for volume_mute action" });
                }
                if (is_volume_muted === undefined) {
                    return JSON.stringify({ success: false, error: "is_volume_muted is required for volume_mute action" });
                }
                const success = await haMediaPlayerService.callService("volume_mute", entity_id, { is_volume_muted });
                return JSON.stringify({
                    success,
                    message: success ? `Successfully ${is_volume_muted ? 'muted' : 'unmuted'} ${entity_id}` : `Failed to mute/unmute ${entity_id}`
                });
            }

            case "play_media": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: "entity_id is required for play_media action" });
                }
                if (!media_content_id || !media_content_type) {
                    return JSON.stringify({ success: false, error: "media_content_id and media_content_type are required for play_media action" });
                }
                const success = await haMediaPlayerService.callService("play_media", entity_id, { 
                    media_content_id, 
                    media_content_type 
                });
                return JSON.stringify({
                    success,
                    message: success ? `Successfully started playing media on ${entity_id}` : `Failed to play media on ${entity_id}`
                });
            }

            case "select_source": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: "entity_id is required for select_source action" });
                }
                if (!source) {
                    return JSON.stringify({ success: false, error: "source is required for select_source action" });
                }
                const success = await haMediaPlayerService.callService("select_source", entity_id, { source });
                return JSON.stringify({
                    success,
                    message: success ? `Successfully selected source ${source} on ${entity_id}` : `Failed to select source on ${entity_id}`
                });
            }

            case "select_sound_mode": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: "entity_id is required for select_sound_mode action" });
                }
                if (!sound_mode) {
                    return JSON.stringify({ success: false, error: "sound_mode is required for select_sound_mode action" });
                }
                const success = await haMediaPlayerService.callService("select_sound_mode", entity_id, { sound_mode });
                return JSON.stringify({
                    success,
                    message: success ? `Successfully selected sound mode ${sound_mode} on ${entity_id}` : `Failed to select sound mode on ${entity_id}`
                });
            }

            default:
                return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
        }
    } catch (error) {
        logger.error("Error in media player control tool:", error);
        return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred"
        });
    }
}

// Export the tool object
export const mediaPlayerControlTool: Tool = {
    name: "media_player_control",
    description: "Control media players in Home Assistant. Supports playback control, volume adjustment, source selection, and media playing. Actions include: list (get all media players), get (get specific player info), turn_on/turn_off/toggle, play/pause/stop, next/previous track, volume controls, source and sound mode selection.",
    parameters: mediaPlayerControlSchema,
    execute
};
