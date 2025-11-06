/**
 * Aurora Analyze Audio Tool
 * Analyzes audio files to extract features for sound-to-light synchronization
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

// Define the schema for tool parameters
const analyzeAudioSchema = z.object({
  audio_file: z.string().describe("Path to audio file (WAV format supported)"),
  sample_rate: z.number().optional().default(44100).describe("Sample rate for analysis (default: 44100)"),
  fft_size: z.number().optional().default(2048).describe("FFT size for frequency analysis (default: 2048)"),
});

type AnalyzeAudioParams = z.infer<typeof analyzeAudioSchema>;

async function executeAnalyzeAudio(args: AnalyzeAudioParams): Promise<unknown> {
  try {
    logger.info(`Analyzing audio file: ${args.audio_file}`);
    
    const manager = await getAuroraManager();
    const features = await manager.handleAnalyzeAudio({
      audio_file: args.audio_file,
      sample_rate: args.sample_rate,
      fft_size: args.fft_size,
    });

    logger.info(`Audio analysis complete: BPM=${features.bpm}, Mood=${features.mood}`);

    return {
      success: true,
      features: {
        duration: features.duration,
        bpm: features.bpm,
        beats: features.beats.length,
        beat_times: features.beats,
        mood: features.mood,
        frequency_data: {
          slices: features.frequencyData.length,
          sample_info: features.frequencyData.length > 0 ? {
            bass: features.frequencyData[0].bass,
            mid: features.frequencyData[0].mid,
            treble: features.frequencyData[0].treble,
            amplitude: features.frequencyData[0].amplitude,
          } : null,
        },
      },
    };
  } catch (error) {
    logger.error("Failed to analyze audio:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraAnalyzeAudioTool: Tool = {
  name: "aurora_analyze_audio",
  description: "Analyze audio file to extract features like BPM, beats, mood, and frequency data for Aurora sound-to-light system",
  parameters: analyzeAudioSchema,
  execute: executeAnalyzeAudio,
};
