/**
 * Local Audio Player
 * Plays audio files on the host system using available audio backends
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';

export interface AudioPlayerState {
  playing: boolean;
  paused: boolean;
  position: number; // seconds
  duration: number; // seconds
  audioFile: string | null;
}

export class LocalAudioPlayer {
  private process: ChildProcess | null = null;
  private state: AudioPlayerState = {
    playing: false,
    paused: false,
    position: 0,
    duration: 0,
    audioFile: null,
  };
  private startTime: number = 0;
  private pausePosition: number = 0;

  /**
   * Play an audio file on the local system
   * Supports: WAV, MP3, OGG, FLAC
   * 
   * Uses available audio players in priority order:
   * 1. ffplay (from ffmpeg) - Most compatible
   * 2. mpg123 - MP3 focused
   * 3. aplay - ALSA (WAV only)
   * 4. paplay - PulseAudio
   */
  async play(audioFile: string, startPosition: number = 0): Promise<void> {
    if (!existsSync(audioFile)) {
      throw new Error(`Audio file not found: ${audioFile}`);
    }

    // Stop any existing playback
    if (this.process) {
      this.stop();
    }

    // Detect file type
    const extension = audioFile.split('.').pop()?.toLowerCase();
    
    try {
      // Try ffplay first (most versatile)
      await this.playWithFFplay(audioFile, startPosition);
    } catch (error) {
      // Fallback to other players based on file type
      try {
        if (extension === 'mp3') {
          await this.playWithMpg123(audioFile, startPosition);
        } else if (extension === 'wav') {
          await this.playWithAplay(audioFile, startPosition);
        } else {
          throw new Error(`No suitable player found for .${extension} files`);
        }
      } catch (fallbackError) {
        throw new Error(
          `Failed to play audio: ${error instanceof Error ? error.message : String(error)}\n` +
          `Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}\n` +
          `Please install ffmpeg (ffplay) for best compatibility.`
        );
      }
    }

    this.state.audioFile = audioFile;
    this.state.playing = true;
    this.state.paused = false;
    this.state.position = startPosition;
    this.startTime = Date.now() - (startPosition * 1000);
  }

  /**
   * Play using ffplay (from ffmpeg suite)
   */
  private async playWithFFplay(audioFile: string, startPosition: number): Promise<void> {
    const args = [
      '-nodisp',      // No video display
      '-autoexit',    // Exit when done
      '-hide_banner', // Hide FFmpeg banner
      '-loglevel', 'quiet', // Quiet mode
    ];

    if (startPosition > 0) {
      args.push('-ss', startPosition.toString());
    }

    args.push(audioFile);

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn('ffplay', args, {
          stdio: 'ignore',
        });

        this.process.on('error', (error: Error) => {
          reject(new Error(`ffplay not found: ${error.message}`));
        });

        this.process.on('spawn', () => {
          resolve();
        });

        this.process.on('exit', (code) => {
          if (code !== 0 && code !== null && this.state.playing) {
            this.state.playing = false;
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Play using mpg123 (MP3 player)
   */
  private async playWithMpg123(audioFile: string, startPosition: number): Promise<void> {
    const args: string[] = [];

    if (startPosition > 0) {
      // mpg123 uses frame numbers, approximate: ~38 frames per second
      const frame = Math.floor(startPosition * 38);
      args.push('-k', frame.toString());
    }

    args.push(audioFile);

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn('mpg123', args, {
          stdio: 'ignore',
        });

        this.process.on('error', (error: Error) => {
          reject(new Error(`mpg123 not found: ${error.message}`));
        });

        this.process.on('spawn', () => {
          resolve();
        });

        this.process.on('exit', () => {
          this.state.playing = false;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Play using aplay (ALSA - WAV only)
   */
  private async playWithAplay(audioFile: string, startPosition: number): Promise<void> {
    if (startPosition > 0) {
      throw new Error('aplay does not support seeking. Use ffplay instead.');
    }

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn('aplay', [audioFile], {
          stdio: 'ignore',
        });

        this.process.on('error', (error: Error) => {
          reject(new Error(`aplay not found: ${error.message}`));
        });

        this.process.on('spawn', () => {
          resolve();
        });

        this.process.on('exit', () => {
          this.state.playing = false;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Pause playback
   * Note: Most CLI players don't support pause, so we stop and remember position
   */
  pause(): void {
    if (!this.state.playing || this.state.paused) {
      return;
    }

    this.pausePosition = this.getPosition();
    this.stop();
    this.state.paused = true;
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (!this.state.paused || !this.state.audioFile) {
      return;
    }

    await this.play(this.state.audioFile, this.pausePosition);
    this.state.paused = false;
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }

    this.state.playing = false;
    this.state.paused = false;
    this.state.position = 0;
  }

  /**
   * Seek to position (requires restart)
   */
  async seek(position: number): Promise<void> {
    if (!this.state.audioFile) {
      throw new Error('No audio file loaded');
    }

    const wasPlaying = this.state.playing && !this.state.paused;
    this.stop();

    if (wasPlaying) {
      await this.play(this.state.audioFile, position);
    } else {
      this.pausePosition = position;
      this.state.position = position;
    }
  }

  /**
   * Get current playback position
   */
  getPosition(): number {
    if (!this.state.playing) {
      return this.state.position;
    }

    if (this.state.paused) {
      return this.pausePosition;
    }

    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Get playback state
   */
  getState(): AudioPlayerState {
    return {
      ...this.state,
      position: this.getPosition(),
    };
  }

  /**
   * Check if player is active
   */
  isPlaying(): boolean {
    return this.state.playing && !this.state.paused;
  }

  /**
   * Static method to check available players
   */
  static async checkAvailablePlayers(): Promise<string[]> {
    const players = ['ffplay', 'mpg123', 'aplay', 'paplay'];
    const available: string[] = [];

    for (const player of players) {
      try {
        await new Promise((resolve, reject) => {
          const proc = spawn(player, ['--version'], { stdio: 'ignore' });
          proc.on('error', reject);
          proc.on('exit', (code) => {
            if (code === 0 || code === 1) { // Some players return 1 for --version
              resolve(true);
            } else {
              reject(new Error('Not found'));
            }
          });
        });
        available.push(player);
      } catch {
        // Player not available
      }
    }

    return available;
  }
}
