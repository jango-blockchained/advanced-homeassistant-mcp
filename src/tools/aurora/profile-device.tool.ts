/**
 * Aurora Profile Device Tool
 * Profiles a device to measure latency and capabilities
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

const profileDeviceSchema = z.object({
  entity_id: z.string().describe("Home Assistant entity ID of the light to profile (e.g., light.living_room)"),
  iterations: z.number().optional().default(3).describe("Number of test iterations for accuracy (default: 3)"),
});

type ProfileDeviceParams = z.infer<typeof profileDeviceSchema>;

async function executeProfileDevice(args: ProfileDeviceParams): Promise<unknown> {
  try {
    logger.info(`Profiling device: ${args.entity_id}`);
    
    const manager = await getAuroraManager();
    const profile = await manager.handleProfileDevice({
      entity_id: args.entity_id,
      iterations: args.iterations,
    });

    logger.info(`Device profiling complete: latency=${profile.latencyMs}ms`);

    return {
      success: true,
      profile: {
        entity_id: args.entity_id,
        latency_ms: profile.latencyMs,
        min_transition_ms: profile.minTransitionMs,
        max_transition_ms: profile.maxTransitionMs,
        supports_transitions: profile.supportsTransitions,
        last_calibrated: profile.lastCalibrated,
        test_iterations: profile.measurements?.length || 0,
      },
    };
  } catch (error) {
    logger.error("Failed to profile device:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraProfileDeviceTool: Tool = {
  name: "aurora_profile_device",
  description: "Profile a light device to measure response latency and transition capabilities for accurate synchronization",
  parameters: profileDeviceSchema,
  execute: executeProfileDevice,
};
