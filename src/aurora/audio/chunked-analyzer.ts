/**
 * Chunked Audio Analyzer
 * Performs FFT analysis on audio chunks with streaming offset support
 * Useful for real-time analysis and large files
 */

import type { AudioFeatures, FrequencySlice } from '../types';
import { AudioAnalyzer } from './analyzer';
import { logger } from '../../utils/logger.js';

export interface ChunkAnalysisResult {
  /** Frequency slices analyzed so far */
  frequencyData: FrequencySlice[];
  /** Partial features computed from analyzed chunks */
  partialFeatures: Partial<AudioFeatures>;
  /** Number of chunks processed */
  chunksProcessed: number;
  /** Audio offset in seconds */
  offsetSeconds: number;
  /** Is analysis complete */
  isComplete: boolean;
}

export class ChunkedAudioAnalyzer {
  private analyzer: AudioAnalyzer;
  private buffer: Float32Array = new Float32Array();
  private frequencyData: FrequencySlice[] = [];
  private sampleRate: number = 44100;
  private hopSize: number = 512;
  private fftSize: number = 2048;
  private timeOffset: number = 0;
  private chunksProcessed: number = 0;

  constructor(fftSize: number = 2048, hopSize: number = 512, sampleRate: number = 44100) {
    this.fftSize = fftSize;
    this.hopSize = hopSize;
    this.sampleRate = sampleRate;
    this.analyzer = new AudioAnalyzer(fftSize, hopSize, sampleRate);
  }

  /**
   * Add audio chunk and analyze progressively
   * @param chunk Raw audio samples as Float32Array or Buffer
   * @param offset Optional time offset in seconds
   */
  addChunk(chunk: Float32Array | Buffer | Uint8Array, offset?: number): ChunkAnalysisResult {
    // Convert to Float32Array if needed
    let samples: Float32Array;
    if (chunk instanceof Float32Array) {
      samples = chunk;
    } else if (chunk instanceof Buffer || chunk instanceof Uint8Array) {
      // Convert byte data to samples (assumes 16-bit PCM)
      const sampleCount = (chunk as any).length / 2;
      samples = new Float32Array(sampleCount);

      const view = new DataView((chunk as any).buffer, (chunk as any).byteOffset, (chunk as any).byteLength);
      for (let i = 0; i < sampleCount; i++) {
        const sample = view.getInt16(i * 2, true);
        samples[i] = sample / 32768.0; // Normalize to -1.0 to 1.0
      }
    } else {
      throw new Error('Unsupported chunk type');
    }

    if (offset !== undefined) {
      this.timeOffset = offset;
    }

    // Append to buffer
    const newBuffer = new Float32Array(this.buffer.length + samples.length);
    newBuffer.set(this.buffer);
    newBuffer.set(samples, this.buffer.length);
    this.buffer = newBuffer;

    // Analyze overlapping windows
    this.analyzeBuffer();

    this.chunksProcessed++;

    return this.getPartialResult();
  }

  /**
   * Analyze buffered samples with sliding window FFT
   */
  private analyzeBuffer(): void {
    const minBuffer = this.fftSize + this.hopSize;

    while (this.buffer.length >= minBuffer) {
      // Extract window
      const window = this.buffer.slice(0, this.fftSize);

      // Analyze this window
      const timestamp =
        this.timeOffset + (this.frequencyData.length * this.hopSize) / this.sampleRate;
      const slice = this.analyzeWindow(window, timestamp);
      this.frequencyData.push(slice);

      // Slide buffer
      this.buffer = this.buffer.slice(this.hopSize);
    }
  }

  /**
   * Analyze single window with FFT
   */
  private analyzeWindow(samples: Float32Array, timestamp: number): FrequencySlice {
    // Apply Hamming window
    const windowed = this.applyHammingWindow(samples);

    // Perform FFT
    const spectrum = this.fft(windowed);

    // Extract features
    return this.extractFeatures(spectrum, timestamp);
  }

  /**
   * Apply Hamming window to reduce spectral leakage
   */
  private applyHammingWindow(data: Float32Array): Float32Array {
    const windowed = new Float32Array(data.length);

    for (let i = 0; i < data.length; i++) {
      const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (data.length - 1));
      windowed[i] = data[i] * w;
    }

