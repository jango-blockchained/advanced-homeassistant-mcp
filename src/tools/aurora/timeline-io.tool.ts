/**
 * Aurora Export/Import Timeline Tools
 * Export and import timelines to/from JSON
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

// Export Timeline Schema
const exportTimelineSchema = z.object({
  timeline_id: z.string().describe("ID of the timeline to export"),
  output_path: z.string().optional().describe("Path to save JSON file (optional)"),
});

type ExportTimelineParams = z.infer<typeof exportTimelineSchema>;

async function executeExportTimeline(args: ExportTimelineParams): Promise<unknown> {
  try {
    logger.info(`Exporting timeline: ${args.timeline_id}`);
    
    const manager = await getAuroraManager();
    const result = await manager.handleExportTimeline({
      timeline_id: args.timeline_id,
      output_path: args.output_path,
    });

    return {
      success: true,
      json: result.json,
      path: result.path,
    };
  } catch (error) {
    logger.error("Failed to export timeline:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraExportTimelineTool: Tool = {
  name: "aurora_export_timeline",
  description: "Export an Aurora timeline to JSON format for backup or sharing",
  parameters: exportTimelineSchema,
  execute: executeExportTimeline,
};

// Import Timeline Schema
const importTimelineSchema = z.object({
  input_path: z.string().describe("Path to JSON file to import"),
});

type ImportTimelineParams = z.infer<typeof importTimelineSchema>;

async function executeImportTimeline(args: ImportTimelineParams): Promise<unknown> {
  try {
    logger.info(`Importing timeline from: ${args.input_path}`);
    
    const manager = await getAuroraManager();
    const result = await manager.handleImportTimeline({
      input_path: args.input_path,
    });

    return {
      success: true,
      timeline: {
        id: result.timeline.id,
        name: result.timeline.name,
        duration: result.timeline.duration,
      },
    };
  } catch (error) {
    logger.error("Failed to import timeline:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraImportTimelineTool: Tool = {
  name: "aurora_import_timeline",
  description: "Import an Aurora timeline from JSON file",
  parameters: importTimelineSchema,
  execute: executeImportTimeline,
};
