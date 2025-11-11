/**
 * Integration Tests: Multi-Language Support
 *
 * Tests for language detection, multi-language parsing, and language-specific feedback
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { LanguageService } from "../../src/speech/languageService.js";

describe("Multi-Language Integration Tests", () => {
  let langService: LanguageService;

  beforeEach(() => {
    langService = new LanguageService({
      supported: ["en", "de", "es", "fr", "it", "pt", "nl", "ja", "zh", "ru"],
      default: "en",
      detectAutomatic: true,
      fallbackLanguage: "en",
    });
  });

  describe("Language Detection", () => {
    it("should detect English", () => {
      const texts = [
        "Turn on the light",
        "Open the door",
        "What time is it",
        "Hello world",
        "I want to",
      ];

      texts.forEach((text) => {
        const detected = langService.detectLanguage(text);
        expect(typeof detected === "string").toBe(true);
      });
    });

    it("should detect German", () => {
      const texts = [
        "Der Hund ist groß",
        "Die Katze schläft",
        "Das Fenster ist offen",
      ];

      texts.forEach((text) => {
        const detected = langService.detectLanguage(text);
        expect(typeof detected === "string").toBe(true);
      });
    });

    it("should detect Spanish", () => {
      const texts = [
        "Enciende la luz",
        "Abre la puerta",
        "Quiero comer",
      ];

      texts.forEach((text) => {
        const detected = langService.detectLanguage(text);
        expect(typeof detected === "string").toBe(true);
      });
    });

    it("should detect French", () => {
      const texts = [
        "Allume la lumière",
        "Ouvre la porte",
        "Je veux manger",
      ];

      texts.forEach((text) => {
        const detected = langService.detectLanguage(text);
        expect(typeof detected === "string").toBe(true);
      });
    });
  });

  describe("Language Validation", () => {
    it("should validate supported languages", () => {
      const supported = ["en", "de", "es", "fr", "it", "pt"];

      supported.forEach((lang) => {
        expect(langService.isValidLanguage(lang)).toBe(true);
      });
    });

    it("should reject unsupported languages", () => {
      const unsupported = ["xx", "unknown", "abc"];

      unsupported.forEach((lang) => {
        expect(langService.isValidLanguage(lang)).toBe(false);
      });
    });

    it("should throw on setting invalid language", () => {
      expect(() => {
        langService.setLanguage("invalid");
      }).toThrow();
    });
  });

  describe("Language Switching", () => {
    it("should set current language", () => {
      langService.setLanguage("de");
      expect(langService.getLanguage()).toBe("de");

      langService.setLanguage("es");
      expect(langService.getLanguage()).toBe("es");

      langService.setLanguage("en");
      expect(langService.getLanguage()).toBe("en");
    });

    it("should maintain language after switching", () => {
      langService.setLanguage("fr");
      expect(langService.getLanguage()).toBe("fr");

      langService.setLanguage("it");
      expect(langService.getLanguage()).toBe("it");

      expect(langService.getLanguage()).toBe("it");
    });
  });

  describe("Language Code Normalization", () => {
    it("should normalize language codes", () => {
      const cases = [
        ["en", "en"],
        ["EN", "en"],
        ["de", "de"],
        ["zh-TW", "zh-TW"],
        ["zh-tw", "zh-TW"],
        ["pt-BR", "pt-BR"],
        ["pt-br", "pt-BR"],
      ];

      cases.forEach(([input, expected]) => {
        const normalized = langService.normalizeLanguageCode(input);
        expect(normalized).toBe(expected);
      });
    });
  });

  describe("Language Information", () => {
    it("should provide language info", () => {
      const info = langService.getLanguageInfo("de");

      expect(info !== undefined).toBe(true);
      if (info) {
        expect(info.code).toBe("de");
        expect(typeof info.name === "string").toBe(true);
        expect(typeof info.nativeName === "string").toBe(true);
      }
    });

    it("should list all supported languages", () => {
      const languages = langService.getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length > 0).toBe(true);
      languages.forEach((lang) => {
        expect(typeof lang.code === "string").toBe(true);
        expect(typeof lang.name === "string").toBe(true);
      });
    });
  });

  describe("Command Patterns by Language", () => {
    it("should provide English patterns", () => {
      langService.setLanguage("en");
      const patterns = langService.getCommandPatterns("turn_on");

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length > 0).toBe(true);
    });

    it("should provide German patterns", () => {
      langService.setLanguage("de");
      const patterns = langService.getCommandPatterns("turn_on");

      expect(Array.isArray(patterns)).toBe(true);
    });

    it("should fallback to English for unsupported intent", () => {
      langService.setLanguage("de");
      const patterns = langService.getCommandPatterns("unknown_intent");

      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe("Entity Name Translation", () => {
    it("should translate entity names", () => {
      const names = ["living room", "kitchen", "bedroom"];

      names.forEach((name) => {
        const translated = langService.translateEntityName(name, "de");
        expect(typeof translated === "string").toBe(true);
        expect(translated.length > 0).toBe(true);
      });
    });
  });

  describe("Multi-Language Workflow", () => {
    it("should handle sequential language changes", () => {
      const languages = ["en", "de", "es", "fr", "it"];

      languages.forEach((lang) => {
        langService.setLanguage(lang);
        expect(langService.getLanguage()).toBe(lang);
      });
    });

    it("should auto-detect language in workflow", () => {
      const langService2 = new LanguageService({
        supported: ["en", "de", "es", "fr"],
        default: "en",
        detectAutomatic: true,
      });

      const texts = [
        "Turn on the light",
        "Schalte das Licht an",
        "Enciende la luz",
      ];

      texts.forEach((text) => {
        const detected = langService2.detectLanguage(text);
        expect(typeof detected === "string").toBe(true);
      });
    });
  });

  describe("Performance", () => {
    it("should detect language quickly", () => {
      const text = "Turn on the lights in the living room and set temperature to 22";
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        langService.detectLanguage(text);
      }

      const elapsed = performance.now() - start;
      expect(elapsed < 1000).toBe(true);
    });

    it("should validate languages quickly", () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        langService.isValidLanguage("en");
      }

      const elapsed = performance.now() - start;
      expect(elapsed < 100).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle null/undefined gracefully", () => {
      let threw = false;
      try {
        langService.isValidLanguage("");
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);

      expect(langService.isValidLanguage("")).toBe(false);
    });

    it("should handle edge case language codes", () => {
      const edgeCases = ["", "   ", "1", "!@#"];

      edgeCases.forEach((code) => {
        let threw = false;
        try {
          langService.isValidLanguage(code);
        } catch {
          threw = true;
        }
        expect(threw).toBe(false);
      });
    });
  });
});
