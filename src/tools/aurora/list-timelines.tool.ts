/**
 * Aurora List Timelines Tool
 * Lists available timelines
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

const listTimelinesSchema = z.object({
  limit: z.number().optional().default(10).describe("Maximum number of timelines to return (default: 10)"),
});

type ListTimelinesParams = z.infer<typeof listTimelinesSchema>;

async function executeListTimelines(args: ListTimelinesParams): Promise<unknown> {
  try {
    logger.info("Listing Aurora timelines");
    
    const manager = await getAuroraManager();
    const timelines = await manager.handleListTimelines({
      limit: args.limit,
    });

    return {
      success: true,
      timelines,
      count: timelines.length,
    };
  } catch (error) {
    logger.error("Failed to list timelines:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraListTimelinesTool: Tool = {
  name: "aurora_list_timelines",
  description: "List all saved Aurora timelines with metadata",
  parameters: listTimelinesSchema,
  execute: executeListTimelines,
};
