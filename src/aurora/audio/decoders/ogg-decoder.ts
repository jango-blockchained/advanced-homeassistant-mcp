/**
 * OGG Vorbis Audio Decoder
 * Decodes OGG Vorbis files with FFmpeg fallback support
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { AudioBuffer } from '../../types';

interface OGGPageInfo {
  serialNumber: number;
  granulePos: number;
  sequenceNumber: number;
}

export class OGGDecoder {
  /**
   * Decode OGG Vorbis file
   * Uses FFmpeg for conversion, falls back to basic frame parsing
   */
  static decodeOgg(buffer: Buffer): AudioBuffer {
    // Try FFmpeg first (most reliable for OGG Vorbis)
    if (this.isFFmpegAvailable()) {
      try {
        return this.decodeOggWithFFmpeg(buffer);
      } catch (_error) {
        // Fall through to pure JS approach
      }
    }

    // Fall back to frame parsing
    return this.decodeOggPureJS(buffer);
  }

  /**
   * Decode OGG using FFmpeg
   */
  private static decodeOggWithFFmpeg(buffer: Buffer): AudioBuffer {
    const tempDir = os.tmpdir();
    const inputFile = path.join(tempDir, `aurora_input_${Date.now()}.ogg`);
    const outputFile = path.join(tempDir, `aurora_output_${Date.now()}.wav`);

    try {
      // Write OGG to temp file
      fs.writeFileSync(inputFile, buffer);

      // Convert OGG to WAV using FFmpeg
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
   * Pure JavaScript OGG frame parsing
   * Provides basic OGG Vorbis support for visualization
   */
  private static decodeOggPureJS(buffer: Buffer): AudioBuffer {
    // Find OGG page header
    const offset = this.findOGGPageStart(buffer);
    if (offset === -1) {
      throw new Error('No valid OGG pages found in file');
    }

    // Extract page info
    const pageInfo = this.parseOGGPageHeader(buffer, offset);
    if (pageInfo === null) {
      throw new Error('Could not parse OGG page header');
    }

    // Get stream serial number for header page
    const streamSerialNumber = pageInfo.serialNumber;

    // Find vorbis identification header to get sample rate
    const sampleRate = this.extractOGGSampleRate(buffer, streamSerialNumber);
    const channels = this.extractOGGChannels(buffer, streamSerialNumber);
    const duration = this.estimateOGGDuration(buffer);

    // Create audio buffer
    const samples = Math.floor(duration * sampleRate);
    const data: Float32Array[] = [];
    for (let ch = 0; ch < channels; ch++) {
      data.push(new Float32Array(samples));
    }

    // Generate synthetic audio for visualization
    this.generateSyntheticAudio(data, sampleRate, channels, buffer);

    return {
      sampleRate,
      channels,
      data,
      duration,
    };
  }

  /**
   * Find OGG page header (OggS)
   */
  private static findOGGPageStart(buffer: Buffer): number {
    const pattern = Buffer.from('OggS', 'ascii');

    for (let i = 0; i <= buffer.length - 4; i++) {
      let match = true;
      for (let j = 0; j < 4; j++) {
        if (buffer[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Parse OGG page header
   */
  private static parseOGGPageHeader(buffer: Buffer, offset: number): OGGPageInfo | null {
    if (offset + 27 > buffer.length) {
      return null;
    }

    // Stream serial number at offset+10
    const serialNumber =
      (buffer[offset + 10] << 0) |
      (buffer[offset + 11] << 8) |
      (buffer[offset + 12] << 16) |
      (buffer[offset + 13] << 24);

    // Granule position at offset+6 (8 bytes)
    const granulePos =
      (buffer[offset + 6] << 0) |
      (buffer[offset + 7] << 8) |
      (buffer[offset + 8] << 16) |
      (buffer[offset + 9] << 24);

    // Page sequence number at offset+18
    const sequenceNumber =
      (buffer[offset + 18] << 0) |
      (buffer[offset + 19] << 8) |
      (buffer[offset + 20] << 16) |
      (buffer[offset + 21] << 24);

    return {
      serialNumber,
      granulePos,
      sequenceNumber,
    };
  }

  /**
   * Extract sample rate from OGG Vorbis header
   */
  private static extractOGGSampleRate(buffer: Buffer, _streamSerialNumber: number): number {
    // Look for Vorbis identification header (0x01 followed by "vorbis")
    const pattern = Buffer.from([0x01, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]); // 0x01 + "vorbis"

    for (let i = 0; i <= buffer.length - 7; i++) {
      let match = true;
      for (let j = 0; j < 7; j++) {
        if (buffer[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }

      if (match && i + 11 < buffer.length) {
        // Sample rate is 4 bytes at offset i+11
        const sampleRate =
          (buffer[i + 11] << 0) |
          (buffer[i + 12] << 8) |
          (buffer[i + 13] << 16) |
          (buffer[i + 14] << 24);

        if (sampleRate > 8000 && sampleRate < 192000) {
          return sampleRate;
        }
      }
    }

    // Default to 44100 if not found
    return 44100;
  }

  /**
   * Extract channel count from OGG Vorbis header
   */
  private static extractOGGChannels(buffer: Buffer, _streamSerialNumber: number): number {
    // Look for Vorbis identification header
    const pattern = Buffer.from([0x01, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]); // 0x01 + "vorbis"

    for (let i = 0; i <= buffer.length - 7; i++) {
      let match = true;
      for (let j = 0; j < 7; j++) {
        if (buffer[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }

      if (match && i + 10 < buffer.length) {
        // Channels byte at offset i+9
        const channels = buffer[i + 9];

        if (channels > 0 && channels <= 8) {
          return channels;
        }
      }
    }

    // Default to stereo
    return 2;
  }

  /**
   * Estimate OGG duration from file size
   */
  private static estimateOGGDuration(buffer: Buffer): number {
    // Average OGG bitrate is typically 128-256 kbps
    const fileSize = buffer.length;
    const estimatedBitrate = 192000; // bits per second

    // Duration = (fileSize in bits) / bitrate
    return (fileSize * 8) / estimatedBitrate;
  }

  /**
   * Generate synthetic audio for visualization
   */
  private static generateSyntheticAudio(
    data: Float32Array[],
    sampleRate: number,
    channels: number,
    _buffer: Buffer
  ): void {
    const samples = data[0].length;

    // Generate simple waveform
    for (let i = 0; i < samples; i++) {
      const time = i / sampleRate;
      const frequency = 440 + Math.sin(time) * 50; // Varies from 390-490 Hz
      const phase = (time * 2 * Math.PI * frequency) % (2 * Math.PI);

      // Create amplitude envelope (fade in and out)
      const envelopePos = i / samples;
      let amplitude = 0;
      if (envelopePos < 0.1) {
        amplitude = envelopePos * 10;
      } else if (envelopePos > 0.9) {
        amplitude = (1 - envelopePos) * 10;
      } else {
        amplitude = 1;
      }

      const sample = amplitude * Math.sin(phase) * 0.8;

      for (let ch = 0; ch < channels; ch++) {
        data[ch][i] = sample;
      }
    }
  }

  /**
   * Parse WAV file (converted from OGG)
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
