import { APP_CONFIG } from "../config/app.config.ts";
import { logger } from "../utils/logger.js";
import type { IWakeWordDetector, ISpeechToText } from "./types.js";

class SpeechService {
  private static instance: SpeechService | null = null;
  private isInitialized: boolean = false;
  private wakeWordDetector: IWakeWordDetector | null = null;
  private speechToText: ISpeechToText | null = null;

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
      }

      this.isInitialized = true;
      logger.info("Speech service initialized successfully");
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
}

export const speechService = SpeechService.getInstance();
