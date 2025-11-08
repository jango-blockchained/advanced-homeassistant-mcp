/**
 * Audio Downloader Module
 * Handles downloading audio from URLs with streaming and chunked analysis support
 */

import { logger } from '../../utils/logger.js';

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number | null;
  percentComplete: number;
}

export class AudioDownloader {
  private static readonly DEFAULT_CHUNK_SIZE = 262144; // 256KB chunks
  private static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max

  /**
   * Download audio from URL with streaming support
   * Returns full buffer for complete audio analysis
   */
  async downloadFromUrl(
    url: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<Buffer> {
    try {
      logger.info(`[AudioDownloader] Downloading audio from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aurora/1.0 (Audio Analysis)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

      // Check file size limit
      if (totalBytes && totalBytes > AudioDownloader.MAX_FILE_SIZE) {
        throw new Error(
          `Audio file too large: ${(totalBytes / 1024 / 1024).toFixed(1)}MB exceeds 500MB limit`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read response body');
      }

      const chunks: Uint8Array[] = [];
      let bytesDownloaded = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        bytesDownloaded += value.length;

        // Check size limit during download
        if (bytesDownloaded > AudioDownloader.MAX_FILE_SIZE) {
          reader.cancel();
          throw new Error('Download exceeded 500MB limit');
        }

        if (onProgress) {
          onProgress({
            bytesDownloaded,
            totalBytes,
            percentComplete: totalBytes ? (bytesDownloaded / totalBytes) * 100 : 0,
          });
        }
      }

      // Combine chunks into single buffer
      const totalSize = bytesDownloaded;
      const buffer = new Uint8Array(totalSize);
      let offset = 0;

      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      logger.info(
        `[AudioDownloader] Download complete: ${(bytesDownloaded / 1024 / 1024).toFixed(2)}MB`
      );

      return Buffer.from(buffer);
    } catch (error) {
      throw new Error(
        `Failed to download audio: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stream audio from URL for chunked analysis
   * Yields chunks suitable for progressive FFT analysis
   */
  async *streamFromUrl(
    url: string,
    chunkSize: number = AudioDownloader.DEFAULT_CHUNK_SIZE
  ): AsyncGenerator<{ chunk: Uint8Array; progress: DownloadProgress }> {
    try {
      logger.info(`[AudioDownloader] Streaming audio from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aurora/1.0 (Audio Analysis)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

      if (totalBytes && totalBytes > AudioDownloader.MAX_FILE_SIZE) {
        throw new Error(
          `Audio file too large: ${(totalBytes / 1024 / 1024).toFixed(1)}MB exceeds 500MB limit`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read response body');
      }

      let bytesDownloaded = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        bytesDownloaded += value.length;

        // Check size limit
        if (bytesDownloaded > AudioDownloader.MAX_FILE_SIZE) {
          reader.cancel();
          throw new Error('Download exceeded 500MB limit');
        }

        yield {
          chunk: value,
          progress: {
            bytesDownloaded,
            totalBytes,
            percentComplete: totalBytes ? (bytesDownloaded / totalBytes) * 100 : 0,
          },
        };
      }

      logger.info(
        `[AudioDownloader] Stream complete: ${(bytesDownloaded / 1024 / 1024).toFixed(2)}MB`
      );
    } catch (error) {
      throw new Error(
        `Failed to stream audio: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if input is a URL
   */
  static isUrl(input: string): boolean {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file extension from URL
   */
  static getExtensionFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const ext = pathname.split('.').pop() || '';
      return ext.toLowerCase();
    } catch {
      return '';
    }
  }
}
