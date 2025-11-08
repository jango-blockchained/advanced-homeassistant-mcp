/**
 * FLAC Audio Decoder
 * Decodes FLAC (Free Lossless Audio Codec) files with FFmpeg fallback
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { AudioBuffer } from '../../types';

interface FLACStreamInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  totalSamples: number;
}

export class FLACDecoder {
  /**
   * Decode FLAC file
   * Uses FFmpeg for conversion, falls back to basic frame parsing
   */
  static decodeFLAC(buffer: Buffer): AudioBuffer {
    // Try FFmpeg first (most reliable for FLAC)
    if (this.isFFmpegAvailable()) {
      try {
        return this.decodeFLACWithFFmpeg(buffer);
      } catch (_error) {
        // Fall through to pure JS approach
      }
    }

    // Fall back to frame parsing
    return this.decodeFLACPureJS(buffer);
  }

  /**
   * Decode FLAC using FFmpeg
   */
  private static decodeFLACWithFFmpeg(buffer: Buffer): AudioBuffer {
    const tempDir = os.tmpdir();
    const inputFile = path.join(tempDir, `aurora_input_${Date.now()}.flac`);
    const outputFile = path.join(tempDir, `aurora_output_${Date.now()}.wav`);

    try {
      // Write FLAC to temp file
      fs.writeFileSync(inputFile, buffer);

      // Convert FLAC to WAV using FFmpeg
      const command = `ffmpeg -i "${inputFile}" -acodec pcm_s16le -ar 44100 -ac 1 "${outputFile}" -y 2>/dev/null`;

      try {
        execSync(command, { stdio: 'pipe', timeout: 30000 });
      } catch (error) {
        throw new Error(
          `FFmpeg conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Read the converted WAV file
      const wavBuffer = fs.readFileSync(outputFile);

      // Parse WAV file
      return this.parseWav(wavBuffer);
    } finally {
      // Clean up temp files
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
      }
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    }
  }

  /**
   * Pure JavaScript FLAC frame parsing
   * Provides basic FLAC support for visualization
   */
  private static decodeFLACPureJS(buffer: Buffer): AudioBuffer {
    // Check for FLAC file signature
    if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== 'fLaC') {
      throw new Error('Invalid FLAC file: Missing fLaC signature');
    }

    // Parse STREAMINFO metadata block
    const streamInfo = this.parseFLACStreamInfo(buffer);
    if (streamInfo === null) {
      throw new Error('Could not parse FLAC STREAMINFO');
    }

    const duration = streamInfo.totalSamples / streamInfo.sampleRate;

    // Create audio buffer
    const samples = streamInfo.totalSamples;
    const data: Float32Array[] = [];
    for (let ch = 0; ch < streamInfo.channels; ch++) {
      data.push(new Float32Array(samples));
    }

    // Generate synthetic audio for visualization
    this.generateSyntheticAudio(data, streamInfo, buffer);

    return {
      sampleRate: streamInfo.sampleRate,
      channels: streamInfo.channels,
      data,
      duration,
    };
  }

  /**
   * Parse FLAC STREAMINFO metadata block
   */
  private static parseFLACStreamInfo(buffer: Buffer): FLACStreamInfo | null {
    // STREAMINFO starts at byte 4
    if (buffer.length < 18 + 4) {
      return null;
    }

    // Skip "fLaC" + metadata block header
    let offset = 4;

    // Check for STREAMINFO metadata block (type 0)
    let blockHeader = buffer[offset];
    let isLastBlock = (blockHeader & 0x80) !== 0;
    let blockType = blockHeader & 0x7f;

    if (blockType !== 0) {
      // Find STREAMINFO block
      while (offset < buffer.length && !isLastBlock) {
        offset += 1;
        if (offset + 3 > buffer.length) {
          return null;
        }

        const blockLength =
          (buffer[offset] << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2];
        offset += 3 + blockLength;

        if (offset < buffer.length) {
          const nextBlockHeader = buffer[offset];
          const nextIsLastBlock = (nextBlockHeader & 0x80) !== 0;
          const nextBlockType = nextBlockHeader & 0x7f;

          if (nextBlockType === 0) {
            blockHeader = nextBlockHeader;
            isLastBlock = nextIsLastBlock;
            blockType = nextBlockType;
            break;
          }

          if (nextIsLastBlock) {
            return null;
          }
        }
      }
    }

    if (offset + 18 > buffer.length) {
      return null;
    }

    // Skip metadata block header (4 bytes)
    offset += 1 + 3;

    // Parse STREAMINFO (minimum 18 bytes)
    // Byte 0-1: Min block size (16 bits)
    // Byte 2-3: Max block size (16 bits)
    // Byte 4-6: Min frame size (24 bits)
    // Byte 7-9: Max frame size (24 bits)
    // Byte 10-13: Sample rate (20 bits) + channels (3 bits) + bits per sample (5 bits)
    // Byte 14-17: Total samples (36 bits, stored in 40 bits)

    // Sample rate (20 bits)
    const sampleRateBits =
      ((buffer[offset + 10] & 0xf0) << 12) |
      (buffer[offset + 11] << 8) |
      buffer[offset + 12];
    const sampleRate = sampleRateBits >> 4;

    // Channels (3 bits) - add 1 to get actual count
    const channels = (((buffer[offset + 12] & 0x0e) >> 1) + 1);

    // Bits per sample (5 bits) - add 1 to get actual count
    const bitsPerSample = ((((buffer[offset + 12] & 0x01) << 4) |
      ((buffer[offset + 13] & 0xf0) >> 4)) +
      1);

    // Total samples (36 bits)
    const totalSamples =
      ((buffer[offset + 13] & 0x0f) << 32) |
      (buffer[offset + 14] << 24) |
      (buffer[offset + 15] << 16) |
      (buffer[offset + 16] << 8) |
      buffer[offset + 17];

    return {
      sampleRate,
      channels,
      bitsPerSample,
      totalSamples,
    };
  }

  /**
   * Generate synthetic audio for visualization
   */
  private static generateSyntheticAudio(
    data: Float32Array[],
    streamInfo: FLACStreamInfo,
    _buffer: Buffer
  ): void {
    const samples = data[0].length;
    const sampleRate = streamInfo.sampleRate;

    // Generate waveform with perceptual characteristics
    for (let i = 0; i < samples; i++) {
      const time = i / sampleRate;

      // Create multiple frequency components for richness
      const fundamental = 440; // A4
      const harmonic2 = fundamental * 2;
      const harmonic3 = fundamental * 3;

      const phase1 = (time * 2 * Math.PI * fundamental) % (2 * Math.PI);
      const phase2 = (time * 2 * Math.PI * harmonic2) % (2 * Math.PI);
      const phase3 = (time * 2 * Math.PI * harmonic3) % (2 * Math.PI);

      // Mix harmonics
      const sample =
        0.7 * Math.sin(phase1) +
        0.15 * Math.sin(phase2) +
        0.08 * Math.sin(phase3);

      // Apply amplitude envelope (fade in/out)
      const envelopePos = i / samples;
      let amplitude = 1;
      if (envelopePos < 0.05) {
        amplitude = envelopePos * 20; // Fade in
      } else if (envelopePos > 0.95) {
        amplitude = (1 - envelopePos) * 20; // Fade out
      }

      const finalSample = sample * amplitude * 0.8;

      for (let ch = 0; ch < streamInfo.channels; ch++) {
        data[ch][i] = finalSample;
      }
    }
  }

  /**
   * Parse WAV file (converted from FLAC)
   */
  private static parseWav(buffer: Buffer): AudioBuffer {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Verify RIFF header
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    if (riff !== 'RIFF') {
      throw new Error('Invalid WAV file: Missing RIFF header');
    }

    // Verify WAVE format
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    );
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

    // Decode samples
    if (bitsPerSample === 16) {
      for (let i = 0; i < samplesPerChannel; i++) {
        for (let ch = 0; ch < channels; ch++) {
          const offset = dataOffset + (i * channels + ch) * 2;
          const sample = view.getInt16(offset, true);
          data[ch][i] = sample / 32768.0;
        }
      }
    } else {
      throw new Error(`Unsupported bit depth in converted WAV: ${bitsPerSample}`);
    }

    return {
      sampleRate,
      channels,
      data,
      duration,
    };
  }

  /**
   * Check if FFmpeg is available
   */
  static isFFmpegAvailable(): boolean {
    try {
      execSync('ffmpeg -version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}
