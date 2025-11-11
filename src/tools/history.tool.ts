import { z } from "zod";
import { Tool, HistoryParams } from "../types/index.js";
import { APP_CONFIG } from "../config/app.config.ts";

export const historyTool: Tool = {
  name: "get_history",
  description: "Get state history for Home Assistant entities",
  parameters: z.object({
    entity_id: z.string().describe("The entity ID to get history for"),
    start_time: z
      .string()
      .optional()
      .describe("Start time in ISO format. Defaults to 24 hours ago"),
    end_time: z.string().optional().describe("End time in ISO format. Defaults to now"),
    minimal_response: z
      .boolean()
      .optional()
      .describe("Return minimal response to reduce data size"),
    significant_changes_only: z
      .boolean()
      .optional()
      .describe("Only return significant state changes"),
  }),
  execute: async (params: HistoryParams) => {
    try {
      const now = new Date();
      const startTime = params.start_time
        ? new Date(params.start_time)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endTime = params.end_time ? new Date(params.end_time) : now;

      // Build query parameters
      const queryParams = new URLSearchParams({
        filter_entity_id: params.entity_id,
        minimal_response: String(!!params.minimal_response),
        significant_changes_only: String(!!params.significant_changes_only),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });

      const response = await fetch(
        `${APP_CONFIG.HASS_HOST}/api/history/period/${startTime.toISOString()}?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const history = await response.json();
      return JSON.stringify({
        success: true,
        history: Array.isArray(history) ? history : [history],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return JSON.stringify({
        success: false,
        error: errorMessage,
      });
    }
  },
};
