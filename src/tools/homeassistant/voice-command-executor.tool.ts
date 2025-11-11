/**
 * Voice Command Executor Tool for Home Assistant
 *
 * This tool takes parsed voice commands and executes them through Home Assistant.
 * It maps intents to Home Assistant service calls and device controls.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";
import { MCPContext } from "../../mcp/types.js";
import { BaseTool } from "../base-tool.js";

interface ExecutionResult {
  success: boolean;
  intent: string;
  action: string;
  target?: string;
  message: string;
  state_change?: Record<string, unknown>;
  error?: string;
}

// Define the schema for our tool parameters using Zod
const voiceCommandExecutorSchema = z.object({
  intent: z
    .string()
    .min(1)
    .describe("The parsed intent from the voice command"),
  action: z
    .string()
    .min(1)
    .describe("The action to execute"),
  target: z
    .string()
    .optional()
    .describe("The target entity (device, light, etc.)"),
  entities: z
    .array(z.string())
    .optional()
    .describe("List of entities mentioned in the command"),
  parameters: z
    .record(z.unknown())
    .optional()
    .describe("Additional parameters extracted from the command"),
});

type VoiceCommandExecutorParams = z.infer<typeof voiceCommandExecutorSchema>;

/**
 * Map entity names to Home Assistant entity IDs
 */
async function resolveEntityId(entityName: string): Promise<string | null> {
  try {
    const hass = await get_hass();
    const states = await hass.getStates();

    // Direct match
    const directMatch = states.find((s) => s.entity_id === entityName);
    if (directMatch) {
      return entityName;
    }

    // Friendly name match
    for (const state of states) {
      const attrs = state.attributes as Record<string, unknown> | undefined;
      if (
        attrs?.friendly_name === entityName ||
        attrs?.friendly_name === `${entityName} light`
      ) {
        return state.entity_id;
      }
    }

    // Partial match on entity name
    const lowerName = entityName.toLowerCase();
    for (const state of states) {
      if (state.entity_id.includes(lowerName)) {
        return state.entity_id;
      }
    }

    return null;
  } catch (error) {
    logger.error(`Error resolving entity ID for "${entityName}":`, error);
    return null;
  }
}

/**
 * Execute turn on/off commands
 */
