/**
 * Unit Tests: Text-to-Speech Service
 *
 * Tests for the TextToSpeech class including:
 * - Service initialization
 * - Speech generation with caching
 * - Audio playback
 * - Language management
 * - Provider availability
 * - Error handling
 */

/**
 * Unit Tests: Text-to-Speech Service
 *
 * Tests for the TextToSpeech class including:
 * - Service initialization
 * - Speech generation with caching
 * - Audio playback
 * - Language management
 * - Provider availability
 * - Error handling
 */

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// Mock global fetch
const createMockFetch = () => {
  return mock((url: string | URL | Request, init?: RequestInit) => {
    const urlString = typeof url === "string" ? url : url.toString();
    
    // Mock Home Assistant API endpoint
    if (urlString.includes("/api/") && !urlString.includes("/api/tts_get_url") && !urlString.includes("/api/services")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ message: "Home Assistant" }),
      } as Response);
    }
    
    // Mock TTS generation endpoint
    if (urlString.includes("/api/tts_get_url")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ 
          url: "https://ha.local/api/tts/audio/test_audio.mp3" 
        }),
      } as Response);
    }
    
    // Mock services endpoint
    if (urlString.includes("/api/services")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve([
          {
            tts: "exists",
            services: {
              google_translate: {},
              microsoft_tts: {},
              openai_tts: {},
            }
          }
        ]),
      } as Response);
    }
    
    // Mock media player service endpoint
    if (urlString.includes("/api/services/media_player/play_media")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve([]),
      } as Response);
    }
    
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "Not found" }),
    } as Response);
  });
};

