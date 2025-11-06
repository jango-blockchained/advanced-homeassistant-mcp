/**
 * Aurora Get Status Tool
 * Gets current Aurora system status
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

const getStatusSchema = z.object({
  verbose: z.boolean().optional().default(false).describe("Include detailed statistics (default: false)"),
});

type GetStatusParams = z.infer<typeof getStatusSchema>;

async function executeGetStatus(args: GetStatusParams): Promise<unknown> {
  try {
    logger.info("Getting Aurora status");
    
    const manager = await getAuroraManager();
    const status = await manager.handleGetStatus({
      verbose: args.verbose,
    });

    return {
      success: true,
      ...status,
    };
  } catch (error) {
    logger.error("Failed to get status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraGetStatusTool: Tool = {
  name: "aurora_get_status",
  description: "Get current status of Aurora system including playback state and statistics",
  parameters: getStatusSchema,
  execute: executeGetStatus,
};
