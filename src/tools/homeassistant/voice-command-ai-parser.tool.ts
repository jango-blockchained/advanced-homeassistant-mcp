/**
 * AI Voice Command Parser (Optional Enhancement)
 *
 * This tool provides AI-powered parsing of voice commands using Claude.
 * It understands complex phrasing, context, and ambiguous requests.
 * Falls back to pattern matching if Claude is not available.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { MCPContext } from "../../mcp/types.js";
import { BaseTool } from "../base-tool.js";

interface _AIParsedCommand {
  intent: string;
  action: string;
  target?: string;
  entities: string[];
  parameters: Record<string, unknown>;
  confidence: number;
  original_text: string;
  reasoning: string; // Why Claude parsed it this way
}

interface ClaudeResponse {
  intent: string;
  action: string;
  target?: string;
  entities: string[];
  parameters: Record<string, unknown>;
  reasoning: string;
}

// Define the schema for our tool parameters using Zod
const voiceCommandAIParserSchema = z.object({
  transcription: z
    .string()
    .min(1)
    .describe("The voice transcription to parse into a command"),
  context: z
    .object({
      room: z.string().optional().describe("The current room context"),
      last_commands: z.array(z.string()).optional().describe("Recent command history"),
      available_entities: z.array(z.string()).optional().describe("List of available Home Assistant entities"),
    })
    .optional()
    .describe("Optional context for better command parsing"),
  use_ai: z.boolean().optional().default(true).describe("Whether to use Claude AI parsing"),
});

type VoiceCommandAIParserParams = z.infer<typeof voiceCommandAIParserSchema>;

/**
 * Check if Claude API is available
 */
function isClaudeAvailable(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return typeof apiKey === "string" && apiKey.length > 0;
}

/**
 * Call Claude API to parse voice command
 */
async function parseWithClaude(
  transcription: string,
  context?: Record<string, unknown>,
): Promise<ClaudeResponse | null> {
  if (!isClaudeAvailable()) {
    logger.debug("Claude API not available, will use pattern matching");
    return null;
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      return null;
    }

    const systemPrompt = `You are an expert Home Assistant voice command parser.
Parse voice commands into structured actions for controlling smart home devices.

Respond with ONLY a JSON object (no markdown, no extra text) with this exact structure:
{
  "intent": "turn_on" | "turn_off" | "set_temperature" | "set_brightness" | "set_color" | "open_cover" | "close_cover" | "lock_door" | "unlock_door" | "start_vacuum" | "stop_vacuum" | "send_notification" | "unknown",
  "action": "the specific action to perform",
  "target": "the device/entity name or null",
  "entities": ["list", "of", "entity", "names"],
  "parameters": { "key": "value", "pairs": "as needed" },
  "reasoning": "brief explanation of how you parsed this command"
}

Common entity types: light, lights, lamp, fan, ac, heater, thermostat, lock, door, vacuum, blinds, curtains, shades, speaker, tv, bedroom, living room, kitchen, bathroom, garage, etc.

Handle variations like:
- "turn on the light" → turn_on, light
- "make it warmer" → set_temperature (requires context)
- "close the blinds" → close_cover, blinds
- "what's the time?" → unknown (not a control command)
- "set bedroom light to 50%" → set_brightness, bedroom light, brightness: 128`;

    const contextRoom = typeof context?.room === "string" ? context.room : "";
    const contextEntities = Array.isArray(context?.available_entities)
      ? (context.available_entities as string[])
      : [];

    const userPrompt = `Parse this voice command: "${transcription}"
${contextRoom ? `Current room: ${contextRoom}` : ""}
${contextEntities.length > 0 ? `Available entities: ${contextEntities.join(", ")}` : ""}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.warn(`Claude API error: ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const content = data.content[0];
    if (content.type !== "text") {
      logger.warn("Unexpected Claude response format");
      return null;
    }

    // Parse Claude's JSON response
    const parsed = JSON.parse(content.text) as ClaudeResponse;
    logger.debug("Claude parsed command:", parsed);
    return parsed;
  } catch (error) {
    logger.warn("Error calling Claude API, falling back to pattern matching:", error);
    return null;
  }
}

