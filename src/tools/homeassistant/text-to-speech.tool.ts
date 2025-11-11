/**
 * Text-to-Speech Tool for Home Assistant MCP
 *
 * Provides TTS functionality to MCP clients
 * Allows generating and playing voice feedback for user commands
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { MCPContext } from "../../mcp/types.js";
import { BaseTool } from "../base-tool.js";
import { initializeTextToSpeech, type TextToSpeech } from "../../speech/textToSpeech.js";

// Define the schema for TTS parameters
const textToSpeechSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(5000)
    .describe("The text to convert to speech"),
  language: z
    .string()
    .optional()
    .describe("Language code (e.g., 'en', 'de', 'es', 'fr'). Defaults to service language setting."),
  provider: z
    .string()
    .optional()
    .describe("TTS provider (e.g., 'google_translate', 'microsoft_tts', 'openai_tts'). If not specified, uses default."),
  media_player_id: z
    .string()
    .optional()
    .describe("Optional entity_id of media player to play audio on (e.g., 'media_player.living_room')"),
  cache: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to cache generated audio (default: true)"),
  action: z
    .enum(["generate", "play", "speak", "get_providers", "get_cache_stats"])
    .optional()
    .default("speak")
    .describe("Action to perform: 'generate' (generate URL only), 'play' (play previous), 'speak' (generate and play)"),
});

type TextToSpeechParams = z.infer<typeof textToSpeechSchema>;

/**
 * Execute TTS logic
 */
async function executeTextToSpeechLogic(
  params: TextToSpeechParams,
  _context?: MCPContext,
): Promise<string> {
  const { text, language, provider, media_player_id, action } = params;

  logger.debug(`TextToSpeech action: ${action}`, { text: text.substring(0, 50), language });

  try {
    const ttsService = await initializeTextToSpeech();

    switch (action) {
      case "generate": {
        const ttsResponse = await ttsService.generateSpeech({
          text,
          language,
          provider,
        });

        return JSON.stringify({
          success: true,
          action: "generate",
          url: ttsResponse.url,
          mediaContentId: ttsResponse.mediaContentId,
          mediaContentType: ttsResponse.mediaContentType,
          message: "Audio generated successfully",
        });
      }

      case "play": {
        if (!text) {
          throw new Error("Text is required for play action");
        }
        const ttsResponse = await ttsService.generateSpeech({
          text,
          language,
          provider,
        });
        await ttsService.playAudio(ttsResponse, media_player_id);

        return JSON.stringify({
          success: true,
          action: "play",
          message: "Audio playback initiated",
          mediaPlayer: media_player_id ?? "media_player.living_room",
        });
      }

      case "speak": {
        await ttsService.speak({
          text,
          language,
          provider,
          mediaPlayerId: media_player_id,
        });

        return JSON.stringify({
          success: true,
          action: "speak",
          message: "Speech generated and playback initiated",
          text: text.substring(0, 100),
          language,
        });
      }

      case "get_providers": {
        const providers = await ttsService.getAvailableProviders();

        return JSON.stringify({
          success: true,
          action: "get_providers",
          providers,
          message: `Found ${providers.length} available TTS providers`,
        });
      }

      case "get_cache_stats": {
        const stats = ttsService.getCacheStats();

        return JSON.stringify({
          success: true,
          action: "get_cache_stats",
          cacheSize: stats.size,
          cacheEntries: stats.entries,
          message: "Cache statistics retrieved",
        });
      }

      // eslint-disable-next-line no-fallthrough
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  } catch (error) {
    logger.error("Error in TextToSpeech:", error);

    return JSON.stringify({
      success: false,
      action,
      message: error instanceof Error ? error.message : "Unknown error in TextToSpeech",
      text,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * TextToSpeechTool for MCP
 */
export const textToSpeechTool: Tool = {
  name: "text_to_speech",
  description:
    "Generate and play text-to-speech audio via Home Assistant. Provides voice feedback for commands with support for multiple languages and TTS providers.",
  parameters: textToSpeechSchema,
  execute: (params: unknown): Promise<unknown> => {
    return executeTextToSpeechLogic(params as TextToSpeechParams);
  },
};

/**
 * TextToSpeechTool class for compatibility with BaseTool
 */
export class TextToSpeechTool extends BaseTool {
  private ttsService: TextToSpeech | null = null;

  constructor() {
    super({
      name: textToSpeechTool.name,
      description: textToSpeechTool.description,
      parameters: textToSpeechSchema,
      metadata: {
        category: "speech",
        version: "1.0.0",
        tags: ["voice", "tts", "audio", "feedback", "speech"],
      },
    });
  }

  /**
   * Initialize the tool
   */
  public async initialize(): Promise<void> {
    try {
      this.ttsService = await initializeTextToSpeech();
      logger.info("TextToSpeechTool initialized");
    } catch (error) {
      logger.error("Failed to initialize TextToSpeechTool:", error);
      throw error;
    }
  }

  /**
   * Execute method for BaseTool class
   */
  public async execute(params: TextToSpeechParams, context?: MCPContext): Promise<string> {
    logger.debug(`Executing TextToSpeechTool with params:`, { action: params.action });
    try {
      const validatedParams = this.validateParams(params) as TextToSpeechParams;
      return await executeTextToSpeechLogic(validatedParams, context);
    } catch (error) {
      logger.error(`Error in TextToSpeechTool: ${String(error)}`);
      throw error;
    }
  }
}
