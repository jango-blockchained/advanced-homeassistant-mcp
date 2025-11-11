import { IWakeWordDetector } from "./types.js";
import { logger } from "../utils/logger.js";
import { spawn } from "child_process";
import { EventEmitter } from "events";

export class WakeWordDetector extends EventEmitter implements IWakeWordDetector {
  private isListening: boolean = false;
  private isInitialized: boolean = false;
  private wyomingHost: string;
  private wyomingPort: number;

  constructor(host: string = "localhost", port: number = 10400) {
    super();
    this.wyomingHost = host;
    this.wyomingPort = port;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      await this.setupDetector();
      this.isInitialized = true;
      logger.info("Wake word detector initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize wake word detector:", error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (this.isListening) {
      await this.stopListening();
    }
    if (this.isInitialized) {
      await this.cleanupDetector();
      this.isInitialized = false;
      logger.info("Wake word detector shut down");
    }
  }

  public async startListening(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Wake word detector is not initialized");
    }
    if (this.isListening) {
      return;
    }
    try {
      await this.startDetection();
      this.isListening = true;
      logger.info("Wake word detection started");
    } catch (error) {
      logger.error("Failed to start wake word detection:", error);
      throw error;
    }
  }

  public async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }
    try {
      await this.stopDetection();
      this.isListening = false;
      logger.info("Wake word detection stopped");
    } catch (error) {
      logger.error("Failed to stop wake word detection:", error);
      throw error;
    }
  }

  private async setupDetector(): Promise<void> {
    try {
      // Test connection to Wyoming openwakeword service
      const response = await fetch(
        `http://${this.wyomingHost}:${this.wyomingPort}/status`,
        { timeout: 5000 }
      );
      if (!response.ok) {
        throw new Error(
          `Wyoming wake word service responded with ${response.status}`
        );
      }
      logger.info(
        `Connected to Wyoming openwakeword at ${this.wyomingHost}:${this.wyomingPort}`
      );
    } catch (error) {
      logger.warn("Wyoming service not available, continuing anyway:", error);
      // Don't fail initialization if Wyoming is not available yet
    }
  }

  private async cleanupDetector(): Promise<void> {
    // Cleanup any resources if needed
  }

  private startDetection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Start ffmpeg to capture audio and stream to Wyoming service
        const ffmpeg = spawn("ffmpeg", [
          "-f",
          "alsa",
          "-i",
          "default",
          "-acodec",
          "pcm_s16le",
          "-ar",
          "16000",
          "-ac",
          "1",
          "-f",
          "s16le",
          "pipe:1",
        ]);

        ffmpeg.stdout?.on("data", (chunk: Buffer) => {
          void this.processAudioChunk(chunk);
        });

        ffmpeg.stderr?.on("data", (data) => {
          logger.debug(`FFmpeg: ${data}`);
        });

        ffmpeg.on("error", (error) => {
          logger.error("FFmpeg error:", error);
          reject(error);
        });

        logger.info("Audio capture started for wake word detection");
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private stopDetection(): Promise<void> {
    return new Promise((resolve) => {
      // Kill ffmpeg process if running
      try {
        spawn("killall", ["ffmpeg"]);
        setTimeout(resolve, 100);
      } catch {
        resolve();
      }
    });
  }

  private async processAudioChunk(chunk: Buffer): Promise<void> {
    try {
      // Send audio chunk to Wyoming service via TCP
      const net = await import("net");
      const socket = net.createConnection(this.wyomingPort, this.wyomingHost);

      socket.on("connect", () => {
        socket.write(chunk);
        socket.end();
      });

      socket.on("data", (data: Buffer) => {
        const response = data.toString();
        if (response.includes("wake_word")) {
          logger.info("Wake word detected!");
          this.emit("wake_word_detected", { timestamp: new Date() });
        }
      });

      socket.on("error", (error) => {
        logger.error("Socket error:", error);
      });
    } catch (error) {
      logger.error("Error processing audio chunk:", error);
    }
  }
}
