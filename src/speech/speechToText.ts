import { spawn } from "child_process";
import { EventEmitter } from "events";
import { watch } from "fs";
import path from "path";
import { ISpeechToText, SpeechToTextConfig } from "./types.js";

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

  constructor(config: SpeechToTextConfig) {
    super();
    this.containerName = config.containerName || "fast-whisper";
    this.modelPath = config.modelPath;
    this.modelType = config.modelType;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      // Initialization logic will be implemented here
      await this.setupContainer();
      this.isInitialized = true;
      this.emit("ready");
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    try {
      // Cleanup logic will be implemented here
      await this.cleanupContainer();
      this.isInitialized = false;
      this.emit("shutdown");
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  public async transcribe(audioData: Buffer): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("Speech-to-text service is not initialized");
    }
    try {
      // Transcription logic will be implemented here
      this.emit("transcribing");
      const result = await this.processAudio(audioData);
      this.emit("transcribed", result);
      return result;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  private async setupContainer(): Promise<void> {
    // Container setup logic will be implemented here
    await new Promise((resolve) => setTimeout(resolve, 100)); // Placeholder
  }

  private async cleanupContainer(): Promise<void> {
    // Container cleanup logic will be implemented here
    await new Promise((resolve) => setTimeout(resolve, 100)); // Placeholder
  }

  private async processAudio(audioData: Buffer): Promise<string> {
    // Audio processing logic will be implemented here
    await new Promise((resolve) => setTimeout(resolve, 100)); // Placeholder
    return "Transcription placeholder";
  }

  startWakeWordDetection(audioDir: string = "./audio"): void {
    // Watch for new audio files from wake word detection
    this.audioWatcher = watch(audioDir, (eventType, filename) => {
      if (
        eventType === "rename" &&
        filename &&
        filename.startsWith("wake_word_") &&
        filename.endsWith(".wav")
      ) {
        const audioFile = path.join(audioDir, filename);
        const metadataFile = `${audioFile}.json`;
        const parts = filename.split("_");
        const timestamp = parts[parts.length - 1].split(".")[0];

        // Emit wake word event
        this.emit("wake_word", {
          timestamp,
          audioFile,
          metadataFile,
        } as WakeWordEvent);

        // Automatically transcribe the wake word audio
        this.transcribeAudio(audioFile)
          .then((result) => {
            this.emit("transcription", { audioFile, result });
          })
          .catch((error) => {
            this.emit("error", error);
          });
      }
    });
  }

  stopWakeWordDetection(): void {
    if (this.audioWatcher) {
      this.audioWatcher.close();
      this.audioWatcher = undefined;
    }
  }

  async transcribeAudio(
    audioFilePath: string,
    options: TranscriptionOptions = {},
  ): Promise<TranscriptionResult> {
    const {
      model = "base.en",
      language = "en",
      temperature = 0,
      beamSize = 5,
      patience = 1,
      device = "cpu",
    } = options;

    return new Promise((resolve, reject) => {
      const args = [
        "exec",
        this.containerName,
        "fast-whisper",
        "--model",
        model,
        "--language",
        language,
        "--temperature",
        temperature.toString(),
        "--beam-size",
        beamSize.toString(),
        "--patience",
        patience.toString(),
        "--device",
        device,
        "--output-json",
        audioFilePath,
      ];

      let process;
      try {
        process = spawn("docker", args);
      } catch (error) {
        this.emit("progress", { type: "stderr", data: "Failed to start Docker process" });
        reject(new TranscriptionError("Failed to start Docker process"));
        return;
      }

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
        this.emit("progress", { type: "stdout", data: data.toString() });
      });

      process.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
        this.emit("progress", { type: "stderr", data: data.toString() });
      });

      process.on("error", (error: Error) => {
        this.emit("progress", { type: "stderr", data: error.message });
        reject(new TranscriptionError(`Failed to execute Docker command: ${error.message}`));
      });

      process.on("close", (code: number) => {
        if (code !== 0) {
          reject(new TranscriptionError(`Transcription failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout) as TranscriptionResult;
          resolve(result);
        } catch (error: unknown) {
          if (error instanceof Error) {
            reject(
              new TranscriptionError(`Failed to parse transcription result: ${error.message}`),
            );
          } else {
            reject(new TranscriptionError("Failed to parse transcription result: Unknown error"));
          }
        }
      });
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const process = spawn("docker", [
        "ps",
        "--filter",
        `name=${this.containerName}`,
        "--format",
        "{{.Status}}",
      ]);

      return new Promise((resolve) => {
        let output = "";
        process.stdout?.on("data", (data: Buffer) => {
          output += data.toString();
        });

        process.on("error", () => {
          resolve(false);
        });

        process.on("close", (code: number) => {
          resolve(code === 0 && output.toLowerCase().includes("up"));
        });
      });
    } catch (error) {
      return false;
    }
  }
}
