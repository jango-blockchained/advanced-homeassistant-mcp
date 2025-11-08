/**
 * Aurora Audio Input Handler
 * Supports multiple audio sources and formats
 */

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type AudioSource = 
  | { type: 'file'; path: string }
  | { type: 'url'; url: string }
  | { type: 'youtube'; videoId: string }
  | { type: 'spotify'; uri: string }
  | { type: 'upload'; data: Buffer; filename: string };

export interface AudioInputResult {
  /** Local file path to audio */
  audioFile: string;
  /** Original source */
  source: AudioSource;
  /** Audio metadata */
  metadata: {
    duration: number;
    format: string;
    sampleRate: number;
    channels: number;
  };
  /** Whether file is temporary and should be cleaned up */
  isTemporary: boolean;
}

/**
 * Aurora Audio Input Handler
 * 
 * Handles various audio input sources:
 * - Local files (WAV, MP3, FLAC, OGG, M4A, AAC)
 * - URLs (direct audio links)
 * - YouTube videos (audio extraction)
 * - Spotify URIs (if credentials provided)
 * - Uploaded files
 * 
 * Automatically converts to WAV if needed for analysis
 */
export class AudioInputHandler {
  private readonly tempDir: string;
  private readonly supportedFormats = ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac', 'opus', 'wma'];

  constructor() {
    this.tempDir = join(tmpdir(), 'aurora-audio');
  }

  /**
   * Process audio input from any source
   */
  async processInput(source: AudioSource): Promise<AudioInputResult> {
    switch (source.type) {
      case 'file':
        return await this.processLocalFile(source.path);
      
      case 'url':
        return await this.processURL(source.url);
      
      case 'youtube':
        return await this.processYouTube(source.videoId);
      
      case 'spotify':
        return await this.processSpotify(source.uri);
      
      case 'upload':
        return await this.processUpload(source.data, source.filename);
      
      default:
        throw new Error(`Unsupported source type: ${(source as AudioSource).type}`);
    }
  }

  /**
   * Process local audio file
   */
  private async processLocalFile(filePath: string): Promise<AudioInputResult> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const format = filePath.split('.').pop()?.toLowerCase() || '';
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Get audio metadata
    const metadata = await this.getAudioMetadata(filePath);

    // Convert to WAV if needed
    let audioFile = filePath;
    let isTemporary = false;

    if (format !== 'wav') {
      audioFile = await this.convertToWAV(filePath);
      isTemporary = true;
    }

