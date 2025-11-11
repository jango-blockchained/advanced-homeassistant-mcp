import { z } from "zod";
import { Tool, CommandParams } from "../types/index.js";
import { APP_CONFIG } from "../config/app.config.ts";
import { DomainSchema } from "../schemas.js";

// Create a unique array of all commands
const allCommands = [
  "turn_on",
  "turn_off",
  "toggle",
  "open",
  "close",
  "stop",
  "set_position",
  "set_tilt_position",
  "set_temperature",
  "set_hvac_mode",
  "set_fan_mode",
  "set_humidity",
] as const;

export const controlTool: Tool = {
  name: "control",
  description: "Control Home Assistant devices and services",
  parameters: z.object({
    command: z.enum(allCommands).describe("The command to execute"),
    entity_id: z.string().optional().describe("The entity ID to control"),
    area_id: z
      .string()
      .optional()
      .describe("The area ID to control all devices of the domain type"),
    // Common parameters
    state: z.string().optional().describe("The desired state for the entity"),
    // Light parameters
    brightness: z
      .number()
      .min(0)
      .max(255)
      .optional()
      .describe("Brightness level for lights (0-255)"),
    color_temp: z.number().optional().describe("Color temperature for lights"),
    rgb_color: z
      .tuple([z.number(), z.number(), z.number()])
      .optional()
      .describe("RGB color values"),
    // Cover parameters
    position: z.number().min(0).max(100).optional().describe("Position for covers (0-100)"),
    tilt_position: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Tilt position for covers (0-100)"),
    // Climate parameters
    temperature: z.number().optional().describe("Target temperature for climate devices"),
    target_temp_high: z.number().optional().describe("Target high temperature for climate devices"),
    target_temp_low: z.number().optional().describe("Target low temperature for climate devices"),
    hvac_mode: z
      .enum(["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"])
      .optional()
      .describe("HVAC mode for climate devices"),
    fan_mode: z
      .enum(["auto", "low", "medium", "high"])
      .optional()
      .describe("Fan mode for climate devices"),
    humidity: z.number().min(0).max(100).optional().describe("Target humidity for climate devices"),
  }),
  execute: async (params: CommandParams) => {
    try {
      // Validate that either entity_id or area_id is provided
      if (!params.entity_id && !params.area_id) {
        return JSON.stringify({
          success: false,
          error: "Either entity_id or area_id must be provided",
        });
      }

      // Determine domain from entity_id if provided, otherwise assume light for area control
      let domain: string;
      if (params.entity_id) {
        domain = params.entity_id.split(".")[0];
      } else {
        // For area control, domain is implied by the command type
        // For lights, we support turn_on/turn_off
        if (["turn_on", "turn_off", "toggle"].includes(params.command)) {
          domain = "light";
        } else {
          return JSON.stringify({
            success: false,
            error: `Command ${params.command} not supported for area control`,
          });
        }
      }

      // Explicitly handle unsupported domains
      if (!["light", "climate", "switch", "cover", "contact"].includes(domain)) {
        return JSON.stringify({
          success: false,
          error: `Unsupported domain: ${domain}`,
        });
      }

      const service = params.command;
      const serviceData: Record<string, any> = {};

      // Add entity_id or area_id to service data
      if (params.entity_id) {
        serviceData.entity_id = params.entity_id;
      } else if (params.area_id) {
        serviceData.area_id = params.area_id;
      }

      // Handle domain-specific parameters
      switch (domain) {
        case "light":
          if (params.brightness !== undefined) {
            serviceData.brightness = params.brightness;
          }
          if (params.color_temp !== undefined) {
            serviceData.color_temp = params.color_temp;
          }
          if (params.rgb_color !== undefined) {
            serviceData.rgb_color = params.rgb_color;
          }
          break;

        case "cover":
          if (service === "set_position" && params.position !== undefined) {
            serviceData.position = params.position;
          }
          if (service === "set_tilt_position" && params.tilt_position !== undefined) {
            serviceData.tilt_position = params.tilt_position;
          }
          break;

        case "climate":
          if (service === "set_temperature") {
            if (params.temperature !== undefined) {
              serviceData.temperature = params.temperature;
            }
            if (params.target_temp_high !== undefined) {
              serviceData.target_temp_high = params.target_temp_high;
            }
            if (params.target_temp_low !== undefined) {
              serviceData.target_temp_low = params.target_temp_low;
            }
          }
          if (service === "set_hvac_mode" && params.hvac_mode !== undefined) {
            serviceData.hvac_mode = params.hvac_mode;
          }
          if (service === "set_fan_mode" && params.fan_mode !== undefined) {
            serviceData.fan_mode = params.fan_mode;
          }
          if (service === "set_humidity" && params.humidity !== undefined) {
            serviceData.humidity = params.humidity;
          }
          break;

        case "switch":
        case "contact":
          // These domains only support basic operations (turn_on, turn_off, toggle)
          break;

        default:
          throw new Error(`Unsupported operation for domain: ${domain}`);
      }

      // Call Home Assistant service
      const response = await fetch(`${APP_CONFIG.HASS_HOST}/api/services/${domain}/${service}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        return JSON.stringify({
          success: false,
          error: `Failed to execute ${service} for ${params.entity_id || params.area_id}`,
        });
      }

      // Specific message formats for different domains and services
      const target = params.entity_id || `area ${params.area_id}`;
      const successMessage =
        domain === "light" && service === "turn_on"
          ? `Successfully executed turn_on for ${target}`
          : domain === "climate" && service === "set_temperature"
            ? `Successfully executed set_temperature for ${target}`
            : `Command ${service} executed successfully on ${target}`;

      return JSON.stringify({
        success: true,
        message: successMessage,
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
