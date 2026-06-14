import { z } from "zod";
import { Tool } from "../types/index";
import { APP_CONFIG } from "../config/app.config";
import { sseManager } from "../sse/index";

export const getSSEStatsTool: Tool = {
  name: "get_sse_stats",
  description:
    "Get SSE connection statistics - retrieve metrics about active Server-Sent Events connections",
  annotations: {
    title: "SSE Statistics",
    description: "View metrics and diagnostics for active SSE connections and subscriptions",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  parameters: z.object({
    token: z.string().describe("Authentication token (required)"),
  }),
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      statistics: z.record(z.unknown()),
    }),
    z.object({
      success: z.literal(false),
      message: z.string(),
    }),
  ]),
  execute: (params: { token: string }) => {
    try {
      if (params.token !== APP_CONFIG.HASS_TOKEN) {
        return Promise.resolve(
          JSON.stringify({
            success: false,
            message: "Authentication failed",
          }),
        );
      }

      const stats = sseManager.getStatistics();
      return Promise.resolve(
        JSON.stringify({
          success: true,
          statistics: stats,
        }),
      );
    } catch (error) {
      return Promise.resolve(
        JSON.stringify({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error occurred",
        }),
      );
    }
  },
};
