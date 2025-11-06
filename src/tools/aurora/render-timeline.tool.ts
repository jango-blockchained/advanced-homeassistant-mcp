/**
 * Aurora Render Timeline Tool
 * Generates a pre-rendered lighting timeline synchronized to audio
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

const renderTimelineSchema = z.object({
  audio_file: z.string().describe("Path to audio file to sync lights with"),
  devices: z.array(z.string()).optional().describe("List of device entity IDs to include (optional, uses all if not specified)"),
  intensity: z.number().min(0.0).max(1.0).optional().default(0.7).describe("Effect intensity (0.0 to 1.0, default: 0.7)"),
  color_mapping: z.enum(["frequency", "mood", "custom"]).optional().default("frequency").describe("How to map audio to colors (default: frequency)"),
  beat_sync: z.boolean().optional().default(true).describe("Emphasize detected beats (default: true)"),
  smooth_transitions: z.boolean().optional().default(true).describe("Use smooth transitions between commands (default: true)"),
  timeline_name: z.string().optional().describe("Name for the timeline (optional)"),
});

type RenderTimelineParams = z.infer<typeof renderTimelineSchema>;

async function executeRenderTimeline(args: RenderTimelineParams): Promise<unknown> {
  try {
    logger.info(`Rendering timeline for audio: ${args.audio_file}`);
    
    const manager = await getAuroraManager();
    const result = await manager.handleRenderTimeline({
      audio_file: args.audio_file,
      devices: args.devices,
      intensity: args.intensity,
      color_mapping: args.color_mapping,
      beat_sync: args.beat_sync,
      smooth_transitions: args.smooth_transitions,
      timeline_name: args.timeline_name,
    });

    logger.info(`Timeline rendered: ${result.timeline.id} (${result.stats.duration}s, ${result.stats.totalCommands} commands)`);

    return {
      success: true,
      timeline: {
        id: result.timeline.id,
        name: result.timeline.name,
        duration: result.timeline.duration,
        device_count: result.timeline.tracks.length,
        bpm: result.timeline.audioFeatures.bpm,
        mood: result.timeline.audioFeatures.mood,
      },
      statistics: result.stats,
    };
  } catch (error) {
    logger.error("Failed to render timeline:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraRenderTimelineTool: Tool = {
  name: "aurora_render_timeline",
  description: "Generate a pre-rendered lighting timeline synchronized to audio features with device-specific timing compensation",
  parameters: renderTimelineSchema,
  execute: executeRenderTimeline,
};
