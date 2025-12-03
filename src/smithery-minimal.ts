/**
 * Minimal Smithery Entry Point for Home Assistant MCP Server
 *
 * This is a minimal entry point that avoids heavy dependencies
 * to work around ESM/CJS bundling issues with Smithery.
 *
 * @see https://smithery.ai/docs/build/deployments/typescript
 */

import { z } from "zod";

/**
 * Configuration schema for Smithery session configuration
 */
export const configSchema = z.object({
  hassToken: z
    .string()
    .optional()
    .describe("Long-lived access token for Home Assistant"),
  hassHost: z
    .string()
    .optional()
    .default("http://homeassistant.local:8123")
    .describe("Home Assistant server URL"),
  debug: z.boolean().optional().default(false).describe("Enable debug logging"),
});

type ServerConfig = z.infer<typeof configSchema>;

/**
 * Tool definitions with proper descriptions and annotations
 */
const TOOL_DEFINITIONS = [
  {
    name: "lights_control",
    description: "Control lights in Home Assistant. List all lights, get state of a specific light, turn lights on with brightness/color settings, or turn lights off.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "turn_on", "turn_off"],
          description: "The action to perform",
        },
        entity_id: {
          type: "string",
          description: "The entity ID of the light (required for get, turn_on, turn_off)",
        },
        brightness: {
          type: "number",
          minimum: 0,
          maximum: 255,
          description: "Brightness level (0-255)",
        },
        rgb_color: {
          type: "array",
          items: { type: "number" },
          minItems: 3,
          maxItems: 3,
          description: "RGB color as [r, g, b]",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Lights Control", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "climate_control",
    description: "Control climate devices (thermostats, AC) in Home Assistant. List devices, get state, set HVAC mode, temperature, or fan mode.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "set_hvac_mode", "set_temperature", "set_fan_mode"],
          description: "The action to perform",
        },
        entity_id: {
          type: "string",
          description: "The entity ID of the climate device",
        },
        hvac_mode: {
          type: "string",
          enum: ["off", "heat", "cool", "auto", "dry", "fan_only"],
          description: "HVAC mode to set",
        },
        temperature: {
          type: "number",
          description: "Target temperature",
        },
        fan_mode: {
          type: "string",
          enum: ["auto", "low", "medium", "high"],
          description: "Fan mode to set",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Climate Control", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "list_devices",
    description: "List all available Home Assistant devices with optional filtering by domain, area, or floor.",
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          enum: ["light", "climate", "cover", "switch", "media_player", "fan", "lock", "vacuum", "scene"],
          description: "Filter by device domain",
        },
        area: {
          type: "string",
          description: "Filter by area name",
        },
      },
    },
    annotations: { title: "List Devices", readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "cover_control",
    description: "Control covers (blinds, curtains, garage doors). Open, close, stop, or set position.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "open_cover", "close_cover", "stop_cover", "set_cover_position"],
          description: "The action to perform",
        },
        entity_id: {
          type: "string",
          description: "The entity ID of the cover",
        },
        position: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Position (0=closed, 100=open)",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Cover Control", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "media_player_control",
    description: "Control media players. Play, pause, stop, volume control, and source selection.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "play_media", "media_play", "media_pause", "media_stop", "volume_set"],
          description: "The action to perform",
        },
        entity_id: {
          type: "string",
          description: "The entity ID of the media player",
        },
        volume_level: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Volume level (0-1)",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Media Player Control", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "fan_control",
    description: "Control fans. Turn on/off, set speed percentage, preset modes, oscillation.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "turn_on", "turn_off", "set_percentage"],
          description: "The action to perform",
        },
        entity_id: {
          type: "string",
          description: "The entity ID of the fan",
        },
        percentage: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Speed percentage",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Fan Control", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "lock_control",
    description: "Control locks. Lock, unlock, or open (for locks that support unlatching).",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "lock", "unlock", "open"],
          description: "The action to perform",
        },
        entity_id: {
          type: "string",
          description: "The entity ID of the lock",
        },
        code: {
          type: "string",
          description: "Optional PIN/code for the lock",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Lock Control", readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  },
  {
    name: "vacuum_control",
    description: "Control robot vacuums. Start, pause, stop, return to dock, clean spot, locate.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "start", "pause", "stop", "return_to_base", "locate"],
          description: "The action to perform",
        },
        entity_id: {
          type: "string",
          description: "The entity ID of the vacuum",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Vacuum Control", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "alarm_control",
    description: "Control alarm systems. Arm (home, away, night), disarm, or trigger alarms.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "get", "alarm_disarm", "alarm_arm_home", "alarm_arm_away", "alarm_arm_night"],
          description: "The action to perform",
        },
        entity_id: {
          type: "string",
          description: "The entity ID of the alarm",
        },
        code: {
          type: "string",
          description: "Security code for the alarm",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Alarm Control", readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  },
  {
    name: "automation",
    description: "Manage Home Assistant automations. List all automations, toggle on/off, or trigger manually.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "toggle", "trigger"],
          description: "The action to perform",
        },
        automation_id: {
          type: "string",
          description: "The automation ID (required for toggle/trigger)",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Automation", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "scene",
    description: "Manage and activate Home Assistant scenes.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "activate"],
          description: "The action to perform",
        },
        scene_id: {
          type: "string",
          description: "The scene ID to activate",
        },
      },
      required: ["action"],
    },
    annotations: { title: "Scene", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "notify",
    description: "Send notifications through Home Assistant notification services.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The notification message",
        },
        title: {
          type: "string",
          description: "The notification title",
        },
        target: {
          type: "string",
          description: "Notification target (e.g., mobile_app_phone)",
        },
      },
      required: ["message"],
    },
    annotations: { title: "Notify", readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "system_info",
    description: "Get information about the MCP server including version and Home Assistant connection status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    annotations: { title: "System Info", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
];

/**
 * Creates the MCP server instance with all tools
 */
export default function createServer({ config }: { config?: ServerConfig } = {}) {
  // Apply configuration to environment variables
  if (config?.hassToken) {
    process.env.HASS_TOKEN = config.hassToken;
  }
  if (config?.hassHost) {
    process.env.HASS_HOST = config.hassHost;
  }
  if (config?.debug) {
    process.env.DEBUG = "true";
  }

  // Dynamically require the SDK at runtime (not bundled)
  const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");

  const server = new McpServer({
    name: "Home Assistant MCP Server",
    version: "1.2.1",
  });

  // Register all tools
  for (const tool of TOOL_DEFINITIONS) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (args: Record<string, unknown>) => {
        try {
          const hasToken = Boolean(process.env.HASS_TOKEN);
          if (!hasToken) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: "Home Assistant token not configured",
                    message: "Please configure hassToken in the server settings.",
                  }),
                },
              ],
              isError: true,
            };
          }

          // Dynamically import tool executors
          const { tools } = await import("./tools/index");
          const toolDef = tools.find((t: { name: string }) => t.name === tool.name);
          
          if (!toolDef) {
            // Handle system_info specially
            if (tool.name === "system_info") {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify({
                      name: "Home Assistant MCP Server",
                      version: "1.2.1",
                      hassHost: process.env.HASS_HOST || "not configured",
                      connected: hasToken,
                      toolCount: TOOL_DEFINITIONS.length,
                    }, null, 2),
                  },
                ],
              };
            }
            throw new Error(`Tool ${tool.name} not found`);
          }

          const result = await toolDef.execute(args as never);
          return {
            content: [
              {
                type: "text" as const,
                text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: errorMsg }),
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  return server.server;
}
