/**
 * Aurora Control Playback Tool
 * Controls playback of an active timeline
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

const controlPlaybackSchema = z.object({
  action: z.enum(["pause", "resume", "stop", "seek"]).describe("Playback action to perform"),
  position: z.number().optional().describe("Position in seconds (required for seek action)"),
});

type ControlPlaybackParams = z.infer<typeof controlPlaybackSchema>;

async function executeControlPlayback(args: ControlPlaybackParams): Promise<unknown> {
  try {
    logger.info(`Aurora playback control: ${args.action}`);
    
    const manager = await getAuroraManager();
    const result = await manager.handleControlPlayback({
      action: args.action,
      position: args.position,
    });

    logger.info(`Playback ${args.action} complete: position=${result.position}s`);

    return {
      success: true,
      status: result.status,
      position: result.position,
    };
  } catch (error) {
    logger.error("Failed to control playback:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraControlPlaybackTool: Tool = {
  name: "aurora_control_playback",
  description: "Control Aurora timeline playback (pause, resume, stop, seek)",
  parameters: controlPlaybackSchema,
  execute: executeControlPlayback,
};
