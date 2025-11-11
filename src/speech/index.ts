import { APP_CONFIG } from "../config/app.config.ts";
import { logger } from "../utils/logger.js";
import type { IWakeWordDetector, ISpeechToText } from "./types.js";
import { voiceSessionManager } from "./voiceSessionManager.js";
import { EventEmitter } from "events";

class SpeechService {
  private static instance: SpeechService | null = null;
  private isInitialized: boolean = false;
  private wakeWordDetector: IWakeWordDetector | null = null;
  private speechToText: ISpeechToText | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();

  private constructor() {}

  public static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!APP_CONFIG.SPEECH.ENABLED) {
      logger.info("Speech features are disabled. Skipping initialization.");
      return;
    }

    try {
      // Initialize components based on configuration
      if (APP_CONFIG.SPEECH.WAKE_WORD_ENABLED) {
        logger.info("Initializing wake word detection...");
        // Dynamic import to avoid loading the module if not needed
        const { WakeWordDetector } = await import("./wakeWordDetector.js");
        this.wakeWordDetector = new WakeWordDetector() as IWakeWordDetector;
        await this.wakeWordDetector.initialize();

        // Wire wake word events
        if (this.wakeWordDetector instanceof EventEmitter) {
          this.wakeWordDetector.on("wake_word_detected", (event) => {
            logger.info("Wake word detected, starting new voice session");
            voiceSessionManager.startSession();
            this.eventEmitter.emit("wake_word_detected", event);
          });
        }
      }

      if (APP_CONFIG.SPEECH.SPEECH_TO_TEXT_ENABLED) {
        logger.info("Initializing speech-to-text...");
        // Dynamic import to avoid loading the module if not needed
        const { SpeechToText } = await import("./speechToText.js");
        this.speechToText = new SpeechToText({
          modelPath: APP_CONFIG.SPEECH.WHISPER_MODEL_PATH,
          modelType: APP_CONFIG.SPEECH.WHISPER_MODEL_TYPE,
        }) as ISpeechToText;
        await this.speechToText.initialize();

        // Wire speech-to-text events
        if (this.speechToText instanceof EventEmitter) {
          this.speechToText.on("transcribed", (result: { text: string }) => {
            logger.info("Voice transcription completed", { text: result.text });
            const session = voiceSessionManager.getCurrentSession();
            if (session) {
              voiceSessionManager.updateContext(session.id, {
                recentEntities: this.extractEntitiesFromTranscription(result.text),
              });
            }
            this.eventEmitter.emit("transcription_complete", {
              transcription: result.text,
              sessionId: session?.id,
            });
          });

          this.speechToText.on("transcribing", () => {
            this.eventEmitter.emit("transcription_start");
          });

          this.speechToText.on("error", (error) => {
            logger.error("Speech-to-text error:", error);
            this.eventEmitter.emit("speech_error", error);
          });
        }
      }

      this.isInitialized = true;
      logger.info("Speech service initialized successfully");
      this.eventEmitter.emit("service_initialized");
    } catch (error) {
      logger.error("Failed to initialize speech service:", error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      if (this.wakeWordDetector) {
        await this.wakeWordDetector.shutdown();
        this.wakeWordDetector = null;
      }

      if (this.speechToText) {
        await this.speechToText.shutdown();
        this.speechToText = null;
      }

      this.isInitialized = false;
      logger.info("Speech service shut down successfully");
    } catch (error) {
      logger.error("Error during speech service shutdown:", error);
      throw error;
    }
  }

  public isEnabled(): boolean {
    return APP_CONFIG.SPEECH.ENABLED;
  }

  public isWakeWordEnabled(): boolean {
    return APP_CONFIG.SPEECH.WAKE_WORD_ENABLED;
  }

  public isSpeechToTextEnabled(): boolean {
    return APP_CONFIG.SPEECH.SPEECH_TO_TEXT_ENABLED;
  }

  public getWakeWordDetector(): IWakeWordDetector {
    if (!this.isInitialized || !this.wakeWordDetector) {
      throw new Error("Wake word detector is not initialized");
    }
    return this.wakeWordDetector;
  }

  public getSpeechToText(): ISpeechToText {
    if (!this.isInitialized || !this.speechToText) {
      throw new Error("Speech-to-text is not initialized");
    }
    return this.speechToText;
  }

  /**
   * Extract entity names from transcription for session context
   */
  private extractEntitiesFromTranscription(text: string): string[] {
    const commonEntities = [
      "light",
      "lights",
      "lamp",
      "fan",
      "ac",
      "thermostat",
      "lock",
      "door",
      "blind",
      "blinds",
      "curtain",
      "curtains",
      "bedroom",
      "living room",
      "kitchen",
      "bathroom",
      "garage",
      "office",
    ];

    const entities: Set<string> = new Set();
    const lowerText = text.toLowerCase();

    for (const entity of commonEntities) {
      if (lowerText.includes(entity)) {
        entities.add(entity);
      }
    }

    return Array.from(entities);
  }

  /**
   * Get event emitter for listening to speech events
   */
  public getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }
}

export const speechService = SpeechService.getInstance();
