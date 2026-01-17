/**
 * Notify Tool for Home Assistant
 *
 * This tool sends notifications through Home Assistant.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";

import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Define the schema for our tool parameters
const notifySchema = z.object({
  message: z.string().describe("The notification message"),
  title: z.string().optional().describe("The notification title"),
  target: z.string().optional().describe("Specific notification target (e.g., mobile_app_phone)"),
  data: z.record(z.any()).optional().describe("Additional notification data"),
});

// Infer the type from the schema
type NotifyParams = z.infer<typeof notifySchema>;

// Shared execution logic
async function executeNotifyLogic(params: NotifyParams): Promise<string> {
  logger.debug(`Executing notify logic with params: ${JSON.stringify(params)}`);

  try {
    const hass = await get_hass();

    const service = params.target ? `notify.${params.target}` : "notify.notify";
    const [domain, service_name] = service.split(".");

    const serviceData: Record<string, unknown> = {
      message: params.message,
    };

    if (params.title) serviceData.title = params.title;
    if (params.data) serviceData.data = params.data;

    await hass.callService(domain, service_name, serviceData);

    return JSON.stringify({
      success: true,
      message: "Notification sent successfully",
      target: params.target || "default",
    });
  } catch (error) {
    logger.error(
      `Error in notify logic: ${error instanceof Error ? error.message : String(error)}`,
    );
    return JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

// Tool object export (for FastMCP)
export const notifyTool: Tool = {
  name: "notify",
  description: "Send notifications through Home Assistant",
  annotations: {
    title: "Notify",
    description: "Send notifications through Home Assistant to mobile apps and notify services",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: notifySchema,
  execute: executeNotifyLogic,
};


