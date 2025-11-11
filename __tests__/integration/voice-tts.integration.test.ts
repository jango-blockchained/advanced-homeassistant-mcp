/**
 * Integration Tests: Voice Feedback System (TTS)
 *
 * Tests for Text-to-Speech functionality including:
 * - TTS audio generation
 * - Media player integration
 * - Cache management
 * - Error handling
 * - Multi-language support
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

/**
 * Mock Home Assistant TTS Service
 */
class MockHomeAssistantTTSService {
  private cache: Map<string, string> = new Map();
  private playLog: Array<{ entityId: string; url: string }> = [];

  async generateAudio(text: string, language: string, provider: string): Promise<string> {
    const cacheKey = `${provider}_${language}_${text}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const url = `https://ha.local/api/tts/audio/${provider}_${language}_${Buffer.from(text).toString("base64")}`;
    this.cache.set(cacheKey, url);
    return url;
  }

  async playAudio(entityId: string, mediaUrl: string): Promise<void> {
    this.playLog.push({ entityId, url: mediaUrl });
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getPlayLog(): Array<{ entityId: string; url: string }> {
    return this.playLog;
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearPlayLog(): void {
    this.playLog = [];
  }
}

describe("TTS Integration Tests", () => {
  let mockService: MockHomeAssistantTTSService;

  beforeEach(() => {
    mockService = new MockHomeAssistantTTSService();
  });

  afterEach(() => {
    mockService.clearCache();
    mockService.clearPlayLog();
  });

  describe("Audio Generation", () => {
    it("should generate audio URL for text", async () => {
      const text = "Turn on the living room light";
      const url = await mockService.generateAudio(text, "en", "google_translate");

      expect(url).toBeTruthy();
      expect(url).toContain("google_translate");
      expect(url).toContain("en");
    });

    it("should support multiple languages", async () => {
      const languages = ["en", "de", "es", "fr"];
      const text = "Test audio";

      const urls = await Promise.all(
        languages.map((lang) => mockService.generateAudio(text, lang, "google_translate")),
      );

      expect(urls).toHaveLength(4);
      // Check all URLs are unique
      const uniqueUrls = new Set(urls);
      expect(uniqueUrls.size).toBe(4);
      urls.forEach((url, idx) => {
        expect(url).toContain(languages[idx]);
      });
    });

    it("should handle special characters and unicode", async () => {
      const specialTexts = [
        "Turn on the light!",
        "What's happening?",
        "Café café",
        "日本語テキスト",
        "Русский текст",
      ];

      const urls = await Promise.all(
        specialTexts.map((text) => mockService.generateAudio(text, "en", "google_translate")),
      );

      expect(urls).toHaveLength(5);
      urls.forEach((url) => {
        expect(url).toBeTruthy();
      });
    });

    it("should generate long text audio", async () => {
      const longText = "Please turn on the lights in the living room, bedroom, and kitchen, then set the temperature to 22 degrees and close the blinds.";
      const url = await mockService.generateAudio(longText, "en", "google_translate");

      expect(url).toBeTruthy();
      expect(url.length).toBeGreaterThan(50);
    });
  });

  describe("Audio Playback", () => {
    it("should play audio on specified media player", async () => {
      const text = "Audio test";
      const url = await mockService.generateAudio(text, "en", "google_translate");
      await mockService.playAudio("media_player.living_room", url);

      const log = mockService.getPlayLog();
      expect(log).toHaveLength(1);
      expect(log[0].entityId).toBe("media_player.living_room");
      expect(log[0].url).toBe(url);
    });

    it("should support multiple concurrent playbacks", async () => {
      const urls = await Promise.all([
        mockService.generateAudio("Bedroom", "en", "google_translate"),
        mockService.generateAudio("Kitchen", "en", "google_translate"),
        mockService.generateAudio("Living room", "en", "google_translate"),
      ]);

      await Promise.all([
        mockService.playAudio("media_player.bedroom", urls[0]),
        mockService.playAudio("media_player.kitchen", urls[1]),
        mockService.playAudio("media_player.living_room", urls[2]),
      ]);

      const log = mockService.getPlayLog();
      expect(log).toHaveLength(3);
    });
  });

  describe("Caching", () => {
    it("should cache generated audio", async () => {
      const text = "Cached text";
      const url1 = await mockService.generateAudio(text, "en", "google_translate");
      const url2 = await mockService.generateAudio(text, "en", "google_translate");

      expect(url1).toBe(url2);
      expect(mockService.getCacheSize()).toBe(1);
    });

    it("should distinguish cache by language and provider", async () => {
      const text = "Test text";
      const url1 = await mockService.generateAudio(text, "en", "google_translate");
      const url2 = await mockService.generateAudio(text, "de", "google_translate");
      const url3 = await mockService.generateAudio(text, "en", "microsoft_tts");

      expect(url1 === url2).toBe(false);
      expect(url1 === url3).toBe(false);
      expect(mockService.getCacheSize()).toBe(3);
    });

    it("should clear cache when requested", async () => {
      await mockService.generateAudio("Test 1", "en", "google_translate");
      await mockService.generateAudio("Test 2", "en", "google_translate");

      expect(mockService.getCacheSize()).toBe(2);

      mockService.clearCache();
      expect(mockService.getCacheSize()).toBe(0);
    });
  });

  describe("Multi-Language Support", () => {
    it("should generate audio in all supported languages", async () => {
      const languages = ["en", "de", "es", "fr", "it", "pt", "nl", "ja", "zh", "ru"];
      const text = "Test message";

      const urls = await Promise.all(
        languages.map((lang) => mockService.generateAudio(text, lang, "google_translate")),
      );

      expect(urls).toHaveLength(10);
      urls.forEach((url) => {
        expect(url).toBeTruthy();
        expect(url).toContain(text.substring(0, 4).toLowerCase() || "test");
      });
    });

    it("should handle language variants (pt-BR, zh-TW)", async () => {
      const variants = ["pt", "pt-BR", "zh", "zh-TW"];
      const text = "Variant test";

      const urls = await Promise.all(
        variants.map((lang) => mockService.generateAudio(text, lang, "google_translate")),
      );

      expect(urls).toHaveLength(4);
    });
  });

  describe("Error Handling", () => {
    it("should handle empty text gracefully", async () => {
      const text = "";
      const url = await mockService.generateAudio(text, "en", "google_translate");

      // Should still generate URL, even for empty text
      expect(url).toBeTruthy();
    });

    it("should handle very long text", async () => {
      const longText = "A".repeat(5000);
      const url = await mockService.generateAudio(longText, "en", "google_translate");

      expect(url).toBeTruthy();
    });

    it("should handle invalid media player gracefully", async () => {
      const url = await mockService.generateAudio("Test", "en", "google_translate");

      // Should not throw on invalid entity
      try {
        await mockService.playAudio("invalid_entity", url);
        expect(true).toBe(true); // Success - no throw
      } catch (error) {
        expect(error).toBeUndefined(); // Fail if error
      }
    });
  });

  describe("Performance", () => {
    it("should generate audio within acceptable time", async () => {
      const start = performance.now();

      await mockService.generateAudio("Performance test", "en", "google_translate");

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100); // Should be very fast (mock)
    });

    it("should handle bulk audio generation", async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Message ${i}`);
      const start = performance.now();

      const urls = await Promise.all(
        texts.map((text) => mockService.generateAudio(text, "en", "google_translate")),
      );

      const elapsed = performance.now() - start;
      expect(urls).toHaveLength(100);
      expect(elapsed).toBeLessThan(1000); // Bulk should complete quickly
    });

    it("should serve cached audio instantly", async () => {
      const text = "Cached performance test";
      await mockService.generateAudio(text, "en", "google_translate");

      const start = performance.now();
      await mockService.generateAudio(text, "en", "google_translate");
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10); // Cache hit should be instant
    });
  });
});
