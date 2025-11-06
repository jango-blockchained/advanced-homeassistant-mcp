/**
 * Audio Analysis Module
 * FFT-based frequency analysis, BPM detection, and beat detection
 */

import type { AudioBuffer, AudioFeatures, FrequencySlice } from '../types';
import { logger } from '../../utils/logger.js';

export class AudioAnalyzer {
  private fftSize: number;
  private hopSize: number;
  private sampleRate: number;

  constructor(fftSize: number = 2048, hopSize: number = 512, sampleRate: number = 44100) {
    this.fftSize = fftSize;
    this.hopSize = hopSize;
    this.sampleRate = sampleRate;
  }

  /**
   * Analyze audio buffer and extract features
   */
  async analyze(audioBuffer: AudioBuffer): Promise<AudioFeatures> {
    logger.info(`[AudioAnalyzer] Starting analysis of ${audioBuffer.duration.toFixed(2)}s audio`);

    // Convert to mono if stereo
    const monoData = audioBuffer.channels > 1 
      ? this.averageChannels(audioBuffer.data)
      : audioBuffer.data[0];

    // Perform frequency analysis
    const frequencyData = this.analyzeFrequencies(monoData, audioBuffer.sampleRate);

    // Detect beats and BPM
    const { beats, bpm } = this.detectBeats(frequencyData, audioBuffer.sampleRate);

    // Calculate overall energy
    const energy = this.calculateEnergy(frequencyData);

    // Detect mood based on features
    const mood = this.detectMood(frequencyData, energy, bpm);

    logger.info(`[AudioAnalyzer] Analysis complete: BPM=${bpm}, Energy=${energy.toFixed(2)}, Beats=${beats.length}, Mood=${mood}`);

    return {
      bpm,
      beats,
      frequencyData,
      energy,
      mood,
      duration: audioBuffer.duration,
    };
  }

