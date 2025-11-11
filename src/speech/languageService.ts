/**
 * Language Detection and Management Service
 *
 * Provides language detection, validation, and multi-language support
 */

export interface LanguageConfig {
  supported: string[];
  default: string;
  detectAutomatic?: boolean;
  fallbackLanguage?: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  region?: string;
}

/**
 * Supported languages and their metadata
 */
const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
  },
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    region: "DE",
  },
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    region: "ES",
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    region: "FR",
  },
  it: {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    region: "IT",
  },
  pt: {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    region: "PT",
  },
  "pt-BR": {
    code: "pt-BR",
    name: "Portuguese (Brazil)",
    nativeName: "Português (Brasil)",
    region: "BR",
  },
  nl: {
    code: "nl",
    name: "Dutch",
    nativeName: "Nederlands",
    region: "NL",
  },
  ja: {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    region: "JP",
  },
  zh: {
    code: "zh",
    name: "Chinese (Simplified)",
    nativeName: "中文（简体）",
    region: "CN",
  },
  "zh-TW": {
    code: "zh-TW",
    name: "Chinese (Traditional)",
    nativeName: "中文（繁體）",
    region: "TW",
  },
  ru: {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    region: "RU",
  },
  pl: {
    code: "pl",
    name: "Polish",
    nativeName: "Polski",
    region: "PL",
  },
};

/**
 * Language patterns for command matching
 * Maps language to patterns for common commands
 */
export const COMMAND_PATTERNS_BY_LANGUAGE: Record<string, Record<string, RegExp[]>> = {
  en: {
    turn_on: [
      /turn\s+(?:on|up)\s+(?:the\s+)?(.+?)(?:\s+(?:to|at|for|on|in))?/i,
      /(?:turn|switch)\s+(.+?)\s+on(?:\s+(?:to|at))?/i,
    ],
    turn_off: [
      /turn\s+(?:off|down)\s+(?:the\s+)?(.+)/i,
      /(?:turn|switch)\s+(.+?)\s+off/i,
    ],
  },
  de: {
    turn_on: [
      /(?:schalte|mache|drehe)\s+(?:das\s+|die\s+|den\s+)?(.+?)\s+(?:ein|an)/i,
      /(?:schalte|mache)\s+(?:das\s+|die\s+|den\s+)?(.+?)\s+an/i,
    ],
    turn_off: [
      /(?:schalte|mache|drehe)\s+(?:das\s+|die\s+|den\s+)?(.+?)\s+(?:aus|ab)/i,
      /(?:schalte|mache)\s+(?:das\s+|die\s+|den\s+)?(.+?)\s+aus/i,
    ],
  },
  es: {
    turn_on: [
      /(?:enciende|prende|activa|pon)\s+(?:el\s+|la\s+|los\s+|las\s+)?(.+)/i,
      /(?:enciende|prende)\s+(?:el\s+|la\s+)?(.+)/i,
    ],
    turn_off: [
      /(?:apaga|desactiva|desconecta)\s+(?:el\s+|la\s+|los\s+|las\s+)?(.+)/i,
      /(?:apaga)\s+(?:el\s+|la\s+)?(.+)/i,
    ],
  },
  fr: {
    turn_on: [
      /(?:allume|active|branche)\s+(?:le\s+|la\s+|l')?(.+)/i,
      /(?:allume|mets)\s+(?:le\s+|la\s+|l')?(.+)/i,
    ],
    turn_off: [
      /(?:éteins|désactive|coupe)\s+(?:le\s+|la\s+|l')?(.+)/i,
      /(?:éteins)\s+(?:le\s+|la\s+|l')?(.+)/i,
    ],
  },
};

/**
 * Language Service for detecting, managing, and validating language settings
 */
export class LanguageService {
  public config: LanguageConfig; // Made public for tool access
  private currentLanguage: string;

  constructor(config?: Partial<LanguageConfig>) {
    this.config = {
      supported: ["en", "de", "es", "fr", "it", "pt", "nl", "ja", "zh", "ru"],
      default: "en",
      detectAutomatic: false,
      fallbackLanguage: "en",
      ...config,
    };
    this.currentLanguage = this.config.default;
  }

  /**
   * Detect language from text using simple heuristics
   * Can be enhanced with a proper language detection library
   */
  detectLanguage(text: string): string {
    // German indicators
    if (/\b(der|die|das|ein|eine|einen|einem|einen|einem|ich|mein|dein)\b/i.test(text)) {
      return "de";
    }

    // Spanish indicators
    if (/\b(el|la|los|las|un|una|unos|unas|yo|mi|tu)\b/i.test(text)) {
      return "es";
    }

    // French indicators
    if (/\b(le|la|les|un|une|des|je|mon|ton)\b/i.test(text)) {
      return "fr";
    }

    // Italian indicators
    if (/\b(il|lo|la|i|gli|le|un|uno|una|io|mio|tuo)\b/i.test(text)) {
      return "it";
    }

    // Default to English
    return this.config.default;
  }

  /**
   * Validate language code
   */
  isValidLanguage(code: string): boolean {
    return this.config.supported.includes(code);
  }

  /**
   * Set current language
   */
  setLanguage(code: string): void {
    if (!this.isValidLanguage(code)) {
      throw new Error(`Unsupported language: ${code}. Supported: ${this.config.supported.join(", ")}`);
    }
    this.currentLanguage = code;
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get language info
   */
  getLanguageInfo(code: string): LanguageInfo | undefined {
    return SUPPORTED_LANGUAGES[code];
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): LanguageInfo[] {
    return this.config.supported
      .map((code) => SUPPORTED_LANGUAGES[code])
      .filter((info) => info !== undefined);
  }

  /**
   * Normalize language code
   */
  normalizeLanguageCode(code: string): string {
    const lower = code.toLowerCase();
    // Handle variants like zh-TW, pt-BR
    if (lower === "zh-tw" || lower === "zh_tw") return "zh-TW";
    if (lower === "pt-br" || lower === "pt_br") return "pt-BR";
    // Return first part of hyphenated code
    return lower.split(/[-_]/)[0];
  }

  /**
   * Get command patterns for current language
   */
  getCommandPatterns(intent: string): RegExp[] {
    const lang = this.currentLanguage;
    const langPatterns = COMMAND_PATTERNS_BY_LANGUAGE[lang];
    if (langPatterns !== undefined) {
      const langIntentPatterns = langPatterns[intent];
      if (langIntentPatterns !== undefined) {
        return langIntentPatterns;
      }
    }
    const enPatterns = COMMAND_PATTERNS_BY_LANGUAGE.en;
    if (enPatterns !== undefined) {
      const enIntentPatterns = enPatterns[intent];
      if (enIntentPatterns !== undefined) {
        return enIntentPatterns;
      }
    }
    return [];
  }

  /**
   * Convert text based on language (useful for entity names)
   */
  translateEntityName(entityName: string, _language: string): string {
    // Simple pass-through; could be enhanced with real translations
    return entityName.toLowerCase();
  }
}

/**
 * Singleton instance
 */
let instance: LanguageService | null = null;

/**
 * Get or create language service
 */
export function getLanguageService(config?: Partial<LanguageConfig>): LanguageService {
  if (!instance) {
    instance = new LanguageService(config);
  }
  return instance;
}
