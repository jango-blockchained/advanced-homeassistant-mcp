/**
 * Text-to-Speech (TTS) Service
 *
 * Integrates with Home Assistant TTS services to generate and play audio feedback
 * Supports multiple TTS providers (Google, Microsoft, OpenAI, etc.)
 */

import { EventEmitter } from "events";
import { logger } from "../utils/logger.js";
import { APP_CONFIG } from "../config/app.config.js";

export interface TextToSpeechConfig {
  hassHost: string;
  hassToken: string;
  language: string;
  provider?: string; // TTS provider (google_translate, microsoft_tts, openai_tts, etc.)
  cache?: boolean;
}

export interface TTSFeedback {
  text: string;
  language?: string;
  provider?: string;
  mediaPlayerId?: string; // Optional entity_id of media player to play audio on
}

export interface TTSResponse {
  url: string;
  mediaContentId: string;
  mediaContentType: string;
}

/**
 * TextToSpeech Service
 * Manages text-to-speech generation and playback via Home Assistant
 */
export class TextToSpeech extends EventEmitter {
  private config: TextToSpeechConfig;
  private cache: Map<string, TTSResponse> = new Map();
  private isInitialized: boolean = false;

  constructor(config: TextToSpeechConfig) {
    super();
    this.config = {
      cache: true,
      ...config,
    };
  }

  /**
   * Initialize the TTS service
   */
  async initialize(): Promise<void> {
    try {
      // Validate Home Assistant connection
      const response = await fetch(`${this.config.hassHost}/api/`, {
        headers: {
          Authorization: `Bearer ${this.config.hassToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to connect to Home Assistant: ${response.statusText}`);
      }

      this.isInitialized = true;
      logger.info("TextToSpeech service initialized", { language: this.config.language });
      this.emit("initialized");
    } catch (error) {
      logger.error("Failed to initialize TextToSpeech service:", error);
      throw error;
    }
  }

  /**
   * Generate TTS audio and return URL
   * Caches results to avoid redundant API calls
   */
  async generateSpeech(feedback: TTSFeedback): Promise<TTSResponse> {
    if (!this.isInitialized) {
      throw new Error("TextToSpeech service not initialized");
    }

    const language = feedback.language ?? this.config.language;
    const provider = feedback.provider ?? this.config.provider ?? "google_translate";
    const cacheKey = `${provider}_${language}_${feedback.text}`;

    // Check cache first
    if ((this.config.cache ?? true) && this.cache.has(cacheKey)) {
      logger.debug("TTS cache hit for:", { text: feedback.text, language });
      return this.cache.get(cacheKey)!;
    }

    try {
      logger.debug("Generating TTS", { text: feedback.text, language, provider });

      const payload = {
        engine: provider,
        language,
        message: feedback.text,
      };

      const response = await fetch(`${this.config.hassHost}/api/tts_get_url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.hassToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`TTS generation failed: ${response.statusText}`);
      }

      const data = (await response.json()) as { url: string };
      const result: TTSResponse = {
        url: data.url,
        mediaContentId: data.url,
        mediaContentType: "audio/mpeg",
      };

      // Cache the result
      if (this.config.cache ?? true) {
        this.cache.set(cacheKey, result);
      }

      this.emit("speech_generated", { text: feedback.text, language, url: result.url });
      return result;
    } catch (error) {
      logger.error("Error generating TTS:", error);
      this.emit("speech_error", { text: feedback.text, language, error });
      throw error;
    }
  }

  /**
   * Play audio via media player
   */
  async playAudio(ttsResponse: TTSResponse, mediaPlayerId?: string): Promise<void> {
    if (!isInitialized) {
      throw new Error("TextToSpeech service not initialized");
    }

    try {
      const entityId = mediaPlayerId ?? "media_player.living_room"; // Default player

      logger.debug("Playing audio on media player", { entityId, url: ttsResponse.url });

      const response = await fetch(`${this.config.hassHost}/api/services/media_player/play_media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.hassToken}`,
        },
        body: JSON.stringify({
          entity_id: entityId,
          media_content_id: ttsResponse.mediaContentId,
          media_content_type: ttsResponse.mediaContentType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to play audio: ${response.statusText}`);
      }

      logger.info("Audio playback initiated", { entityId });
      this.emit("audio_playing", { entityId, url: ttsResponse.url });
    } catch (error) {
      logger.error("Error playing audio:", error);
      this.emit("playback_error", { error });
      throw error;
    }
  }

  /**
   * Generate and play TTS response in one operation
   */
  async speak(feedback: TTSFeedback): Promise<void> {
    const ttsResponse = await this.generateSpeech(feedback);
    await this.playAudio(ttsResponse, feedback.mediaPlayerId);
  }

  /**
   * Set language preference
   */
  setLanguage(language: string): void {
    this.config.language = language;
    logger.info("TTS language set to:", language);
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.config.language;
  }

  /**
   * Get available TTS providers from Home Assistant
   */
  async getAvailableProviders(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error("TextToSpeech service not initialized");
    }

    try {
      const response = await fetch(`${this.config.hassHost}/api/services`, {
        headers: {
          Authorization: `Bearer ${this.config.hassToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }

      const services = (await response.json()) as Array<{ services: Record<string, unknown> }>;
      const ttsServices = services.find((s) => "tts" in s)?.services || {};
      return Object.keys(ttsServices);
    } catch (error) {
      logger.error("Error fetching available TTS providers:", error);
      return ["google_translate"];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info("TTS cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }

  /**
   * Shutdown the service
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async shutdown(): Promise<void> {
    this.cache.clear();
    this.isInitialized = false;
    logger.info("TextToSpeech service shut down");
    this.emit("shutdown");
  }
}

/**
 * Local TTS Service instance (singleton)
 */
let instance: TextToSpeech | null = null;
let isInitialized = false;

export function getTextToSpeechService(): TextToSpeech {
  if (!instance) {
    instance = new TextToSpeech({
      hassHost: APP_CONFIG.HASS_HOST,
      hassToken: APP_CONFIG.HASS_TOKEN ?? "",
      language: "en",
      provider: "google_translate",
      cache: true,
    });
  }
  return instance;
}

/**
 * Initialize the TTS service singleton
 */
export async function initializeTextToSpeech(): Promise<TextToSpeech> {
  const service = getTextToSpeechService();
  if (!isInitialized) {
    await service.initialize();
    isInitialized = true;
  }
  return service;
}