    return {
      audioFile,
      source: { type: 'file', path: filePath },
      metadata,
      isTemporary,
    };
  }

  /**
   * Process audio from URL
   */
  private async processURL(url: string): Promise<AudioInputResult> {
    // Download audio
    const tempFile = join(this.tempDir, `download-${Date.now()}.audio`);
    await this.downloadFile(url, tempFile);

    // Detect format and convert if needed
    const format = await this.detectFormat(tempFile);
    const wavFile = await this.convertToWAV(tempFile);
    const metadata = await this.getAudioMetadata(wavFile);

    // Clean up temp download
    await unlink(tempFile);

    return {
      audioFile: wavFile,
      source: { type: 'url', url },
      metadata,
      isTemporary: true,
    };
  }

  /**
   * Process YouTube video audio
   * Requires yt-dlp or youtube-dl
   */
  private async processYouTube(videoId: string): Promise<AudioInputResult> {
    const outputFile = join(this.tempDir, `youtube-${videoId}-${Date.now()}.wav`);

    // Use yt-dlp to extract audio and convert to WAV
    await new Promise<void>((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '-x', // Extract audio
        '--audio-format', 'wav',
        '--audio-quality', '0', // Best quality
        '-o', outputFile,
        `https://youtube.com/watch?v=${videoId}`,
      ]);

      ytdlp.on('error', (error) => {
        reject(new Error(`yt-dlp not found: ${error.message}. Install with: pip install yt-dlp`));
      });

      ytdlp.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp failed with code ${code}`));
        }
      });
    });

    const metadata = await this.getAudioMetadata(outputFile);

    return {
      audioFile: outputFile,
      source: { type: 'youtube', videoId },
      metadata,
      isTemporary: true,
    };
  }

  /**
   * Process Spotify track
   * Requires spotify-ripper or spotdl
   */
  private async processSpotify(uri: string): Promise<AudioInputResult> {
    // Extract track ID from URI (spotify:track:xxxxx or spotify.com/track/xxxxx)
    const trackId = uri.split('/').pop()?.split(':').pop() || uri;
    const outputFile = join(this.tempDir, `spotify-${trackId}-${Date.now()}.wav`);

    // Use spotdl to download and convert
    await new Promise<void>((resolve, reject) => {
      const spotdl = spawn('spotdl', [
        uri,
        '--output', outputFile,
        '--format', 'wav',
      ]);

      spotdl.on('error', (error) => {
        reject(new Error(`spotdl not found: ${error.message}. Install with: pip install spotdl`));
      });

      spotdl.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`spotdl failed with code ${code}`));
        }
      });
    });

    const metadata = await this.getAudioMetadata(outputFile);

    return {
      audioFile: outputFile,
      source: { type: 'spotify', uri },
      metadata,
      isTemporary: true,
    };
  }

  /**
   * Process uploaded audio data
   */
  private async processUpload(data: Buffer, filename: string): Promise<AudioInputResult> {
    const format = filename.split('.').pop()?.toLowerCase() || '';
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Save uploaded file
    const tempFile = join(this.tempDir, `upload-${Date.now()}-${filename}`);
    await writeFile(tempFile, data);

    // Convert to WAV if needed
    let audioFile = tempFile;
    let isTemporary = true;

    if (format !== 'wav') {
      audioFile = await this.convertToWAV(tempFile);
      await unlink(tempFile); // Clean up original upload
    }

    const metadata = await this.getAudioMetadata(audioFile);

    return {
      audioFile,
      source: { type: 'upload', data, filename },
      metadata,
      isTemporary,
    };
  }

  /**
   * Convert audio to WAV format using FFmpeg
   */
  private async convertToWAV(inputFile: string): Promise<string> {
    const outputFile = inputFile.replace(/\.[^.]+$/, '') + '-converted.wav';

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputFile,
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '1', // Mono
        '-y', // Overwrite
        outputFile,
      ]);

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg not found: ${error.message}`));
      });

      ffmpeg.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg conversion failed with code ${code}`));
        }
      });
    });

    return outputFile;
  }

  /**
   * Get audio metadata using FFprobe
   */
  private async getAudioMetadata(audioFile: string): Promise<{
    duration: number;
    format: string;
    sampleRate: number;
    channels: number;
  }> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        audioFile,
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`FFprobe not found: ${error.message}`));
      });

      ffprobe.on('exit', (code) => {
        if (code === 0) {
          try {
            const data = JSON.parse(output);
            const audioStream = data.streams.find((s: { codec_type: string }) => s.codec_type === 'audio');
            
            resolve({
              duration: parseFloat(data.format.duration),
              format: data.format.format_name,
              sampleRate: parseInt(audioStream.sample_rate),
              channels: parseInt(audioStream.channels),
            });
          } catch (error) {
            reject(new Error('Failed to parse FFprobe output'));
          }
        } else {
          reject(new Error(`FFprobe failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string, outputPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);
  }

  /**
   * Detect audio format from file
   */
  private async detectFormat(filePath: string): Promise<string> {
    const metadata = await this.getAudioMetadata(filePath);
    return metadata.format.split(',')[0]; // First format from list
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(audioFile: string, isTemporary: boolean): Promise<void> {
    if (isTemporary && existsSync(audioFile)) {
      await unlink(audioFile);
    }
  }
}
