/**
 * Voice Command Parser Tool for Home Assistant
 *
 * This tool parses natural language transcriptions into structured commands.
 * Uses pattern matching and simple NLP to extract intent, entities, and parameters
 * from voice input. Supports multiple languages.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { MCPContext } from "../../mcp/types.js";
import { BaseTool } from "../base-tool.js";
import { getLanguageService } from "../../speech/languageService.js";

// Define supported intents and patterns
interface CommandPattern {
  intent: string;
  patterns: RegExp[];
  extractParams: (input: string, match: RegExpMatchArray) => Record<string, unknown>;
}

interface ParsedCommand {
  intent: string;
  action: string;
  target?: string;
  entities: string[];
  parameters: Record<string, unknown>;
  confidence: number;
  original_text: string;
}

// Pattern-based command parser
const commandPatterns: CommandPattern[] = [
  {
    intent: "turn_on",
    patterns: [
      /turn\s+(?:on|up)\s+(?:the\s+)?(.+?)(?:\s+(?:to|at|for|on|in))?/i,
      /(?:turn|switch)\s+(.+?)\s+on(?:\s+(?:to|at))?/i,
      /(?:please\s+)?(?:could you\s+)?turn\s+on\s+(?:the\s+)?(.+)/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      entity_name: match[1]?.trim().toLowerCase() || "",
    }),
  },
  {
    intent: "turn_off",
    patterns: [
      /turn\s+(?:off|down)\s+(?:the\s+)?(.+)/i,
      /(?:turn|switch)\s+(.+?)\s+off/i,
      /(?:please\s+)?(?:could you\s+)?turn\s+off\s+(?:the\s+)?(.+)/i,
      /disable\s+(?:the\s+)?(.+)/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      entity_name: match[1]?.trim().toLowerCase() || "",
    }),
  },
  {
    intent: "set_temperature",
    patterns: [
      /(?:set|change|adjust)\s+(?:the\s+)?temperature\s+(?:to|at)\s+(\d+)\s*(?:degrees|°)?(?:\s+(?:in|for|at)\s+(.+))?/i,
      /(?:make it|let it|keep it)\s+(\d+)\s*(?:degrees)?(?:\s+(?:in|for)\s+(.+))?/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      temperature: parseInt(match[1], 10),
      entity_name: (match[2] || "bedroom").trim().toLowerCase(),
    }),
  },
  {
    intent: "set_brightness",
    patterns: [
      /(?:set|adjust|dim)\s+(?:the\s+)?brightness\s+(?:to|at)\s+(\d+)%?(?:\s+(?:in|for|at)\s+(.+))?/i,
      /set\s+(.+?)\s+(?:to|brightness)\s+(\d+)%?/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      brightness: Math.round((parseInt(match[1], 10) / 100) * 255),
      entity_name: match[2]?.trim().toLowerCase() || "",
    }),
  },
  {
    intent: "set_color",
    patterns: [
      /(?:set|change|make)\s+(?:the\s+)?(.+?)\s+(?:to\s+)?(?:the\s+)?(red|blue|green|yellow|white|orange|purple|pink)(?:\s+(?:in|for|at)\s+(.+))?/i,
      /(?:turn|make)\s+(.+?)\s+(red|blue|green|yellow|white|orange|purple|pink)/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray): Record<string, unknown> => {
      const colorMap: Record<string, [number, number, number]> = {
        red: [255, 0, 0],
        blue: [0, 0, 255],
        green: [0, 255, 0],
        yellow: [255, 255, 0],
        white: [255, 255, 255],
        orange: [255, 165, 0],
        purple: [128, 0, 128],
        pink: [255, 192, 203],
      };
      const color = match[2]?.toLowerCase() ?? "white";
      return {
        entity_name: match[1]?.trim().toLowerCase() || "",
        rgb_color: colorMap[color],
        color_name: color,
      };
    },
  },
  {
    intent: "open_cover",
    patterns: [
      /(?:open|raise|lift)\s+(?:the\s+)?(.+?)(?:\s+(?:blind|blinds|curtain|curtains|shade|shades))?(?:\s+(?:in|for|at)\s+(.+))?/i,
      /(?:open)\s+(?:up\s+)?(?:the\s+)?(.+)/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      entity_name: match[1]?.trim().toLowerCase() || "",
    }),
  },
  {
    intent: "close_cover",
    patterns: [
      /(?:close|lower|shut)\s+(?:the\s+)?(.+?)(?:\s+(?:blind|blinds|curtain|curtains|shade|shades))?(?:\s+(?:in|for|at)\s+(.+))?/i,
      /(?:close)\s+(?:down\s+)?(?:the\s+)?(.+)/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      entity_name: match[1]?.trim().toLowerCase() || "",
    }),
  },
  {
    intent: "lock_door",
    patterns: [
      /(?:lock|secure)\s+(?:the\s+)?(.+?)(?:\s+(?:door|doors))?(?:\s+(?:in|for))?/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      entity_name: match[1]?.trim().toLowerCase() || "",
    }),
  },
  {
    intent: "unlock_door",
    patterns: [
      /(?:unlock|open)\s+(?:the\s+)?(.+?)(?:\s+(?:door|doors))?(?:\s+(?:in|for))?/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      entity_name: match[1]?.trim().toLowerCase() || "",
    }),
  },
  {
    intent: "start_vacuum",
    patterns: [
      /(?:start|begin|run|vacuum|clean)\s+(?:the\s+)?(.+?)(?:\s+(?:vacuum|cleaner|robot))?/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      entity_name: match[1]?.trim().toLowerCase() || "vacuum",
    }),
  },
  {
    intent: "send_notification",
    patterns: [
      /(?:notify|send|alert)\s+(?:me|about|with)\s+(.+)/i,
      /(?:tell me|alert me|notify me)\s+(.+)/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      message: match[1]?.trim() || "",
    }),
  },
  {
    intent: "play_media",
    patterns: [
      /(?:play|start|put on)\s+(?:the\s+)?(.+?)(?:\s+(?:music|song|album|playlist|audio))?(?:\s+(?:on|in)\s+(.+))?/i,
    ],
    extractParams: (input: string, match: RegExpMatchArray) => ({
      media: match[1]?.trim() || "",
      entity_name: match[2]?.trim().toLowerCase() || "",
    }),
  },
];

// Define the schema for our tool parameters using Zod
const voiceCommandParserSchema = z.object({
  transcription: z
    .string()
    .min(1)
    .describe("The voice transcription to parse into a command"),
  language: z
    .string()
    .optional()
    .describe("Language code (e.g., 'en', 'de', 'es', 'fr'). Auto-detected if not provided."),
  context: z
    .object({
      room: z.string().optional().describe("The current room context"),
      last_command: z.string().optional().describe("The last executed command"),
      available_entities: z.array(z.string()).optional().describe("List of available Home Assistant entities"),
    })
    .optional()
    .describe("Optional context for better command parsing"),
});

type VoiceCommandParserParams = z.infer<typeof voiceCommandParserSchema>;

/**
 * Parse a voice transcription into a structured command
 */
