/**
 * Audio Capture Module
 * Handles microphone input and file loading
 */

import * as fs from 'fs/promises';
import type { AudioBuffer } from '../types';

export class AudioCapture {
  private sampleRate: number;
  private channels: number;

  constructor(sampleRate: number = 44100, channels: number = 1) {
    this.sampleRate = sampleRate;
    this.channels = channels;
  }

  /**
   * Load audio from file
   * Supports WAV, MP3, OGG, etc. (depending on available codecs)
   */
  async loadFromFile(filePath: string): Promise<AudioBuffer> {
    try {
      // Read file
      const fileBuffer = await fs.readFile(filePath);
      
      // Decode audio based on file extension
      const extension = filePath.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'wav':
          return await this.decodeWav(fileBuffer);
        case 'mp3':
          return await this.decodeMp3(fileBuffer);
        default:
          throw new Error(`Unsupported audio format: ${extension}`);
      }
    } catch (error) {
      throw new Error(`Failed to load audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decode WAV file
   */
  private async decodeWav(buffer: Buffer): Promise<AudioBuffer> {
    // WAV file structure:
    // 0-3: "RIFF"
    // 4-7: File size - 8
    // 8-11: "WAVE"
    // 12-15: "fmt "
    // 16-19: Format chunk size
    // 20-21: Audio format (1 = PCM)
    // 22-23: Number of channels
    // 24-27: Sample rate
    // 28-31: Byte rate
    // 32-33: Block align
    // 34-35: Bits per sample
    // 36-39: "data"
    // 40-43: Data size

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Verify RIFF header
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riff !== 'RIFF') {
      throw new Error('Invalid WAV file: Missing RIFF header');
    }

    // Verify WAVE format
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (wave !== 'WAVE') {
      throw new Error('Invalid WAV file: Missing WAVE format');
    }

    // Read format chunk
    const channels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);

    // Find data chunk
    let dataOffset = 36;
    while (dataOffset < buffer.length) {
      const chunkId = String.fromCharCode(
        view.getUint8(dataOffset),
        view.getUint8(dataOffset + 1),
        view.getUint8(dataOffset + 2),
        view.getUint8(dataOffset + 3)
      );
      const chunkSize = view.getUint32(dataOffset + 4, true);

      if (chunkId === 'data') {
        dataOffset += 8;
        break;
      }

      dataOffset += 8 + chunkSize;
    }

    // Read audio data
    const dataSize = view.getUint32(dataOffset - 4, true);
    const samplesPerChannel = dataSize / (channels * (bitsPerSample / 8));
    const duration = samplesPerChannel / sampleRate;

    // Convert to Float32Array per channel
    const data: Float32Array[] = [];
    for (let ch = 0; ch < channels; ch++) {
      data.push(new Float32Array(samplesPerChannel));
    }

    // Decode samples based on bit depth
    if (bitsPerSample === 16) {
      for (let i = 0; i < samplesPerChannel; i++) {
        for (let ch = 0; ch < channels; ch++) {
          const offset = dataOffset + (i * channels + ch) * 2;
          const sample = view.getInt16(offset, true);
          data[ch][i] = sample / 32768.0; // Normalize to -1.0 to 1.0
        }
      }
    } else if (bitsPerSample === 8) {
      for (let i = 0; i < samplesPerChannel; i++) {
        for (let ch = 0; ch < channels; ch++) {
          const offset = dataOffset + (i * channels + ch);
          const sample = view.getUint8(offset);
          data[ch][i] = (sample - 128) / 128.0; // Normalize to -1.0 to 1.0
        }
      }
    } else {
      throw new Error(`Unsupported bit depth: ${bitsPerSample}`);
    }

    return {
      sampleRate,
      channels,
      data,
      duration,
    };
  }

  /**
   * Decode MP3 file (placeholder - requires external library)
   */
  private async decodeMp3(buffer: Buffer): Promise<AudioBuffer> {
    // TODO: Implement MP3 decoding using a library like 'mpg123' or 'node-lame'
    // For now, throw an error
    throw new Error('MP3 decoding not yet implemented. Please use WAV files for now.');
  }

  /**
   * Capture from microphone (placeholder for live mode)
   */
  async captureFromMicrophone(durationSeconds: number): Promise<AudioBuffer> {
    // TODO: Implement microphone capture using a library like 'node-microphone' or 'sox'
    throw new Error('Microphone capture not yet implemented');
  }

  /**
   * Convert stereo to mono by averaging channels
   */
  static stereoToMono(audioBuffer: AudioBuffer): AudioBuffer {
    if (audioBuffer.channels === 1) {
      return audioBuffer;
    }

    const samples = audioBuffer.data[0].length;
    const monoData = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let ch = 0; ch < audioBuffer.channels; ch++) {
        sum += audioBuffer.data[ch][i];
      }
      monoData[i] = sum / audioBuffer.channels;
    }

    return {
      sampleRate: audioBuffer.sampleRate,
      channels: 1,
      data: [monoData],
      duration: audioBuffer.duration,
    };
  }

  /**
   * Resample audio to target sample rate
   */
  static resample(audioBuffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }

    const ratio = targetSampleRate / audioBuffer.sampleRate;
    const newLength = Math.floor(audioBuffer.data[0].length * ratio);
    const newData: Float32Array[] = [];

    for (let ch = 0; ch < audioBuffer.channels; ch++) {
      const channelData = new Float32Array(newLength);
      
      for (let i = 0; i < newLength; i++) {
        const srcIndex = i / ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, audioBuffer.data[ch].length - 1);
        const t = srcIndex - srcIndexFloor;

        // Linear interpolation
        channelData[i] = 
          audioBuffer.data[ch][srcIndexFloor] * (1 - t) +
          audioBuffer.data[ch][srcIndexCeil] * t;
      }

      newData.push(channelData);
    }

    return {
      sampleRate: targetSampleRate,
      channels: audioBuffer.channels,
      data: newData,
      duration: newLength / targetSampleRate,
    };
  }
}
