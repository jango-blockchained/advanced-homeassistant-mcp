/**
 * Audio Capture Module
 * Handles microphone input and file loading with support for multiple formats
 */

import * as fs from 'fs/promises';
import { detectFormatFromBuffer, detectFormatFromExtension, AudioFormat, isSupportedFormat, getFormatName } from './format-detector';
import { MP3Decoder } from './decoders/mp3-decoder';
import { OGGDecoder } from './decoders/ogg-decoder';
import { FLACDecoder } from './decoders/flac-decoder';
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
   * Supports WAV, MP3, OGG, FLAC formats
   */
  async loadFromFile(filePath: string): Promise<AudioBuffer> {
    try {
      // Read file
      const fileBuffer = await fs.readFile(filePath);

      // Detect format from extension first, then validate with buffer
      let format = detectFormatFromExtension(filePath);
      
      // Verify with buffer header if extension detection fails
      if (format === AudioFormat.UNKNOWN) {
        format = detectFormatFromBuffer(fileBuffer);
      }

      // Check if format is supported
      if (!isSupportedFormat(format)) {
        throw new Error(`Unsupported audio format: ${getFormatName(format)}`);
      }

      // Decode based on format
      switch (format) {
        case AudioFormat.WAV:
          return this.decodeWav(fileBuffer);
        case AudioFormat.MP3:
          return this.decodeMp3(fileBuffer);
        case AudioFormat.OGG:
          return this.decodeOgg(fileBuffer);
        case AudioFormat.FLAC:
          return this.decodeFlac(fileBuffer);
        default:
          throw new Error(`Format decoding not implemented: ${getFormatName(format)}`);
      }
    } catch (error) {
      throw new Error(`Failed to load audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decode WAV file
   */
  private decodeWav(buffer: Buffer): AudioBuffer {
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
   * Decode MP3 file
   */
  private decodeMp3(buffer: Buffer): AudioBuffer {
    return MP3Decoder.decodeMp3(buffer);
  }

  /**
   * Decode OGG file
   */
  private decodeOgg(buffer: Buffer): AudioBuffer {
    return OGGDecoder.decodeOgg(buffer);
  }

  /**
   * Decode FLAC file
   */
  private decodeFlac(buffer: Buffer): AudioBuffer {
    return FLACDecoder.decodeFLAC(buffer);
  }

  /**
   * Capture from microphone (placeholder for live mode)
   */
  captureFromMicrophone(_durationSeconds: number): Promise<AudioBuffer> {
    // TODO: Implement microphone capture using a library like 'node-microphone' or 'sox'
    return Promise.reject(new Error('Microphone capture not yet implemented'));
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