  /**
   * Average multiple channels into mono
   */
  private averageChannels(channels: Float32Array[]): Float32Array {
    const length = channels[0].length;
    const mono = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const channel of channels) {
        sum += channel[i];
      }
      mono[i] = sum / channels.length;
    }

    return mono;
  }

  /**
   * Perform FFT analysis on audio data
   */
  private analyzeFrequencies(audioData: Float32Array, sampleRate: number): FrequencySlice[] {
    const slices: FrequencySlice[] = [];
    const numSlices = Math.floor((audioData.length - this.fftSize) / this.hopSize);

    for (let i = 0; i < numSlices; i++) {
      const offset = i * this.hopSize;
      const slice = audioData.slice(offset, offset + this.fftSize);
      
      // Apply Hamming window
      const windowed = this.applyHammingWindow(slice);
      
      // Perform FFT
      const spectrum = this.fft(windowed);
      
      // Extract frequency bands and features
      const timestamp = offset / sampleRate;
      const frequencySlice = this.extractFeatures(spectrum, timestamp, sampleRate);
      
      slices.push(frequencySlice);
    }

    return slices;
  }

  /**
   * Apply Hamming window to reduce spectral leakage
   */
  private applyHammingWindow(data: Float32Array): Float32Array {
    const windowed = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (data.length - 1));
      windowed[i] = data[i] * window;
    }
    return windowed;
  }

  /**
   * Simple FFT implementation (Cooley-Tukey algorithm)
   * Returns magnitude spectrum
   */
  private fft(data: Float32Array): Float32Array {
    const n = data.length;
    
    // Ensure power of 2
    if ((n & (n - 1)) !== 0) {
      throw new Error('FFT size must be power of 2');
    }

    // Real and imaginary parts
    const real = new Float32Array(data);
    const imag = new Float32Array(n);

    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
      }
      let k = n / 2;
      while (k <= j) {
        j -= k;
        k /= 2;
      }
      j += k;
    }

    // FFT computation
    for (let len = 2; len <= n; len *= 2) {
      const angle = -2 * Math.PI / len;
      const wlen_real = Math.cos(angle);
      const wlen_imag = Math.sin(angle);

      for (let i = 0; i < n; i += len) {
        let w_real = 1;
        let w_imag = 0;

        for (let j = 0; j < len / 2; j++) {
          const u_real = real[i + j];
          const u_imag = imag[i + j];
          const t_real = w_real * real[i + j + len / 2] - w_imag * imag[i + j + len / 2];
          const t_imag = w_real * imag[i + j + len / 2] + w_imag * real[i + j + len / 2];

          real[i + j] = u_real + t_real;
          imag[i + j] = u_imag + t_imag;
          real[i + j + len / 2] = u_real - t_real;
          imag[i + j + len / 2] = u_imag - t_imag;

          const w_real_temp = w_real * wlen_real - w_imag * wlen_imag;
          w_imag = w_real * wlen_imag + w_imag * wlen_real;
          w_real = w_real_temp;
        }
      }
    }

    // Calculate magnitude spectrum
    const magnitude = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }

    return magnitude;
  }

  /**
   * Extract features from frequency spectrum
   */
  private extractFeatures(spectrum: Float32Array, timestamp: number, sampleRate: number): FrequencySlice {
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / spectrum.length;

    // Define frequency ranges (in Hz)
    const bassRange = [20, 250];
    const midRange = [250, 4000];
    const trebleRange = [4000, 20000];

    // Calculate energy in each band
    let bass = 0, mid = 0, treble = 0, totalEnergy = 0;
    let maxMagnitude = 0, dominantBin = 0;

    for (let i = 0; i < spectrum.length; i++) {
      const freq = i * binWidth;
      const magnitude = spectrum[i];
      totalEnergy += magnitude;

      if (magnitude > maxMagnitude) {
        maxMagnitude = magnitude;
        dominantBin = i;
      }

      if (freq >= bassRange[0] && freq < bassRange[1]) {
        bass += magnitude;
      } else if (freq >= midRange[0] && freq < midRange[1]) {
        mid += magnitude;
      } else if (freq >= trebleRange[0] && freq < trebleRange[1]) {
        treble += magnitude;
      }
    }

    // Normalize to 0-1 range
    const normalize = (value: number) => Math.min(1.0, value / (spectrum.length * 0.1));

    return {
      timestamp,
      bass: normalize(bass),
      mid: normalize(mid),
      treble: normalize(treble),
      amplitude: normalize(totalEnergy),
      dominantFrequency: dominantBin * binWidth,
    };
  }

  /**
   * Detect beats using onset detection
   */
  private detectBeats(frequencyData: FrequencySlice[], sampleRate: number): { beats: number[]; bpm: number } {
    const beats: number[] = [];
    
    // Calculate spectral flux (onset strength)
    const onsetStrength: number[] = [];
    for (let i = 1; i < frequencyData.length; i++) {
      const prev = frequencyData[i - 1];
      const curr = frequencyData[i];
      
      // Focus on low frequencies for beat detection
      const flux = Math.max(0, (curr.bass - prev.bass) + (curr.mid - prev.mid) * 0.5);
      onsetStrength.push(flux);
    }

    // Find peaks in onset strength
    const threshold = this.calculateThreshold(onsetStrength);
    const minBeatInterval = 0.3; // Minimum 300ms between beats (200 BPM max)

    let lastBeatTime = -minBeatInterval;
    for (let i = 1; i < onsetStrength.length - 1; i++) {
      const time = frequencyData[i].timestamp;
      
      // Check if it's a local maximum and above threshold
      if (onsetStrength[i] > onsetStrength[i - 1] &&
          onsetStrength[i] > onsetStrength[i + 1] &&
          onsetStrength[i] > threshold &&
          time - lastBeatTime >= minBeatInterval) {
        beats.push(time);
        lastBeatTime = time;
      }
    }

    // Calculate BPM from beat intervals
    const bpm = this.calculateBPM(beats);

    return { beats, bpm };
  }

  /**
   * Calculate adaptive threshold for beat detection
   */
  private calculateThreshold(onsetStrength: number[]): number {
    const mean = onsetStrength.reduce((sum, val) => sum + val, 0) / onsetStrength.length;
    const variance = onsetStrength.reduce((sum, val) => sum + (val - mean) ** 2, 0) / onsetStrength.length;
    const stdDev = Math.sqrt(variance);
    
    // Threshold is mean + 1.5 * standard deviation
    return mean + 1.5 * stdDev;
  }

  /**
   * Calculate BPM from detected beats
   */
  private calculateBPM(beats: number[]): number {
    if (beats.length < 2) {
      return 120; // Default BPM if not enough beats
    }

    // Calculate intervals between beats
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }

    // Use median interval to avoid outliers
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];

    // Convert to BPM
    const bpm = 60 / medianInterval;

    // Clamp to reasonable range
    return Math.max(60, Math.min(200, Math.round(bpm)));
  }

  /**
   * Calculate overall energy level
   */
  private calculateEnergy(frequencyData: FrequencySlice[]): number {
    const totalEnergy = frequencyData.reduce((sum, slice) => sum + slice.amplitude, 0);
    return totalEnergy / frequencyData.length;
  }

  /**
   * Detect mood based on audio features
   */
  private detectMood(frequencyData: FrequencySlice[], energy: number, bpm: number): 'calm' | 'energetic' | 'intense' | 'dramatic' | 'ambient' {
    // Calculate average frequency distribution
    const avgBass = frequencyData.reduce((sum, s) => sum + s.bass, 0) / frequencyData.length;
    const avgMid = frequencyData.reduce((sum, s) => sum + s.mid, 0) / frequencyData.length;
    const avgTreble = frequencyData.reduce((sum, s) => sum + s.treble, 0) / frequencyData.length;

    // Simple mood classification
    if (energy < 0.3 && bpm < 100) {
      return avgTreble > avgBass ? 'ambient' : 'calm';
    } else if (energy > 0.6 && bpm > 130) {
      return 'intense';
    } else if (energy > 0.5 || bpm > 120) {
      return 'energetic';
    } else if (avgBass > avgMid && avgBass > avgTreble) {
      return 'dramatic';
    }

    return 'calm';
  }
}
