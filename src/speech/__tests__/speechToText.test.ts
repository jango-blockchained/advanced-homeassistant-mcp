import { SpeechToText, WakeWordEvent, TranscriptionError } from "../speechToText";
import fs from "fs";
import path from "path";

describe("SpeechToText", () => {
  let speechToText: SpeechToText;
  const testAudioDir = path.join(__dirname, "test_audio");

  beforeEach(() => {
    speechToText = new SpeechToText("fast-whisper");
    // Create test audio directory if it doesn't exist
    if (!fs.existsSync(testAudioDir)) {
      fs.mkdirSync(testAudioDir, { recursive: true });
    }
  });

  afterEach(() => {
    speechToText.stopWakeWordDetection();
    // Clean up test files
    if (fs.existsSync(testAudioDir)) {
      fs.rmSync(testAudioDir, { recursive: true, force: true });
    }
  });

  describe("checkHealth", () => {
    it("should handle Docker not being available", async () => {
      const isHealthy = await speechToText.checkHealth();
      expect(isHealthy).toBeDefined();
      expect(isHealthy).toBe(false);
    });
  });

  describe("wake word detection", () => {
    it("should detect new audio files and emit wake word events", (done) => {
      const testFile = path.join(testAudioDir, "wake_word_test_123456.wav");
      const testMetadata = `${testFile}.json`;

      speechToText.startWakeWordDetection(testAudioDir);

      speechToText.on("wake_word", (event: WakeWordEvent) => {
        expect(event).toBeDefined();
        expect(event.audioFile).toBe(testFile);
        expect(event.metadataFile).toBe(testMetadata);
        expect(event.timestamp).toBe("123456");
        done();
      });

      // Create a test audio file to trigger the event
      fs.writeFileSync(testFile, "test audio content");
    }, 1000);

    it("should handle transcription errors when Docker is not available", (done) => {
      const testFile = path.join(testAudioDir, "wake_word_test_123456.wav");

      let errorEmitted = false;
      let wakeWordEmitted = false;

      const checkDone = () => {
        if (errorEmitted && wakeWordEmitted) {
          done();
        }
      };

      speechToText.on("error", (error) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(TranscriptionError);
        expect(error.message).toContain("Failed to start Docker process");
        errorEmitted = true;
        checkDone();
      });

      speechToText.on("wake_word", () => {
        wakeWordEmitted = true;
        checkDone();
      });

      speechToText.startWakeWordDetection(testAudioDir);

      // Create a test audio file to trigger the event
      fs.writeFileSync(testFile, "test audio content");
    }, 1000);
  });

  describe("transcribeAudio", () => {
    it("should handle Docker not being available for transcription", async () => {
      await expect(speechToText.transcribeAudio("/audio/test.wav")).rejects.toThrow(
        TranscriptionError,
      );
    });

    it("should emit progress events on error", (done) => {
      let progressEmitted = false;
      let errorThrown = false;

      const checkDone = () => {
        if (progressEmitted && errorThrown) {
          done();
        }
      };

      speechToText.on("progress", (event: { type: string; data: string }) => {
        expect(event.type).toBe("stderr");
        expect(event.data).toBe("Failed to start Docker process");
        progressEmitted = true;
        checkDone();
      });

      speechToText.transcribeAudio("/audio/test.wav").catch((error) => {
        expect(error).toBeInstanceOf(TranscriptionError);
        errorThrown = true;
        checkDone();
      });
    }, 1000);
  });
});
