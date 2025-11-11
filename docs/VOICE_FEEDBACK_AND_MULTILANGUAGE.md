# Voice Feedback System (TTS) & Multi-Language Support

This document describes the Text-to-Speech (TTS) feedback system and multi-language support features added to Home Assistant MCP.

## Table of Contents

- [TTS Voice Feedback System](#tts-voice-feedback-system)
- [Multi-Language Support](#multi-language-support)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Integration Examples](#integration-examples)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## TTS Voice Feedback System

### Overview

The Text-to-Speech (TTS) system provides voice feedback for user commands. When a command is executed, the system can automatically generate audio responses and play them through configured media players.

### Features

- **Multiple TTS Providers**: Support for Google Translate, Microsoft TTS, OpenAI TTS, and other Home Assistant TTS services
- **Smart Caching**: Generated audio is cached to reduce API calls and improve response times
- **Multi-Language Support**: Generate speech in different languages
- **Media Player Integration**: Play audio on any Home Assistant media player entity
- **Error Handling**: Graceful error handling and fallbacks

### TTS Tool

The `text_to_speech` tool provides the main interface for generating and playing audio.

#### Parameters

```typescript
{
  text: string,              // Text to convert to speech (required, max 5000 chars)
  language?: string,         // Language code: 'en', 'de', 'es', 'fr', etc. (optional)
  provider?: string,         // TTS provider: 'google_translate', 'microsoft_tts', etc. (optional)
  media_player_id?: string,  // Entity ID of media player (optional, defaults to 'media_player.living_room')
  cache?: boolean,           // Enable caching (default: true)
  action?: 'generate' | 'play' | 'speak' | 'get_providers' | 'get_cache_stats'
}
```

#### Actions

- **`generate`**: Generate audio URL only (does not play)
- **`play`**: Play previously generated audio
- **`speak`** (default): Generate audio and play it immediately
- **`get_providers`**: List all available TTS providers in Home Assistant
- **`get_cache_stats`**: Get cache statistics

### Example Usage

#### Basic Voice Feedback

```typescript
// Generate and play speech
const response = await textToSpeechTool.execute({
  text: "Living room lights have been turned on",
  language: "en",
  media_player_id: "media_player.living_room",
  action: "speak"
});

// Response:
// {
//   success: true,
//   action: "speak",
//   message: "Speech generated and playback initiated",
//   text: "Living room lights have been turned on",
//   language: "en"
// }
```

#### Generate Audio Only

```typescript
const response = await textToSpeechTool.execute({
  text: "Command executed",
  language: "en",
  action: "generate"
});

// Response includes URL for audio file
// {
//   success: true,
//   action: "generate",
//   url: "https://ha.local/api/tts/audio/...",
//   mediaContentId: "https://ha.local/api/tts/audio/...",
//   mediaContentType: "audio/mpeg"
// }
```

#### Get Available Providers

```typescript
const response = await textToSpeechTool.execute({
  action: "get_providers"
});

// Response:
// {
//   success: true,
//   providers: ["google_translate", "microsoft_tts", "openai_tts", ...],
//   message: "Found 5 available TTS providers"
// }
```

---

## Multi-Language Support

### Overview

The multi-language support system enables the MCP server to:
- Automatically detect the language of input commands
- Parse commands in multiple languages
- Generate responses in the user's language
- Maintain consistent language throughout a session

### Supported Languages

The system supports the following languages out of the box:

| Code | Language | Native Name |
|------|----------|-------------|
| `en` | English | English |
| `de` | German | Deutsch |
| `es` | Spanish | Español |
| `fr` | French | Français |
| `it` | Italian | Italiano |
| `pt` | Portuguese | Português |
| `pt-BR` | Portuguese (Brazil) | Português (Brasil) |
| `nl` | Dutch | Nederlands |
| `ja` | Japanese | 日本語 |
| `zh` | Chinese (Simplified) | 中文（简体） |
| `zh-TW` | Chinese (Traditional) | 中文（繁體） |
| `ru` | Russian | Русский |
| `pl` | Polish | Polski |

### Language Detection

The system can automatically detect the language of input text:

```typescript
const langService = getLanguageService();

// Auto-detect language
const detectedLang = langService.detectLanguage("Schalte das Licht an");
// Returns: "de"

// The detection works by looking for language-specific words
```

### Language-Specific Command Parsing

Voice commands are parsed according to the detected or specified language:

#### English Examples
```
"Turn on the light"
"Switch the bedroom lights on"
"Please turn off the kitchen fan"
```

#### German Examples
```
"Schalte das Licht an"
"Mache das Wohnzimmerlicht ein"
"Bitte schalte den Küchenlüfter aus"
```

#### Spanish Examples
```
"Enciende la luz"
"Pon la luz del dormitorio"
"Por favor, apaga el ventilador de la cocina"
```

#### French Examples
```
"Allume la lumière"
"Mets les lumières du salon"
"Éteins le ventilateur de la cuisine"
```

### Language Service

The `LanguageService` class provides the core language functionality:

```typescript
import { getLanguageService } from "../../speech/languageService.js";

const langService = getLanguageService();

// Set language
langService.setLanguage("de");
console.log(langService.getLanguage()); // "de"

// Validate language
langService.isValidLanguage("es"); // true
langService.isValidLanguage("xx"); // false

// Get language info
const info = langService.getLanguageInfo("de");
// {
//   code: "de",
//   name: "German",
//   nativeName: "Deutsch",
//   region: "DE"
// }

// Get all supported languages
const allLangs = langService.getSupportedLanguages();

// Normalize language code
langService.normalizeLanguageCode("en-US"); // "en"
langService.normalizeLanguageCode("pt-br"); // "pt-BR"

// Get command patterns for current language
const patterns = langService.getCommandPatterns("turn_on");

// Translate entity names
const name = langService.translateEntityName("living room", "de");
```

---

## Configuration

### Environment Variables

Add these environment variables to control TTS and language features:

```bash
# TTS Features
ENABLE_SPEECH_FEATURES=true
ENABLE_SPEECH_TO_TEXT=true
ENABLE_TEXT_TO_SPEECH=true

# TTS Provider
TTS_PROVIDER=google_translate          # or: microsoft_tts, openai_tts
TTS_CACHE_ENABLED=true                # Cache generated audio

# Language Settings
DEFAULT_LANGUAGE=en                    # Default language
SUPPORTED_LANGUAGES=en,de,es,fr        # Comma-separated list
AUTO_DETECT_LANGUAGE=true              # Auto-detect input language
```

### Application Configuration

In your `.env` file:

```env
# Home Assistant
HASS_HOST=http://homeassistant.local:8123
HASS_TOKEN=your-ha-token-here

# Speech Features
ENABLE_SPEECH_FEATURES=true
ENABLE_TEXT_TO_SPEECH=true
TTS_PROVIDER=google_translate
TTS_CACHE_ENABLED=true
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,de,es,fr
AUTO_DETECT_LANGUAGE=true
```

---

## Usage Examples

### Example 1: Simple Voice Command with Feedback

```typescript
import { VoiceCommandParserTool } from "../../tools/homeassistant/voice-command-parser.tool";
import { TextToSpeechTool } from "../../tools/homeassistant/text-to-speech.tool";

async function handleVoiceCommand(userSpeech: string) {
  const parser = new VoiceCommandParserTool();
  const tts = new TextToSpeechTool();
  
  // Parse the command
  const parseResult = await parser.execute({
    transcription: userSpeech,
    language: "en"
  });
  
  const parsed = JSON.parse(parseResult);
  
  if (parsed.success) {
    const command = parsed.parsed;
    
    // Generate voice feedback
    const feedbackText = `Understood. ${command.intent} on ${command.target}`;
    await tts.execute({
      text: feedbackText,
      language: "en",
      action: "speak"
    });
    
    return command;
  } else {
    // Generate error feedback
    await tts.execute({
      text: "Sorry, I didn't understand that. Could you please repeat?",
      language: "en",
      action: "speak"
    });
  }
}
```

### Example 2: Multi-Language Command Processing

```typescript
import { getLanguageService } from "../../speech/languageService";

async function handleMultiLanguageCommand(userInput: string) {
  const langService = getLanguageService();
  const tts = new TextToSpeechTool();
  
  // Auto-detect language
  const detectedLang = langService.detectLanguage(userInput);
  langService.setLanguage(detectedLang);
  
  console.log(`Detected language: ${detectedLang}`);
  
  // Parse command in detected language
  const parseResult = await parser.execute({
    transcription: userInput,
    language: detectedLang
  });
  
  const parsed = JSON.parse(parseResult);
  
  if (parsed.success) {
    // Generate feedback in the same language
    let feedbackText = "";
    
    switch (detectedLang) {
      case "de":
        feedbackText = `Verstanden. ${parsed.parsed.intent}`;
        break;
      case "es":
        feedbackText = `Entendido. ${parsed.parsed.intent}`;
        break;
      case "fr":
        feedbackText = `Compris. ${parsed.parsed.intent}`;
        break;
      default:
        feedbackText = `Understood. ${parsed.parsed.intent}`;
    }
    
    await tts.execute({
      text: feedbackText,
      language: detectedLang,
      action: "speak"
    });
  }
}
```

### Example 3: Caching Performance

```typescript
// First call - generates audio (may be slow)
const start1 = performance.now();
await tts.execute({
  text: "Turn on the living room lights",
  language: "en",
  action: "generate",
  cache: true
});
const time1 = performance.now() - start1;
console.log(`First call: ${time1}ms`);

// Second call - uses cache (very fast)
const start2 = performance.now();
await tts.execute({
  text: "Turn on the living room lights",
  language: "en",
  action: "generate",
  cache: true
});
const time2 = performance.now() - start2;
console.log(`Second call: ${time2}ms`); // Should be much faster
```

---

## Integration Examples

### With Claude API

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function voiceCommandWithClaude(userVoiceInput: string) {
  // Parse voice input
  const parseResult = await voiceParser.execute({
    transcription: userVoiceInput
  });
  
  const parsed = JSON.parse(parseResult);
  
  if (!parsed.success) {
    await tts.execute({
      text: "I couldn't understand that command",
      action: "speak"
    });
    return;
  }
  
  // Use Claude to understand context
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Execute this smart home command: ${JSON.stringify(parsed.parsed)}`
      }
    ]
  });
  
  const responseText = message.content[0].type === "text" 
    ? message.content[0].text 
    : "Command executed";
  
  // Provide voice feedback
  await tts.execute({
    text: responseText,
    action: "speak"
  });
}
```

---

## API Reference

### TextToSpeech Service

```typescript
class TextToSpeech extends EventEmitter {
  async initialize(): Promise<void>;
  async generateSpeech(feedback: TTSFeedback): Promise<TTSResponse>;
  async playAudio(ttsResponse: TTSResponse, mediaPlayerId?: string): Promise<void>;
  async speak(feedback: TTSFeedback): Promise<void>;
  setLanguage(language: string): void;
  getLanguage(): string;
  async getAvailableProviders(): Promise<string[]>;
  getCacheStats(): { size: number; entries: number };
  clearCache(): void;
  async shutdown(): Promise<void>;
}
```

### LanguageService

```typescript
class LanguageService {
  detectLanguage(text: string): string;
  isValidLanguage(code: string): boolean;
  setLanguage(code: string): void;
  getLanguage(): string;
  getLanguageInfo(code: string): LanguageInfo | undefined;
  getSupportedLanguages(): LanguageInfo[];
  normalizeLanguageCode(code: string): string;
  getCommandPatterns(intent: string): RegExp[];
  translateEntityName(entityName: string, language: string): string;
}
```

---

## Troubleshooting

### TTS Not Working

1. **Check Home Assistant TTS Service**
   ```bash
   # Verify TTS service is available in Home Assistant
   curl -X GET http://homeassistant.local:8123/api/services \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Check Media Player**
   ```bash
   # Ensure media player entity exists
   curl -X GET http://homeassistant.local:8123/api/states/media_player.living_room \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Enable Verbose Logging**
   ```bash
   LOG_LEVEL=debug npm start
   ```

### Language Detection Issues

If language detection is not working correctly:

1. **Manual Language Specification**
   ```typescript
   // Instead of auto-detecting, specify language explicitly
   await tts.execute({
     text: "Your command here",
     language: "de",  // Explicitly set to German
     action: "speak"
   });
   ```

2. **Add Language Context**
   ```typescript
   const langService = getLanguageService();
   langService.setLanguage("de");  // Set session language
   ```

### Cache Issues

To clear the TTS cache:

```typescript
const tts = await initializeTextToSpeech();
tts.clearCache();

// Or get cache statistics
const stats = tts.getCacheStats();
console.log(`Cache entries: ${stats.entries}, Size: ${stats.size}`);
```

### Multi-Language Command Parsing

If commands in non-English languages are not being parsed:

1. **Add Language Patterns** - Edit `languageService.ts` to add patterns for your language
2. **Use Explicit Language** - Always specify the language when parsing
3. **Check Supported Languages** - Ensure your language is in the supported list

---

## Performance Tips

1. **Enable Caching**: Always use `cache: true` for the same text to avoid redundant API calls
2. **Batch Requests**: Generate multiple audio files in parallel when possible
3. **Choose Appropriate Provider**: Different providers have different performance characteristics
4. **Monitor Cache**: Use `get_cache_stats` to monitor cache efficiency

---

## Future Enhancements

- [ ] Support for more languages and dialects
- [ ] Voice cloning/custom voices
- [ ] Real-time streaming TTS
- [ ] Pronunciation hints for entity names
- [ ] Emotion/tone control in voice feedback
- [ ] Multi-sentence TTS optimization
- [ ] Voice preference learning per user