async function executeLightControl(intent: string, targetId: string): Promise<ExecutionResult> {
  try {
    const hass = await get_hass();
    const domain = targetId.split(".")[0];

    const service = intent === "turn_on" ? "turn_on" : "turn_off";
    await hass.callService(domain, service, { entity_id: targetId });

    return {
      success: true,
      intent,
      action: service,
      target: targetId,
      message: `Successfully turned ${service === "turn_on" ? "on" : "off"} ${targetId}`,
    };
  } catch (error) {
    logger.error(`Error executing light control (${intent}) on ${targetId}:`, error);
    return {
      success: false,
      intent,
      action: "light_control",
      target: targetId,
      message: `Failed to control light: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute temperature control commands
 */
async function executeTemperatureControl(
  targetId: string,
  temperature: number,
): Promise<ExecutionResult> {
  try {
    const hass = await get_hass();
    await hass.callService("climate", "set_temperature", {
      entity_id: targetId,
      temperature,
    });

    return {
      success: true,
      intent: "set_temperature",
      action: "set_temperature",
      target: targetId,
      message: `Successfully set temperature to ${temperature}°`,
      state_change: { temperature },
    };
  } catch (error) {
    logger.error(`Error setting temperature on ${targetId}:`, error);
    return {
      success: false,
      intent: "set_temperature",
      action: "set_temperature",
      target: targetId,
      message: `Failed to set temperature: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute brightness control commands
 */
async function executeBrightnessControl(
  targetId: string,
  brightness: number,
): Promise<ExecutionResult> {
  try {
    const hass = await get_hass();
    await hass.callService("light", "turn_on", {
      entity_id: targetId,
      brightness: Math.max(0, Math.min(255, brightness)),
    });

    return {
      success: true,
      intent: "set_brightness",
      action: "set_brightness",
      target: targetId,
      message: `Successfully set brightness to ${brightness}`,
      state_change: { brightness },
    };
  } catch (error) {
    logger.error(`Error setting brightness on ${targetId}:`, error);
    return {
      success: false,
      intent: "set_brightness",
      action: "set_brightness",
      target: targetId,
      message: `Failed to set brightness: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute color control commands
 */
async function executeColorControl(
  targetId: string,
  rgbColor: [number, number, number],
): Promise<ExecutionResult> {
  try {
    const hass = await get_hass();
    await hass.callService("light", "turn_on", {
      entity_id: targetId,
      rgb_color: rgbColor,
    });

    return {
      success: true,
      intent: "set_color",
      action: "set_color",
      target: targetId,
      message: `Successfully set color to RGB(${rgbColor.join(", ")})`,
      state_change: { rgb_color: rgbColor },
    };
  } catch (error) {
    logger.error(`Error setting color on ${targetId}:`, error);
    return {
      success: false,
      intent: "set_color",
      action: "set_color",
      target: targetId,
      message: `Failed to set color: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute cover (blind/curtain) control commands
 */
async function executeCoverControl(intent: string, targetId: string): Promise<ExecutionResult> {
  try {
    const hass = await get_hass();
    const service = intent === "open_cover" ? "open_cover" : "close_cover";
    await hass.callService("cover", service, { entity_id: targetId });

    return {
      success: true,
      intent,
      action: service,
      target: targetId,
      message: `Successfully ${service === "open_cover" ? "opened" : "closed"} ${targetId}`,
    };
  } catch (error) {
    logger.error(`Error executing cover control (${intent}) on ${targetId}:`, error);
    return {
      success: false,
      intent,
      action: "cover_control",
      target: targetId,
      message: `Failed to control cover: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute lock control commands
 */
async function executeLockControl(intent: string, targetId: string): Promise<ExecutionResult> {
  try {
    const hass = await get_hass();
    const service = intent === "lock_door" ? "lock" : "unlock";
    await hass.callService("lock", service, { entity_id: targetId });

    return {
      success: true,
      intent,
      action: service,
      target: targetId,
      message: `Successfully ${service}ed ${targetId}`,
    };
  } catch (error) {
    logger.error(`Error executing lock control (${intent}) on ${targetId}:`, error);
    return {
      success: false,
      intent,
      action: "lock_control",
      target: targetId,
      message: `Failed to control lock: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute vacuum commands
 */
async function executeVacuumControl(intent: string, targetId: string): Promise<ExecutionResult> {
  try {
    const hass = await get_hass();
    const service = intent === "start_vacuum" ? "start" : "stop";
    await hass.callService("vacuum", service, { entity_id: targetId });

    return {
      success: true,
      intent,
      action: service,
      target: targetId,
      message: `Successfully ${service}ed ${targetId}`,
    };
  } catch (error) {
    logger.error(`Error executing vacuum control (${intent}) on ${targetId}:`, error);
    return {
      success: false,
      intent,
      action: "vacuum_control",
      target: targetId,
      message: `Failed to control vacuum: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send notification commands
 */
async function executeSendNotification(message: string): Promise<ExecutionResult> {
  try {
    const hass = await get_hass();
    await hass.callService("notify", "notify", {
      message,
    });

    return {
      success: true,
      intent: "send_notification",
      action: "send_notification",
      message: `Notification sent: ${message}`,
    };
  } catch (error) {
    logger.error("Error sending notification:", error);
    return {
      success: false,
      intent: "send_notification",
      action: "send_notification",
      message: `Failed to send notification: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute voice command through Home Assistant
 */
function executeVoiceCommandExecutorLogic(
  params: VoiceCommandExecutorParams,
): Promise<string> {
  const { intent, action, target, parameters = {} } = params;

  logger.debug(`Executing voice command: intent="${intent}", action="${action}", target="${target}"`);

  const effectiveTarget = target ?? "";
  return resolveAndExecute(intent, action, effectiveTarget, parameters)
    .then((result) => {
      logger.info(`Command execution result: ${result.success ? "success" : "failed"}`, result);
      return JSON.stringify(result);
    })
    .catch((error) => {
      logger.error("Error executing voice command:", error);
      return JSON.stringify({
        success: false,
        intent,
        action,
        target,
        message: error instanceof Error ? error.message : "Unknown error",
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

/**
 * Resolve entity and execute appropriate command
 */
async function resolveAndExecute(
  intent: string,
  action: string,
  target: string,
  parameters: Record<string, unknown>,
): Promise<ExecutionResult> {
  // Handle special cases that don't need entity resolution
  if (intent === "send_notification") {
    const message = (parameters.message as string) || "Voice command notification";
    return executeSendNotification(message);
  }

  // For other intents, resolve the target entity
  if (target === "") {
    return {
      success: false,
      intent,
      action,
      message: "No target entity specified",
      error: "missing_target",
    };
  }

  const entityId = await resolveEntityId(target);
  if (entityId === null) {
    return {
      success: false,
      intent,
      action,
      target,
      message: `Could not find entity: ${target}`,
      error: "entity_not_found",
    };
  }

  // Execute based on intent
  switch (intent) {
    case "turn_on":
    case "turn_off":
      return executeLightControl(intent, entityId);

    case "set_temperature": {
      const temperature = (parameters.temperature as number) || 20;
      return executeTemperatureControl(entityId, temperature);
    }

    case "set_brightness": {
      const brightness = (parameters.brightness as number) || 128;
      return executeBrightnessControl(entityId, brightness);
    }

    case "set_color": {
      const rgbColorParam = parameters.rgb_color;
      let rgbColor: [number, number, number] = [255, 255, 255];
      if (typeof rgbColorParam !== "undefined" && Array.isArray(rgbColorParam)) {
        rgbColor = rgbColorParam as [number, number, number];
      }
      return executeColorControl(entityId, rgbColor);
    }

    case "open_cover":
    case "close_cover":
      return executeCoverControl(intent, entityId);

    case "lock_door":
    case "unlock_door":
      return executeLockControl(intent, entityId);

    case "start_vacuum":
    case "stop_vacuum":
      return executeVacuumControl(intent, entityId);

    default:
      return {
        success: false,
        intent,
        action,
        target: entityId,
        message: `Unknown intent: ${intent}`,
        error: "unknown_intent",
      };
  }
}

// Export the tool object
export const voiceCommandExecutorTool: Tool = {
  name: "voice_command_executor",
  description:
    "Execute parsed voice commands through Home Assistant. Maps intents to service calls and controls devices.",
  parameters: voiceCommandExecutorSchema,
  execute: (params: unknown): Promise<unknown> => {
    return executeVoiceCommandExecutorLogic(params as VoiceCommandExecutorParams);
  },
};

/**
 * VoiceCommandExecutorTool class extending BaseTool (for compatibility with src/index.ts)
 */
export class VoiceCommandExecutorTool extends BaseTool {
  constructor() {
    super({
      name: voiceCommandExecutorTool.name,
      description: voiceCommandExecutorTool.description,
      parameters: voiceCommandExecutorSchema,
      metadata: {
        category: "speech",
        version: "1.0.0",
        tags: ["voice", "speech", "command_execution", "home_assistant"],
      },
    });
  }

  /**
   * Execute method for the BaseTool class
   */
  public async execute(params: VoiceCommandExecutorParams, _context: MCPContext): Promise<string> {
    logger.debug(`Executing VoiceCommandExecutorTool with params: ${JSON.stringify(params)}`);
    try {
      const validatedParams = this.validateParams(params) as VoiceCommandExecutorParams;
      return await executeVoiceCommandExecutorLogic(validatedParams);
    } catch (error) {
      logger.error(`Error in VoiceCommandExecutorTool: ${String(error)}`);
      throw error;
    }
  }
}
