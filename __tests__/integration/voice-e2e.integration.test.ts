/**
 * End-to-End Integration Tests: Complete Voice Command Flow
 *
 * Tests the full voice interaction pipeline:
 * 1. Wake word detection → Speech-to-Text
 * 2. STT → Natural Language Processing → Intent Classification
 * 3. Intent → Command Execution
 * 4. Execution Result → Text-to-Speech Feedback
 * 5. Session Management throughout the flow
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

/**
 * Mock Voice Pipeline Components
 */
interface VoiceCommand {
  audio: ArrayBuffer;
  language: string;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
}

interface Intent {
  type: string;
  action: string;
  target: string;
  parameters?: Record<string, any>;
}

interface ExecutionResult {
  success: boolean;
  message: string;
  details?: any;
}

interface FeedbackOptions {
  text: string;
  language: string;
  mediaPlayer?: string;
}

/**
 * Mock Wake Word Detector
 */
class MockWakeWordDetector {
  private isActive: boolean = false;

  async start(): Promise<void> {
    this.isActive = true;
  }

  async stop(): Promise<void> {
    this.isActive = false;
  }

  isListening(): boolean {
    return this.isActive;
  }

  simulateWakeWord(): void {
    if (this.isActive) {
      // Simulate wake word detection
    }
  }
}

/**
 * Mock Speech-to-Text Service
 */
class MockSpeechToText {
  async transcribe(command: VoiceCommand): Promise<TranscriptionResult> {
    // Simulate STT processing
    const sampleTranscriptions: Record<string, string> = {
      "turn_on_lights": "Turn on the living room lights",
      "set_temperature": "Set the temperature to 22 degrees",
      "play_music": "Play some relaxing music",
      "check_status": "What's the status of the kitchen",
      "turn_off_all": "Turn off all the lights",
    };

    const key = new TextDecoder().decode(command.audio);
    const text = sampleTranscriptions[key] || "Unknown command";

    return {
      text,
      confidence: 0.92,
      language: command.language,
    };
  }
}

/**
 * Mock Intent Classifier
 */
class MockIntentClassifier {
  async classify(transcription: TranscriptionResult): Promise<Intent> {
    const text = transcription.text.toLowerCase();

    if (text.includes("turn on")) {
      return {
        type: "device_control",
        action: "turn_on",
        target: this.extractTarget(text),
      };
    } else if (text.includes("set") && text.includes("temperature")) {
      return {
        type: "climate_control",
        action: "set_temperature",
        target: "climate.thermostat",
        parameters: {
          temperature: this.extractNumber(text),
        },
      };
    } else if (text.includes("play")) {
      return {
        type: "media_control",
        action: "play",
        target: "media_player.living_room",
        parameters: {
          content: "music",
        },
      };
    } else if (text.includes("status")) {
      return {
        type: "query",
        action: "get_status",
        target: this.extractTarget(text),
      };
    } else if (text.includes("turn off")) {
      return {
        type: "device_control",
        action: "turn_off",
        target: this.extractTarget(text),
      };
    }

    return {
      type: "unknown",
      action: "unknown",
      target: "unknown",
    };
  }

  private extractTarget(text: string): string {
    if (text.includes("living room")) return "light.living_room";
    if (text.includes("kitchen")) return "light.kitchen";
    if (text.includes("bedroom")) return "light.bedroom";
    if (text.includes("all")) return "group.all_lights";
    return "unknown";
  }

  private extractNumber(text: string): number {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}

/**
 * Mock Command Executor
 */
class MockCommandExecutor {
  private deviceStates: Map<string, any> = new Map();

  async execute(intent: Intent): Promise<ExecutionResult> {
    switch (intent.action) {
      case "turn_on":
        this.deviceStates.set(intent.target, { state: "on" });
        return {
          success: true,
          message: `Successfully turned on ${intent.target}`,
        };

      case "turn_off":
        this.deviceStates.set(intent.target, { state: "off" });
        return {
          success: true,
          message: `Successfully turned off ${intent.target}`,
        };

      case "set_temperature":
        this.deviceStates.set(intent.target, {
          temperature: intent.parameters?.temperature,
        });
        return {
          success: true,
          message: `Temperature set to ${intent.parameters?.temperature} degrees`,
        };

      case "play":
        this.deviceStates.set(intent.target, { playing: true });
        return {
          success: true,
          message: "Playing music",
        };

      case "get_status":
        const state = this.deviceStates.get(intent.target);
        return {
          success: true,
          message: state
            ? `Status: ${JSON.stringify(state)}`
            : "Device not found or inactive",
          details: state,
        };

      default:
        return {
          success: false,
          message: "Unknown command",
        };
    }
  }

