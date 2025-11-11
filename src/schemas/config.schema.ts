import { z } from "zod";

export const RateLimitSchema = z.object({
  maxRequests: z.number().int().min(1).default(100),
  maxAuthRequests: z.number().int().min(1).default(5),
});

export const MCPServerConfigSchema = z.object({
  // Server configuration
  port: z.number().int().min(1).max(65535).default(3000),
  environment: z.enum(["development", "test", "production"]).default("development"),

  // Execution settings
  executionTimeout: z.number().int().min(1000).max(300000).default(30000),
  streamingEnabled: z.boolean().default(false),

  // Transport settings
  useStdioTransport: z.boolean().default(false),
  useHttpTransport: z.boolean().default(true),

  // Debug and logging
  debugMode: z.boolean().default(false),
  debugStdio: z.boolean().default(false),
  debugHttp: z.boolean().default(false),
  silentStartup: z.boolean().default(false),

  // CORS settings
  corsOrigin: z.string().default("*"),

  // Rate limiting
  rateLimit: RateLimitSchema.default({
    maxRequests: 100,
    maxAuthRequests: 5,
  }),

  // Speech features
  speech: z
    .object({
      enabled: z.boolean().default(false),
      wakeWord: z.object({
        enabled: z.boolean().default(false),
        threshold: z.number().min(0).max(1).default(0.05),
      }),
      asr: z.object({
        enabled: z.boolean().default(false),
        model: z.enum(["base", "small", "medium", "large"]).default("base"),
        engine: z.enum(["faster_whisper", "whisper"]).default("faster_whisper"),
        beamSize: z.number().int().min(1).max(10).default(5),
        computeType: z.enum(["float32", "float16", "int8"]).default("float32"),
        language: z.string().default("en"),
      }),
      audio: z.object({
        minSpeechDuration: z.number().min(0.1).max(10).default(1.0),
        silenceDuration: z.number().min(0.1).max(5).default(0.5),
        sampleRate: z.number().int().min(8000).max(48000).default(16000),
        channels: z.number().int().min(1).max(2).default(1),
        chunkSize: z.number().int().min(256).max(4096).default(1024),
      }),
    })
    .default({
      enabled: false,
      wakeWord: { enabled: false, threshold: 0.05 },
      asr: {
        enabled: false,
        model: "base",
        engine: "faster_whisper",
        beamSize: 5,
        computeType: "float32",
        language: "en",
      },
      audio: {
        minSpeechDuration: 1.0,
        silenceDuration: 0.5,
        sampleRate: 16000,
        channels: 1,
        chunkSize: 1024,
      },
    }),
});

export type MCPServerConfigType = z.infer<typeof MCPServerConfigSchema>;
