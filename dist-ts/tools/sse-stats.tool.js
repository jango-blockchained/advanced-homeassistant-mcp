import { z } from "zod";
import { APP_CONFIG } from "../config/app.config.ts";
import { sseManager } from "../sse/index.js";
export const getSSEStatsTool = {
    name: "get_sse_stats",
    description: "Get SSE connection statistics",
    parameters: z.object({
        token: z.string().describe("Authentication token (required)"),
    }),
    execute: async (params) => {
        try {
            if (params.token !== APP_CONFIG.HASS_TOKEN) {
                return {
                    success: false,
                    message: "Authentication failed",
                };
            }
            const stats = await sseManager.getStatistics();
            return {
                success: true,
                statistics: stats,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Unknown error occurred",
            };
        }
    },
};
