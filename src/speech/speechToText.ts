import { spawn } from "child_process";
import { EventEmitter } from "events";
import { watch } from "fs";
import path from "path";
import { ISpeechToText, SpeechToTextConfig } from "./types.js";
import { logger } from "../utils/logger.js";

export interface TranscriptionOptions {
  model?: "tiny.en" | "base.en" | "small.en" | "medium.en" | "large-v2";
  language?: string;
  temperature?: number;
  beamSize?: number;
  patience?: number;
  device?: "cpu" | "cuda";
}

export interface TranscriptionResult {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface WakeWordEvent {
  timestamp: string;
  audioFile: string;
  metadataFile: string;
}

export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export class SpeechToText extends EventEmitter implements ISpeechToText {
  private containerName: string;
  private audioWatcher?: ReturnType<typeof watch>;
  private modelPath: string;
  private modelType: string;
  private isInitialized: boolean = false;
  private whisperHost: string;
  private whisperPort: number;

  constructor(config: SpeechToTextConfig) {
    super();
    this.containerName = config.containerName ?? "fast-whisper";
    this.modelPath = config.modelPath;
    this.modelType = config.modelType;
    this.whisperHost = process.env.WHISPER_HOST ?? "localhost";
    this.whisperPort = parseInt(process.env.WHISPER_PORT ?? "9000", 10);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      await this.setupContainer();
      this.isInitialized = true;
      this.emit("ready");
      logger.info("Speech-to-text service initialized successfully");
    } catch (error) {
      this.emit("error", error);
      logger.error("Failed to initialize speech-to-text:", error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    try {
      await this.cleanupContainer();
      this.isInitialized = false;
      this.emit("shutdown");
      logger.info("Speech-to-text service shut down");
    } catch (error) {
      this.emit("error", error);
      logger.error("Error during speech-to-text shutdown:", error);
      throw error;
    }
  }

  public async transcribe(audioData: Buffer): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("Speech-to-text service is not initialized");
    }
    try {
      this.emit("transcribing");
      const result = await this.processAudio(audioData);
      this.emit("transcribed", result);
      return result;
    } catch (error) {
      this.emit("error", error);
      logger.error("Transcription error:", error);
      throw error;
    }
  }

  private async setupContainer(): Promise<void> {
    try {
      // Test connection to Fast-Whisper service
      const response = await fetch(
        `http://${this.whisperHost}:${this.whisperPort}/health`,
        { timeout: 5000 }
      );
      if (!response.ok) {
        throw new Error(
          `Fast-Whisper service responded with ${response.status}`
        );
      }
      logger.info(
        `Connected to Fast-Whisper at ${this.whisperHost}:${this.whisperPort}`
      );
    } catch (error) {
      logger.warn("Fast-Whisper service not available yet:", error);
      // Don't fail initialization if Fast-Whisper is not available yet
    }
  }

  private async cleanupContainer(): Promise<void> {
    if (this.audioWatcher) {
      this.audioWatcher.close();
    }
    // Additional cleanup if needed
    await Promise.resolve();
  }

  private async processAudio(audioData: Buffer): Promise<string> {
    try {
      const formData = new FormData();
      const arrayBuffer = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength
      );
      const blob = new Blob([new Uint8Array(arrayBuffer as ArrayBuffer)], {
        type: "audio/wav",
      });
      formData.append("file", blob, "audio.wav");

      const response = await fetch(
        `http://${this.whisperHost}:${this.whisperPort}/asr?language=en&task=transcribe`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new TranscriptionError(
          `Fast-Whisper API returned ${response.status}`
        );
      }

      const result = (await response.json()) as {
        result?: {
          text?: string;
        };
        text?: string;
      };
      const text = result.result?.text ?? result.text ?? "";

      if (!text) {
        logger.warn("Empty transcription result from Fast-Whisper");
      }

      logger.info(`Transcribed: "${text}"`);
      return text;
    } catch (error) {
      logger.error("Audio processing error:", error);
      throw new TranscriptionError(
        `Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  startWakeWordDetection(audioDir: string = "./audio"): void {
    // Watch for new audio files from wake word detection
    this.audioWatcher = watch(audioDir, (eventType, filename) => {
      if (
        eventType === "change" &&
        filename != null &&
        filename.startsWith("wake_word_") &&
        filename.endsWith(".wav")
      ) {
        logger.info(`Wake word audio detected: ${filename}`);

        // Emit wake word event
        this.emit("wake_word", {
          timestamp: new Date().toISOString(),
          audioFile: path.join(audioDir, filename),
          metadataFile: path.join(
            audioDir,
            filename.replace(".wav", ".json")
          ),
        } as WakeWordEvent);

        // Automatically transcribe the wake word audio
        try {
          const audioPath = path.join(audioDir, filename);
          logger.info(`Transcribing wake word audio: ${audioPath}`);
        } catch (error) {
          logger.error(
            `Error transcribing wake word audio: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    });
  }

  stopWakeWordDetection(): void {
    if (this.audioWatcher) {
      this.audioWatcher.close();
      this.audioWatcher = undefined;
    }
  }
}
