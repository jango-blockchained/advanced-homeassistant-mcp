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

    const testIterations = profile.lastTestResults ? profile.lastTestResults.length : 0;
    
    return {
      entity_id: args.entity_id,
      latency_ms: profile.latencyMs,
      min_transition_ms: profile.minTransitionMs,
      max_transition_ms: profile.maxTransitionMs,
      color_accuracy: profile.colorAccuracy,
      brightness_linearity: profile.brightnessLinearity,
      last_calibrated: profile.lastCalibrated,
      calibration_method: profile.calibrationMethod,
      test_iterations: testIterations,
    };
  } catch (error) {
    logger.error("Failed to profile device:", error);
    throw error;
  }
}

export const auroraProfileDeviceTool: Tool = {
  name: "aurora_profile_device",
  description: "Profile a light device to measure response latency and transition capabilities for accurate synchronization",
  parameters: profileDeviceSchema,
  execute: (params: unknown) => executeProfileDevice(params as ProfileDeviceParams),
};
