/**
 * Aurora Play Timeline Tool
 * Executes a pre-rendered timeline with precise synchronization
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

const playTimelineSchema = z.object({
  timeline_id: z.string().describe("ID of the timeline to play"),
  start_position: z.number().optional().default(0).describe("Start position in seconds (default: 0)"),
  media_player: z.string().optional().describe("Home Assistant media player entity ID (e.g., 'media_player.living_room') to play audio via Home Assistant"),
  audio_url: z.string().optional().describe("URL or path to the audio file for media_player (required if media_player is specified)"),
  local_audio: z.boolean().optional().default(true).describe("Play audio on the local host system (default: true). Set to false to disable audio or use media_player instead"),
});

type PlayTimelineParams = z.infer<typeof playTimelineSchema>;

async function executePlayTimeline(args: PlayTimelineParams): Promise<unknown> {
  try {
    logger.info(`Playing timeline: ${args.timeline_id}`);
    
    const manager = await getAuroraManager();
    const result = await manager.handlePlayTimeline({
      timeline_id: args.timeline_id,
      start_position: args.start_position,
      media_player: args.media_player,
      audio_url: args.audio_url,
      local_audio: args.local_audio,
    });

    logger.info(`Timeline playback started: ${result.timeline.name}`);

    const response: Record<string, unknown> = {
      success: true,
      status: result.status,
      timeline: {
        id: result.timeline.id,
        name: result.timeline.name,
        duration: result.timeline.duration,
      },
    };

    if (result.local_audio === true) {
      response.audio = {
        mode: 'local',
        started: true,
        message: 'Audio playing on host system, synchronized with light timeline',
      };
    } else if (result.media_started === true) {
      response.audio = {
        mode: 'media_player',
        started: true,
        media_player: args.media_player,
        message: 'Audio playback via Home Assistant media player, synchronized with light timeline',
      };
    }

    return response;
  } catch (error) {
    logger.error("Failed to play timeline:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraPlayTimelineTool: Tool = {
  name: "aurora_play_timeline",
  description: "Play a pre-rendered Aurora timeline with precise synchronization across all devices",
  parameters: playTimelineSchema,
  execute: executePlayTimeline,
};
