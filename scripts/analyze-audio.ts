/**
 * Aurora Audio Analysis Script (Home Assistant-less)
 * Fast audio analysis without requiring Home Assistant connection
 * 
 * Usage: bun scripts/analyze-audio.ts <audio_file> [sample_rate] [fft_size]
 * Example: bun scripts/analyze-audio.ts ./audio/test-audio.wav 44100 2048
 */

import { AudioCapture, AudioAnalyzer, DEFAULT_CONFIG } from '../src/aurora/index.js';
import path from 'path';

async function analyzeAudio(
  audioFile: string,
  sampleRate: number = 44100,
  fftSize: number = 2048
) {
  try {
    // Resolve to absolute path
    const filePath = path.resolve(audioFile);

    console.log('🎵 Aurora Audio Analysis');
    console.log(`📂 File: ${filePath}`);
    console.log(`📊 Sample Rate: ${sampleRate} Hz, FFT Size: ${fftSize}`);
    console.log('');

    const capture = new AudioCapture(sampleRate, 1);
    const audioBuffer = await capture.loadFromFile(filePath);

    const analyzer = new AudioAnalyzer(fftSize, DEFAULT_CONFIG.audio.hopSize, audioBuffer.sampleRate);
    const features = await analyzer.analyze(audioBuffer);

    console.log('✅ Audio Analysis Complete');
    console.log('');
    console.log('Results:');
    console.log('─'.repeat(40));
    console.log(`Duration:             ${features.duration.toFixed(2)} seconds`);
    console.log(`BPM:                  ${features.bpm}`);
    console.log(`Mood:                 ${features.mood}`);
    console.log(`Beats Detected:       ${features.beats.length}`);
    console.log(`Frequency Data Points: ${features.frequencyData.length}`);
    console.log('─'.repeat(40));
    console.log('');
    console.log('First 10 beat timestamps:');
    console.log(features.beats.slice(0, 10).map((b, i) => `  ${i + 1}. ${b.toFixed(2)}s`).join('\n'));
    console.log('');

    // Return structured data for piping
    return {
      success: true,
      duration: features.duration,
      bpm: features.bpm,
      mood: features.mood,
      beats: features.beats.length,
      frequencyDataPoints: features.frequencyData.length,
      beatTimestamps: features.beats,
    };
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Get arguments from command line
const args = process.argv.slice(2);
const audioFile = args[0] || './audio/test-audio.wav';
const sampleRate = parseInt(args[1] || '44100', 10);
const fftSize = parseInt(args[2] || '2048', 10);

await analyzeAudio(audioFile, sampleRate, fftSize);