describe("TextToSpeech Service", () => {
  let TextToSpeech: any;
  let TextToSpeechConfig: any;
  let TTSFeedback: any;
  let tts: any;
  let mockFetch: ReturnType<typeof createMockFetch>;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    // Dynamically import to avoid app.config issues
    const module = await import("../../src/speech/textToSpeech");
    TextToSpeech = module.TextToSpeech;
    
    // Save original fetch and install mock
    originalFetch = global.fetch;
    mockFetch = createMockFetch();
    global.fetch = mockFetch as any;

    const config = {
      hassHost: "https://ha.local",
      hassToken: "test-token",
      language: "en",
      provider: "google_translate",
      cache: true,
    };
    
    tts = new TextToSpeech(config);
  });

  afterEach(async () => {
    // Restore original fetch
    global.fetch = originalFetch;
    
    // Cleanup service
    await tts.shutdown();
  });

  describe("Initialization", () => {
    test("should initialize successfully with valid config", async () => {
      await tts.initialize();
      expect(mockFetch).toHaveBeenCalled();
    });

    test("should throw error on initialization failure", async () => {
      // Create TTS with failing connection
      const failingFetch = mock(() => Promise.resolve({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as Response));
      global.fetch = failingFetch as any;

      const failingTts = new TextToSpeech({
        hassHost: "https://invalid.local",
        hassToken: "invalid-token",
        language: "en",
      });

      await expect(failingTts.initialize()).rejects.toThrow();
    });

    test("should emit initialized event", async () => {
      const initPromise = new Promise<void>((resolve) => {
        tts.once("initialized", () => resolve());
      });

      await tts.initialize();
      await initPromise;
    });
  });

  describe("Speech Generation", () => {
    beforeEach(async () => {
      await tts.initialize();
    });

    test("should generate speech successfully", async () => {
      const feedback = {
        text: "Turn on the lights",
        language: "en",
      };

      const result = await tts.generateSpeech(feedback);
      
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("mediaContentId");
      expect(result).toHaveProperty("mediaContentType");
      expect(result.url).toContain("ha.local");
    });

    test("should use default language if not specified", async () => {
      const feedback = {
        text: "Test message",
      };

      const result = await tts.generateSpeech(feedback);
      expect(result).toHaveProperty("url");
    });

    test("should use custom provider if specified", async () => {
      const feedback = {
        text: "Test message",
        provider: "microsoft_tts",
      };

      const result = await tts.generateSpeech(feedback);
      expect(result).toHaveProperty("url");
    });

    test("should emit speech_generated event", async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tts.once("speech_generated", (data) => {
          expect(data).toHaveProperty("text");
          expect(data).toHaveProperty("language");
          expect(data).toHaveProperty("url");
          resolve();
        });
      });

      await tts.generateSpeech({ text: "Test" });
      await eventPromise;
    });

    test("should throw error when not initialized", async () => {
      const uninitializedTts = new TextToSpeech({
        hassHost: "https://ha.local",
        hassToken: "test-token",
        language: "en",
      });

      await expect(uninitializedTts.generateSpeech({ text: "Test" })).rejects.toThrow(
        "TextToSpeech service not initialized"
      );
    });

    test("should handle generation errors", async () => {
      const errorFetch = mock(() => Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response));
      global.fetch = errorFetch as any;

      const feedback = { text: "Test" };
      await expect(tts.generateSpeech(feedback)).rejects.toThrow();
    });

    test("should emit speech_error event on failure", async () => {
      const errorFetch = mock(() => Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response));
      global.fetch = errorFetch as any;

      const errorPromise = new Promise<void>((resolve) => {
        tts.once("speech_error", (data) => {
          expect(data).toHaveProperty("text");
          expect(data).toHaveProperty("error");
          resolve();
        });
      });

      try {
        await tts.generateSpeech({ text: "Test" });
      } catch {
        // Expected to fail
      }

      await errorPromise;
    });
  });

  describe("Caching", () => {
    beforeEach(async () => {
      await tts.initialize();
    });

    test("should cache generated speech", async () => {
      const feedback = {
        text: "Cached message",
        language: "en",
      };

      const result1 = await tts.generateSpeech(feedback);
      const result2 = await tts.generateSpeech(feedback);

      expect(result1.url).toBe(result2.url);
      
      // Fetch should only be called once for TTS generation (not counting initialization)
      const ttsCallCount = mockFetch.mock.calls.filter(
        (call: any[]) => call[0]?.toString().includes("/api/tts_get_url")
      ).length;
      expect(ttsCallCount).toBe(1);
    });

    test("should distinguish cache by language", async () => {
      await tts.generateSpeech({ text: "Test", language: "en" });
      await tts.generateSpeech({ text: "Test", language: "de" });

      const stats = tts.getCacheStats();
      expect(stats.size).toBe(2);
    });

    test("should distinguish cache by provider", async () => {
      await tts.generateSpeech({ text: "Test", provider: "google_translate" });
      await tts.generateSpeech({ text: "Test", provider: "microsoft_tts" });

      const stats = tts.getCacheStats();
      expect(stats.size).toBe(2);
    });

    test("should clear cache", async () => {
      await tts.generateSpeech({ text: "Test 1" });
      await tts.generateSpeech({ text: "Test 2" });

      let stats = tts.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      tts.clearCache();

      stats = tts.getCacheStats();
      expect(stats.size).toBe(0);
    });

    test("should respect cache: false option", async () => {
      const noCacheTts = new TextToSpeech({
        hassHost: "https://ha.local",
        hassToken: "test-token",
        language: "en",
        cache: false,
      });

      await noCacheTts.initialize();
      await noCacheTts.generateSpeech({ text: "Test" });
      await noCacheTts.generateSpeech({ text: "Test" });

      const stats = noCacheTts.getCacheStats();
      expect(stats.size).toBe(0);

      await noCacheTts.shutdown();
    });
  });

  describe("Audio Playback", () => {
    beforeEach(async () => {
      await tts.initialize();
    });

    test("should play audio on media player", async () => {
      const ttsResponse = await tts.generateSpeech({ text: "Test" });
      await tts.playAudio(ttsResponse, "media_player.living_room");

      const playMediaCalls = mockFetch.mock.calls.filter(
        (call: any[]) => call[0]?.toString().includes("play_media")
      );
      expect(playMediaCalls.length).toBeGreaterThan(0);
    });

    test("should use default media player if not specified", async () => {
      const ttsResponse = await tts.generateSpeech({ text: "Test" });
      await tts.playAudio(ttsResponse);

      expect(mockFetch).toHaveBeenCalled();
    });

    test("should emit audio_playing event", async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tts.once("audio_playing", (data) => {
          expect(data).toHaveProperty("entityId");
          expect(data).toHaveProperty("url");
          resolve();
        });
      });

      const ttsResponse = await tts.generateSpeech({ text: "Test" });
      await tts.playAudio(ttsResponse, "media_player.bedroom");
      
      await eventPromise;
    });

    test("should handle playback errors", async () => {
      const errorFetch = mock((url: string | URL | Request) => {
        const urlString = typeof url === "string" ? url : url.toString();
        
        if (urlString.includes("play_media")) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: "Entity Not Found",
          } as Response);
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response);
      });
      global.fetch = errorFetch as any;

      const ttsResponse = await tts.generateSpeech({ text: "Test" });
      await expect(tts.playAudio(ttsResponse)).rejects.toThrow();
    });

    test("should emit playback_error event on failure", async () => {
      const errorFetch = mock((url: string | URL | Request) => {
        const urlString = typeof url === "string" ? url : url.toString();
        
        if (urlString.includes("play_media")) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: "Entity Not Found",
          } as Response);
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response);
      });
      global.fetch = errorFetch as any;

      const errorPromise = new Promise<void>((resolve) => {
        tts.once("playback_error", (data) => {
          expect(data).toHaveProperty("error");
          resolve();
        });
      });

      const ttsResponse = await tts.generateSpeech({ text: "Test" });
      
      try {
        await tts.playAudio(ttsResponse);
      } catch {
        // Expected to fail
      }

      await errorPromise;
    });
  });

  describe("Speak Method", () => {
    beforeEach(async () => {
      await tts.initialize();
    });

    test("should generate and play audio in one call", async () => {
      await tts.speak({
        text: "Complete test",
        mediaPlayerId: "media_player.kitchen",
      });

      const ttsCallCount = mockFetch.mock.calls.filter(
        (call: any[]) => call[0]?.toString().includes("/api/tts_get_url")
      ).length;
      const playCallCount = mockFetch.mock.calls.filter(
        (call: any[]) => call[0]?.toString().includes("play_media")
      ).length;

      expect(ttsCallCount).toBe(1);
      expect(playCallCount).toBe(1);
    });
  });

  describe("Language Management", () => {
    test("should set language", () => {
      tts.setLanguage("de");
      expect(tts.getLanguage()).toBe("de");
    });

    test("should get current language", () => {
      const language = tts.getLanguage();
      expect(language).toBe("en");
    });

    test("should use new language for speech generation", async () => {
      await tts.initialize();
      
      tts.setLanguage("es");
      await tts.generateSpeech({ text: "Hola" });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("Provider Management", () => {
    beforeEach(async () => {
      await tts.initialize();
    });

    test("should get available TTS providers", async () => {
      const providers = await tts.getAvailableProviders();
      
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    test("should handle provider fetch errors gracefully", async () => {
      const errorFetch = mock((url: string | URL | Request) => {
        const urlString = typeof url === "string" ? url : url.toString();
        
        if (urlString.includes("/api/services")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
          } as Response);
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response);
      });
      global.fetch = errorFetch as any;

      const providers = await tts.getAvailableProviders();
      
      // Should return default provider
      expect(providers).toContain("google_translate");
    });
  });

  describe("Shutdown", () => {
    test("should clear cache on shutdown", async () => {
      await tts.initialize();
      await tts.generateSpeech({ text: "Test" });

      let stats = tts.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      await tts.shutdown();

      stats = tts.getCacheStats();
      expect(stats.size).toBe(0);
    });

    test("should emit shutdown event", async () => {
      await tts.initialize();

      const shutdownPromise = new Promise<void>((resolve) => {
        tts.once("shutdown", () => resolve());
      });

      await tts.shutdown();
      await shutdownPromise;
    });
  });
});