  getDeviceState(target: string): any {
    return this.deviceStates.get(target);
  }
}

/**
 * Mock Text-to-Speech Service
 */
class MockTextToSpeech {
  private feedbackHistory: FeedbackOptions[] = [];

  async speak(options: FeedbackOptions): Promise<void> {
    this.feedbackHistory.push(options);
    // Simulate TTS playback delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  getFeedbackHistory(): FeedbackOptions[] {
    return this.feedbackHistory;
  }

  clearHistory(): void {
    this.feedbackHistory = [];
  }
}

/**
 * Mock Session Manager
 */
class MockSessionManager {
  private sessions: Map<string, any> = new Map();
  private currentSessionId: string | null = null;

  startSession(room?: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      room,
      commands: [],
      startTime: Date.now(),
    });
    this.currentSessionId = sessionId;
    return sessionId;
  }

  addCommand(sessionId: string, command: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.commands.push({
        ...command,
        timestamp: Date.now(),
      });
    }
  }

  getSession(sessionId: string): any {
    return this.sessions.get(sessionId);
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.active = false;
    }
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}

/**
 * Voice Pipeline Integration
 */
class VoicePipeline {
  constructor(
    private wakeWord: MockWakeWordDetector,
    private stt: MockSpeechToText,
    private classifier: MockIntentClassifier,
    private executor: MockCommandExecutor,
    private tts: MockTextToSpeech,
    private sessionManager: MockSessionManager
  ) {}

  async processVoiceCommand(
    audioData: string,
    language: string = "en",
    room?: string
  ): Promise<{
    sessionId: string;
    transcription: TranscriptionResult;
    intent: Intent;
    executionResult: ExecutionResult;
    feedback: string;
  }> {
    // Start session
    const sessionId = this.sessionManager.startSession(room);

    // Transcribe audio
    const command: VoiceCommand = {
      audio: new TextEncoder().encode(audioData).buffer,
      language,
    };
    const transcription = await this.stt.transcribe(command);

    // Classify intent
    const intent = await this.classifier.classify(transcription);

    // Execute command
    const executionResult = await this.executor.execute(intent);

    // Generate feedback
    const feedbackText = executionResult.success
      ? executionResult.message
      : `Failed: ${executionResult.message}`;

    await this.tts.speak({
      text: feedbackText,
      language,
    });

    // Record in session
    this.sessionManager.addCommand(sessionId, {
      transcription: transcription.text,
      intent,
      result: executionResult,
    });

    return {
      sessionId,
      transcription,
      intent,
      executionResult,
      feedback: feedbackText,
    };
  }
}