    return windowed;
  }

  /**
   * Cooley-Tukey FFT algorithm
   */
  private fft(data: Float32Array): Float32Array {
    const n = data.length;

    if ((n & (n - 1)) !== 0) {
      throw new Error('FFT size must be power of 2');
    }

    const real = new Float32Array(data);
    const imag = new Float32Array(n);

    // Bit-reversal
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
          const t_real =
            w_real * real[i + j + len / 2] - w_imag * imag[i + j + len / 2];
          const t_imag =
            w_real * imag[i + j + len / 2] + w_imag * real[i + j + len / 2];

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
   * Extract frequency features from spectrum
   */
  private extractFeatures(spectrum: Float32Array, timestamp: number): FrequencySlice {
    const nyquist = this.sampleRate / 2;
    const binWidth = nyquist / spectrum.length;

    // Frequency ranges
    const bassRange = [20, 250];
    const midRange = [250, 4000];
    const trebleRange = [4000, 20000];

    let bass = 0,
      mid = 0,
      treble = 0,
      totalEnergy = 0;
    let maxMagnitude = 0,
      dominantBin = 0;

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
   * Get partial analysis result from analyzed chunks so far
   */
  private getPartialResult(): ChunkAnalysisResult {
    const partialFeatures = this.computePartialFeatures();

    return {
      frequencyData: this.frequencyData,
      partialFeatures,
      chunksProcessed: this.chunksProcessed,
      offsetSeconds: this.timeOffset,
      isComplete: this.buffer.length < this.fftSize + this.hopSize,
    };
  }

  /**
   * Compute partial features from current frequency data
   */
  private computePartialFeatures(): Partial<AudioFeatures> {
    if (this.frequencyData.length === 0) {
      return {};
    }

    // Calculate average energy
    const avgAmplitude =
      this.frequencyData.reduce((sum, s) => sum + s.amplitude, 0) /
      this.frequencyData.length;
    const avgBass =
      this.frequencyData.reduce((sum, s) => sum + s.bass, 0) /
      this.frequencyData.length;
    const avgMid =
      this.frequencyData.reduce((sum, s) => sum + s.mid, 0) /
      this.frequencyData.length;
    const avgTreble =
      this.frequencyData.reduce((sum, s) => sum + s.treble, 0) /
      this.frequencyData.length;

    // Detect beats (simplified)
    const beats: number[] = [];
    const onsetStrength: number[] = [];

    for (let i = 1; i < this.frequencyData.length; i++) {
      const prev = this.frequencyData[i - 1];
      const curr = this.frequencyData[i];
      const flux = Math.max(0, curr.bass - prev.bass + (curr.mid - prev.mid) * 0.5);
      onsetStrength.push(flux);
    }

    // Simple beat detection from onsets
    if (onsetStrength.length > 2) {
      const threshold =
        onsetStrength.reduce((a, b) => a + b, 0) / onsetStrength.length * 1.5;
      const minInterval = 0.3;
      let lastBeatTime = -minInterval;

      for (let i = 1; i < onsetStrength.length - 1; i++) {
        const time = this.frequencyData[i].timestamp;
        if (
          onsetStrength[i] > onsetStrength[i - 1] &&
          onsetStrength[i] > onsetStrength[i + 1] &&
          onsetStrength[i] > threshold &&
          time - lastBeatTime >= minInterval
        ) {
          beats.push(time);
          lastBeatTime = time;
        }
      }
    }

    // Calculate BPM
    let bpm = 120;
    if (beats.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      bpm = Math.max(60, Math.min(200, Math.round(60 / medianInterval)));
    }

    // Detect mood
    let mood: 'calm' | 'energetic' | 'intense' | 'dramatic' | 'ambient' =
      'calm';
    if (avgAmplitude < 0.3 && bpm < 100) {
      mood = avgTreble > avgBass ? 'ambient' : 'calm';
    } else if (avgAmplitude > 0.6 && bpm > 130) {
      mood = 'intense';
    } else if (avgAmplitude > 0.5 || bpm > 120) {
      mood = 'energetic';
    } else if (avgBass > avgMid && avgBass > avgTreble) {
      mood = 'dramatic';
    }

    return {
      bpm,
      beats,
      frequencyData: this.frequencyData,
      energy: avgAmplitude,
      mood,
      duration:
        this.frequencyData.length > 0
          ? this.frequencyData[this.frequencyData.length - 1].timestamp
          : 0,
    };
  }

  /**
   * Finalize analysis and return complete features
   */
  async finalize(): Promise<AudioFeatures> {
    const partial = this.computePartialFeatures();

    return {
      bpm: partial.bpm || 120,
      beats: partial.beats || [],
      frequencyData: partial.frequencyData || [],
      energy: partial.energy || 0,
      mood: partial.mood || 'calm',
      duration: partial.duration || 0,
    };
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.buffer = new Float32Array();
    this.frequencyData = [];
    this.timeOffset = 0;
    this.chunksProcessed = 0;
  }
}