/**
 * Execute AI voice command parsing
 */
function executeVoiceCommandAIParserLogic(
  params: VoiceCommandAIParserParams,
): Promise<string> {
  const { transcription, context, use_ai } = params;

  logger.debug(`Parsing voice transcription with AI: "${transcription}"`);

  return parseWithClaudeIfAvailable(transcription, context, use_ai ?? true)
    .then((result) => {
      logger.info(`AI parsing result: ${result.success ? "success" : "fallback to patterns"}`);
      return JSON.stringify(result);
    })
    .catch((error) => {
      logger.error("Error in AI voice command parsing:", error);
      return JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Error parsing command",
        original_text: transcription,
        parsed: null,
      });
    });
}

/**
 * Parse with Claude if available, otherwise note that AI parsing wasn't used
 */
async function parseWithClaudeIfAvailable(
  transcription: string,
  context?: Record<string, unknown>,
  useAI?: boolean,
): Promise<{
  success: boolean;
  message: string;
  original_text: string;
  parsed: AIParseCommandResult | null;
  method: "claude" | "unavailable";
}> {
  const effectiveUseAI = useAI ?? true;
  if (!effectiveUseAI || !isClaudeAvailable()) {
    return {
      success: false,
      message: "AI parsing not available or disabled. Use voice_command_parser tool for pattern-based parsing.",
      original_text: transcription,
      parsed: null,
      method: "unavailable",
    };
  }

  const claudeResponse = await parseWithClaude(transcription, context);

  if (!claudeResponse) {
    return {
      success: false,
      message: "Claude API call failed. Use voice_command_parser tool for pattern-based parsing.",
      original_text: transcription,
      parsed: null,
      method: "unavailable",
    };
  }

  // Transform Claude response to our format
  const parsed: AIParseCommandResult = {
    intent: claudeResponse.intent,
    action: claudeResponse.action,
    target: claudeResponse.target,
    entities: claudeResponse.entities,
    parameters: claudeResponse.parameters,
    confidence: 0.9, // Claude has high confidence by default
    original_text: transcription,
    reasoning: claudeResponse.reasoning,
  };

  return {
    success: true,
    message: `Successfully parsed command via Claude: ${parsed.intent}`,
    original_text: transcription,
    parsed,
    method: "claude",
  };
}

interface AIParseCommandResult {
  intent: string;
  action: string;
  target?: string;
  entities: string[];
  parameters: Record<string, unknown>;
  confidence: number;
  original_text: string;
  reasoning: string;
}

// Export the tool object
export const voiceCommandAIParserTool: Tool = {
  name: "voice_command_ai_parser",
  description:
    "Parse voice commands using AI (Claude). Better understanding of natural language, context, and complex phrasing. Falls back gracefully if AI not available.",
  annotations: {
    title: "AI Voice Parser",
    description: "Use Claude AI for advanced natural language understanding of voice commands",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: voiceCommandAIParserSchema,
  execute: (params: unknown): Promise<unknown> => {
    return executeVoiceCommandAIParserLogic(params as VoiceCommandAIParserParams);
  },
};

/**
 * VoiceCommandAIParserTool class extending BaseTool (for compatibility)
 */
export class VoiceCommandAIParserTool extends BaseTool {
  constructor() {
    super({
      name: voiceCommandAIParserTool.name,
      description: voiceCommandAIParserTool.description,
      parameters: voiceCommandAIParserSchema,
      metadata: {
        category: "speech",
        version: "1.0.0",
        tags: ["voice", "speech", "ai", "nlp", "claude", "command_parsing"],
      },
    });
  }

  /**
   * Execute method for the BaseTool class
   */
  public async execute(params: VoiceCommandAIParserParams, _context: MCPContext): Promise<string> {
    logger.debug(`Executing VoiceCommandAIParserTool with params: ${JSON.stringify(params)}`);
    try {
      const validatedParams = this.validateParams(params) as VoiceCommandAIParserParams;
      return await executeVoiceCommandAIParserLogic(validatedParams);
    } catch (error) {
      logger.error(`Error in VoiceCommandAIParserTool: ${String(error)}`);
      throw error;
    }
  }
}