describe("Voice Command E2E Integration", () => {
  let wakeWord: MockWakeWordDetector;
  let stt: MockSpeechToText;
  let classifier: MockIntentClassifier;
  let executor: MockCommandExecutor;
  let tts: MockTextToSpeech;
  let sessionManager: MockSessionManager;
  let pipeline: VoicePipeline;

  beforeEach(() => {
    wakeWord = new MockWakeWordDetector();
    stt = new MockSpeechToText();
    classifier = new MockIntentClassifier();
    executor = new MockCommandExecutor();
    tts = new MockTextToSpeech();
    sessionManager = new MockSessionManager();
    pipeline = new VoicePipeline(wakeWord, stt, classifier, executor, tts, sessionManager);
  });

  afterEach(async () => {
    await wakeWord.stop();
    tts.clearHistory();
  });

  describe("Complete Voice Flow", () => {
    it("should process a complete turn on lights command", async () => {
      const result = await pipeline.processVoiceCommand("turn_on_lights", "en", "living_room");

      expect(result.transcription.text).toBe("Turn on the living room lights");
      expect(result.intent.action).toBe("turn_on");
      expect(result.intent.target).toBe("light.living_room");
      expect(result.executionResult.success).toBe(true);
      expect(result.feedback).toContain("Successfully turned on");

      // Verify TTS was called
      const feedbackHistory = tts.getFeedbackHistory();
      expect(feedbackHistory).toHaveLength(1);
      expect(feedbackHistory[0].text).toContain("Successfully");
    });

    it("should process a set temperature command", async () => {
      const result = await pipeline.processVoiceCommand("set_temperature", "en");

      expect(result.transcription.text).toBe("Set the temperature to 22 degrees");
      expect(result.intent.action).toBe("set_temperature");
      expect(result.intent.parameters?.temperature).toBe(22);
      expect(result.executionResult.success).toBe(true);
      expect(result.feedback).toContain("Temperature set to 22");
    });

    it("should track session throughout the flow", async () => {
      const result = await pipeline.processVoiceCommand("turn_on_lights", "en", "bedroom");

      const session = sessionManager.getSession(result.sessionId);
      expect(session).toBeDefined();
      expect(session.room).toBe("bedroom");
      expect(session.commands).toHaveLength(1);
      expect(session.commands[0].transcription).toBe("Turn on the living room lights");
    });

    it("should handle multiple commands in sequence", async () => {
      const result1 = await pipeline.processVoiceCommand("turn_on_lights", "en");
      const result2 = await pipeline.processVoiceCommand("set_temperature", "en");
      const result3 = await pipeline.processVoiceCommand("play_music", "en");

      expect(result1.executionResult.success).toBe(true);
      expect(result2.executionResult.success).toBe(true);
      expect(result3.executionResult.success).toBe(true);

      const feedbackHistory = tts.getFeedbackHistory();
      expect(feedbackHistory).toHaveLength(3);
    });

    it("should maintain device state across commands", async () => {
      // Turn on lights
      await pipeline.processVoiceCommand("turn_on_lights", "en");
      let state = executor.getDeviceState("light.living_room");
      expect(state.state).toBe("on");

      // Turn off lights
      await pipeline.processVoiceCommand("turn_off_all", "en");
      state = executor.getDeviceState("group.all_lights");
      expect(state.state).toBe("off");
    });
  });

  describe("Multi-Language Support", () => {
    it("should process commands in different languages", async () => {
      const languages = ["en", "de", "es", "fr"];

      for (const lang of languages) {
        const result = await pipeline.processVoiceCommand("turn_on_lights", lang);

        expect(result.transcription.language).toBe(lang);
        expect(result.executionResult.success).toBe(true);
      }

      const feedbackHistory = tts.getFeedbackHistory();
      expect(feedbackHistory).toHaveLength(4);
    });

    it("should provide feedback in the same language as command", async () => {
      const result = await pipeline.processVoiceCommand("turn_on_lights", "de");

      const feedbackHistory = tts.getFeedbackHistory();
      expect(feedbackHistory[0].language).toBe("de");
    });
  });

  describe("Error Handling", () => {
    it("should handle unknown commands gracefully", async () => {
      const result = await pipeline.processVoiceCommand("unknown_command", "en");

      expect(result.intent.type).toBe("unknown");
      expect(result.executionResult.success).toBe(false);
      expect(result.feedback).toContain("Failed");
    });

    it("should provide error feedback via TTS", async () => {
      await pipeline.processVoiceCommand("unknown_command", "en");

      const feedbackHistory = tts.getFeedbackHistory();
      expect(feedbackHistory).toHaveLength(1);
      expect(feedbackHistory[0].text).toContain("Failed");
    });
  });

  describe("Session Management", () => {
    it("should create unique sessions for each command", async () => {
      const result1 = await pipeline.processVoiceCommand("turn_on_lights", "en");
      const result2 = await pipeline.processVoiceCommand("set_temperature", "en");

      expect(result1.sessionId).not.toBe(result2.sessionId);
    });

    it("should track room context in sessions", async () => {
      const rooms = ["living_room", "bedroom", "kitchen"];

      for (const room of rooms) {
        const result = await pipeline.processVoiceCommand("turn_on_lights", "en", room);
        const session = sessionManager.getSession(result.sessionId);
        expect(session.room).toBe(room);
      }
    });

    it("should end sessions properly", async () => {
      const result = await pipeline.processVoiceCommand("turn_on_lights", "en");
      const sessionId = result.sessionId;

      sessionManager.endSession(sessionId);

      const session = sessionManager.getSession(sessionId);
      expect(session.active).toBe(false);
      expect(session.endTime).toBeDefined();
    });
  });

  describe("Performance", () => {
    it("should process commands within acceptable time", async () => {
      const start = performance.now();

      await pipeline.processVoiceCommand("turn_on_lights", "en");

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it("should handle concurrent commands", async () => {
      const promises = [
        pipeline.processVoiceCommand("turn_on_lights", "en"),
        pipeline.processVoiceCommand("set_temperature", "en"),
        pipeline.processVoiceCommand("play_music", "en"),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.executionResult.success).toBe(true);
      });
    });

    it("should process bulk commands efficiently", async () => {
      const start = performance.now();

      const promises = Array.from({ length: 10 }, (_, i) =>
        pipeline.processVoiceCommand(`turn_on_lights`, "en", `room_${i}`)
      );

      await Promise.all(promises);

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(2000); // 10 commands in less than 2 seconds
    });
  });

  describe("Wake Word Integration", () => {
    it("should start wake word detection", async () => {
      await wakeWord.start();
      expect(wakeWord.isListening()).toBe(true);
    });

    it("should stop wake word detection", async () => {
      await wakeWord.start();
      await wakeWord.stop();
      expect(wakeWord.isListening()).toBe(false);
    });

    it("should process command after wake word detection", async () => {
      await wakeWord.start();
      wakeWord.simulateWakeWord();

      const result = await pipeline.processVoiceCommand("turn_on_lights", "en");

      expect(result.executionResult.success).toBe(true);
    });
  });

  describe("Transcription Quality", () => {
    it("should have high confidence for clear commands", async () => {
      const result = await pipeline.processVoiceCommand("turn_on_lights", "en");

      expect(result.transcription.confidence).toBeGreaterThan(0.8);
    });

    it("should transcribe various command types", async () => {
      const commands = ["turn_on_lights", "set_temperature", "play_music", "check_status"];

      for (const cmd of commands) {
        const result = await pipeline.processVoiceCommand(cmd, "en");
        expect(result.transcription.text).toBeTruthy();
        expect(result.transcription.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe("Intent Classification", () => {
    it("should classify device control intents", async () => {
      const result = await pipeline.processVoiceCommand("turn_on_lights", "en");

      expect(result.intent.type).toBe("device_control");
      expect(result.intent.action).toBe("turn_on");
    });

    it("should classify climate control intents", async () => {
      const result = await pipeline.processVoiceCommand("set_temperature", "en");

      expect(result.intent.type).toBe("climate_control");
      expect(result.intent.action).toBe("set_temperature");
    });

    it("should classify media control intents", async () => {
      const result = await pipeline.processVoiceCommand("play_music", "en");

      expect(result.intent.type).toBe("media_control");
      expect(result.intent.action).toBe("play");
    });

    it("should classify query intents", async () => {
      const result = await pipeline.processVoiceCommand("check_status", "en");

      expect(result.intent.type).toBe("query");
      expect(result.intent.action).toBe("get_status");
    });
  });

  describe("Command Execution", () => {
    it("should execute turn on commands", async () => {
      const result = await pipeline.processVoiceCommand("turn_on_lights", "en");

      const state = executor.getDeviceState("light.living_room");
      expect(state.state).toBe("on");
    });

    it("should execute turn off commands", async () => {
      const result = await pipeline.processVoiceCommand("turn_off_all", "en");

      const state = executor.getDeviceState("group.all_lights");
      expect(state.state).toBe("off");
    });

    it("should execute climate control commands", async () => {
      const result = await pipeline.processVoiceCommand("set_temperature", "en");

      const state = executor.getDeviceState("climate.thermostat");
      expect(state.temperature).toBe(22);
    });

    it("should execute media control commands", async () => {
      const result = await pipeline.processVoiceCommand("play_music", "en");

      const state = executor.getDeviceState("media_player.living_room");
      expect(state.playing).toBe(true);
    });
  });

  describe("Feedback Generation", () => {
    it("should generate success feedback", async () => {
      await pipeline.processVoiceCommand("turn_on_lights", "en");

      const feedbackHistory = tts.getFeedbackHistory();
      expect(feedbackHistory[0].text).toContain("Successfully");
    });

    it("should generate error feedback", async () => {
      await pipeline.processVoiceCommand("unknown_command", "en");

      const feedbackHistory = tts.getFeedbackHistory();
      expect(feedbackHistory[0].text).toContain("Failed");
    });

    it("should generate context-specific feedback", async () => {
      const result = await pipeline.processVoiceCommand("set_temperature", "en");

      expect(result.feedback).toContain("22 degrees");
    });
  });
});