function executeVoiceCommandParserLogic(
  params: VoiceCommandParserParams,
): Promise<string> {
  const { transcription, language: explicitLanguage, context: _context } = params;

  logger.debug(`Parsing voice transcription: "${transcription}"`, { language: explicitLanguage });

  try {
    const langService = getLanguageService();
    
    // Set language if provided
    if (explicitLanguage !== undefined) {
      langService.setLanguage(langService.normalizeLanguageCode(explicitLanguage));
    } else if (langService.config.detectAutomatic === true) {
      // Auto-detect language
      const detectedLang = langService.detectLanguage(transcription);
      langService.setLanguage(detectedLang);
    }

    const parsedCommand = parseCommand(transcription);

    if (parsedCommand.confidence < 0.3) {
      logger.warn(`Low confidence parsing for: "${transcription}"`, { language: langService.getLanguage() });
      return Promise.resolve(JSON.stringify({
        success: false,
        message: "Could not understand the command. Please try again.",
        original_text: transcription,
        language: langService.getLanguage(),
        parsed: null,
      }));
    }

    logger.info(`Parsed command: ${parsedCommand.intent} with confidence ${parsedCommand.confidence}`, { 
      language: langService.getLanguage(),
    });

    return Promise.resolve(JSON.stringify({
      success: true,
      message: `Understood command: ${parsedCommand.intent}`,
      original_text: transcription,
      language: langService.getLanguage(),
      parsed: parsedCommand,
    }));
  } catch (error) {
    logger.error("Error parsing voice command:", error);
    return Promise.resolve(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Error parsing command",
      original_text: transcription,
      parsed: null,
    }));
  }
}

