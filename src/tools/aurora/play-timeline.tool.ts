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
});

type PlayTimelineParams = z.infer<typeof playTimelineSchema>;

async function executePlayTimeline(args: PlayTimelineParams): Promise<unknown> {
  try {
    logger.info(`Playing timeline: ${args.timeline_id}`);
    
    const manager = await getAuroraManager();
    const result = await manager.handlePlayTimeline({
      timeline_id: args.timeline_id,
      start_position: args.start_position,
    });

    logger.info(`Timeline playback started: ${result.timeline.name}`);

    return {
      success: true,
      status: result.status,
      timeline: {
        id: result.timeline.id,
        name: result.timeline.name,
        duration: result.timeline.duration,
      },
    };
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