/**
 * Parse a command from transcription
 */
function parseCommand(transcription: string, _langService?: ReturnType<typeof getLanguageService>): ParsedCommand {
  const trimmed = transcription.trim();
  let bestMatch: {
    pattern: CommandPattern;
    match: RegExpMatchArray;
    confidence: number;
  } | null = null;
  let highestConfidence = 0;

  // Try each pattern
  for (const pattern of commandPatterns) {
    for (const regex of pattern.patterns) {
      const match = trimmed.match(regex);
      if (match) {
        // Calculate confidence based on how well the match fits
        const confidence = Math.min(
          1.0,
          (match[0].length / trimmed.length) * 0.9 + 0.1, // Favor longer matches
        );

        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = { pattern, match, confidence };
        }
      }
    }
  }

  if (!bestMatch) {
    // No pattern matched - try generic extraction
    return {
      intent: "unknown",
      action: "help",
      entities: [],
      parameters: { raw_text: trimmed },
      confidence: 0,
      original_text: trimmed,
    };
  }

  const { pattern, match, confidence } = bestMatch;
  const params = pattern.extractParams(trimmed, match);

  // Extract entities mentioned in the command
  const entities = extractEntities(trimmed, params);

  return {
    intent: pattern.intent,
    action: pattern.intent,
    target: (params.entity_name as string) || undefined,
    entities,
    parameters: params,
    confidence,
    original_text: trimmed,
  };
}

/**
 * Extract entity mentions from command
 */
function extractEntities(text: string, params: Record<string, unknown>): string[] {
  const entities: Set<string> = new Set();

  // Add the main target entity if present
  const entityName = params.entity_name;
  if (typeof entityName === "string") {
    entities.add(entityName);
  }

  // Look for common entity name patterns
  const commonEntities = [
    "bedroom",
    "living room",
    "kitchen",
    "bathroom",
    "hallway",
    "garage",
    "garden",
    "patio",
    "office",
    "front door",
    "back door",
    "garage door",
    "light",
    "lights",
    "lamp",
    "fan",
    "ac",
    "heater",
    "thermostat",
    "lock",
    "vacuum",
    "robot",
    "blinds",
    "curtains",
    "shades",
    "speaker",
    "tv",
  ];

  const lowerText = text.toLowerCase();
  for (const entity of commonEntities) {
    if (lowerText.includes(entity)) {
      entities.add(entity);
    }
  }

  return Array.from(entities);
}

// Export the tool object
export const voiceCommandParserTool: Tool = {
  name: "voice_command_parser",
  description:
    "Parse natural language voice transcriptions into structured Home Assistant commands. Extracts intent, entities, and parameters from voice input.",
  parameters: voiceCommandParserSchema,
  execute: (params: unknown): Promise<unknown> => {
    return executeVoiceCommandParserLogic(params as VoiceCommandParserParams);
  },
};

/**
 * VoiceCommandParserTool class extending BaseTool (for compatibility with src/index.ts)
 */
export class VoiceCommandParserTool extends BaseTool {
  constructor() {
    super({
      name: voiceCommandParserTool.name,
      description: voiceCommandParserTool.description,
      parameters: voiceCommandParserSchema,
      metadata: {
        category: "speech",
        version: "1.0.0",
        tags: ["voice", "speech", "nlp", "command_parsing"],
      },
    });
  }

  /**
   * Execute method for the BaseTool class
   */
  public async execute(params: VoiceCommandParserParams, _context: MCPContext): Promise<string> {
    logger.debug(`Executing VoiceCommandParserTool with params: ${JSON.stringify(params)}`);
    try {
      const validatedParams = this.validateParams(params) as VoiceCommandParserParams;
      return await executeVoiceCommandParserLogic(validatedParams);
    } catch (error) {
      logger.error(`Error in VoiceCommandParserTool: ${String(error)}`);
      throw error;
    }
  }
}
