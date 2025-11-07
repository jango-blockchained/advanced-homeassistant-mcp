/**
 * Timeline Executor
 * Executes pre-rendered timelines with precise timing
 */

import type {
  RenderTimeline,
  ExecutionState,
  ExecutionCommand,
  QueueStats,
} from '../types';
import { LocalAudioPlayer } from '../audio/player';

export class TimelineExecutor {
  private hassCallService: (domain: string, service: string, data: Record<string, unknown>) => Promise<unknown>;
  private state: ExecutionState;
  private commandQueue: ExecutionCommand[];
  private playbackTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private audioPlayer: LocalAudioPlayer | null = null;
  
  // Sliding window parameters to prevent unbounded queue growth
  private readonly MAX_QUEUE_SIZE = 5000; // Max commands in memory
  private readonly LOOKAHEAD_SECONDS = 2.0; // Queue commands 2 seconds ahead
  private queueStartIndex: number = 0; // Track start of sliding window
  private allCommands: ExecutionCommand[] = []; // All commands from timeline (sorted)

  constructor(hassCallService: (domain: string, service: string, data: Record<string, unknown>) => Promise<unknown>) {
    this.hassCallService = hassCallService;
    this.commandQueue = [];
    this.allCommands = [];
    this.state = {
      state: 'idle',
      position: 0,
      mode: 'prerendered',
      queueStats: {
        queued: 0,
        executed: 0,
        failed: 0,
        avgLatency: 0,
      },
    };
  }

  /**
   * Start playback of a timeline
   */
  async play(timeline: RenderTimeline, startPosition: number = 0, audioFile?: string): Promise<void> {
    if (this.state.state === 'playing') {
      throw new Error('Timeline is already playing');
    }

    // Initialize state
    this.state = {
      state: 'playing',
      timeline,
      position: startPosition,
      startedAt: new Date(),
      mode: 'prerendered',
      queueStats: {
        queued: 0,
        executed: 0,
        failed: 0,
        avgLatency: 0,
      },
    };

    // Queue all commands
    this.queueCommands(timeline, startPosition);

    // Start local audio playback if audio file provided
    if (audioFile) {
      if (!this.audioPlayer) {
        this.audioPlayer = new LocalAudioPlayer();
      }
      await this.audioPlayer.play(audioFile, startPosition);
    }

    // Start playback
    this.startTime = Date.now() - (startPosition * 1000);
    this.startPlaybackLoop();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.state.state !== 'playing') {
      return;
    }

    this.stopPlaybackLoop();
    
    // Pause local audio if playing
    if (this.audioPlayer?.isPlaying() === true) {
      this.audioPlayer.pause();
    }
    
    this.state.state = 'paused';
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.state.state !== 'paused') {
      return;
    }

    this.state.state = 'playing';
    this.startTime = Date.now() - (this.state.position * 1000);
    
    // Resume local audio if it was playing
    if (this.audioPlayer) {
      await this.audioPlayer.resume();
    }
    
    this.startPlaybackLoop();
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.stopPlaybackLoop();
    
    // Stop local audio
    if (this.audioPlayer) {
      this.audioPlayer.stop();
    }
    
    this.commandQueue = [];
    this.state.state = 'stopped';
    this.state.position = 0;
  }

  /**
   * Get current execution state
   */
  getState(): ExecutionState {
    return { ...this.state };
  }

  /**
   * Queue commands from timeline using sliding window to prevent unbounded growth
   * Instead of queuing all commands upfront, we load just-in-time with lookahead
   */
  private queueCommands(timeline: RenderTimeline, startPosition: number): void {
    // Store all commands sorted by timestamp (for random access)
    this.allCommands = [];
    for (const track of timeline.tracks) {
      for (const command of track.commands) {
        // Skip commands before start position
        if (command.timestamp < startPosition) {
          continue;
        }

        const executionCommand: ExecutionCommand = {
          entityId: track.entityId,
          command,
          scheduledTime: command.timestamp,
          retries: 0,
          status: 'pending',
        };

        this.allCommands.push(executionCommand);
      }
    }

    // Sort all commands by timestamp
    this.allCommands.sort((a, b) => a.scheduledTime - b.scheduledTime);

    // Initialize sliding window: load first batch of commands
    this.queueStartIndex = 0;
    this.updateSlidingWindow(startPosition);

    // Report initial queue size
    this.state.queueStats.queued = this.commandQueue.length;
  }

  /**
   * Update the sliding window of commands to execute
   * Keeps only commands within LOOKAHEAD_SECONDS of current time in memory
   */
  private updateSlidingWindow(currentTime: number): void {
    // Calculate window bounds
    const windowStart = currentTime;
    const windowEnd = currentTime + this.LOOKAHEAD_SECONDS;

    // Find start index (commands that are still pending)
    let startIdx = this.queueStartIndex;
    while (startIdx < this.allCommands.length && 
           this.allCommands[startIdx].scheduledTime < windowStart &&
           this.allCommands[startIdx].status !== 'pending') {
      startIdx++;
    }

    // Find end index (commands within lookahead window)
    let endIdx = startIdx;
    let commandCount = 0;
    while (endIdx < this.allCommands.length &&
           this.allCommands[endIdx].scheduledTime <= windowEnd &&
           commandCount < this.MAX_QUEUE_SIZE) {
      if (this.allCommands[endIdx].status === 'pending') {
        commandCount++;
      }
      endIdx++;
    }

    // Extract window into commandQueue
    this.commandQueue = this.allCommands.slice(startIdx, endIdx);
    this.queueStartIndex = startIdx;

    // Update stats
    this.state.queueStats.queued = this.commandQueue.filter(
      cmd => cmd.status === 'pending'
    ).length;
  }

  /**
   * Start the playback loop
   */
  private startPlaybackLoop(): void {
    // Execute commands at a slower rate to avoid overwhelming Home Assistant
    // 10 checks per second = 5 commands per check max = ~50 commands/sec max
    this.playbackTimer = setInterval(() => {
      this.executeScheduledCommands();
    }, 100); // 10 times per second
  }

  /**
   * Stop the playback loop
   */
  private stopPlaybackLoop(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * Execute commands that are due
   */
  private executeScheduledCommands(): void {
    const currentTime = (Date.now() - this.startTime) / 1000;
    this.state.position = currentTime;

    // Update sliding window: load new commands if approaching end of current window
    if (currentTime > (this.commandQueue[0]?.scheduledTime || 0) + this.LOOKAHEAD_SECONDS - 0.5) {
      this.updateSlidingWindow(currentTime);
    }

    // Find commands to execute (with lookahead window to prevent flooding)
    const commandsToExecute: ExecutionCommand[] = [];
    const maxCommandsPerTick = 2; // Based on profiling: ~2 commands/device/sec safe
    const lookaheadWindow = 0.1; // 100ms lookahead window

    for (const cmd of this.commandQueue) {
      if (cmd.status === 'pending' && 
          cmd.scheduledTime <= (currentTime + lookaheadWindow)) {
        commandsToExecute.push(cmd);
        
        // Limit commands per tick to avoid overwhelming HA (profiled at 8 cmd/sec total)
        if (commandsToExecute.length >= maxCommandsPerTick) {
          break;
        }
      }
    }

    // Execute commands (non-blocking)
    for (const cmd of commandsToExecute) {
      void this.executeCommand(cmd); // Mark as intentionally not awaited
    }

    // Check if timeline is complete
    if (this.state.timeline && currentTime >= this.state.timeline.duration) {
      this.stop();
    }
  }

  /**
   * Execute a single command
   */
  private async executeCommand(cmd: ExecutionCommand): Promise<void> {
    cmd.status = 'executing';

    try {
      const startTime = Date.now();

      // Build service call data
      const serviceData: Record<string, unknown> = {
        entity_id: cmd.entityId,
        ...cmd.command.params,
      };

      // Determine service based on command type
      let service = 'turn_on';
      switch (cmd.command.type) {
        case 'turn_off':
          service = 'turn_off';
          break;
        case 'turn_on':
        case 'set_color':
        case 'set_brightness':
        case 'set_color_temp':
          service = 'turn_on';
          break;
      }

      // Execute command
      await this.hassCallService('light', service, serviceData);

      // Update stats
      const latency = Date.now() - startTime;
      cmd.status = 'completed';
      this.state.queueStats.executed++;
      this.updateAverageLatency(latency);

    } catch (error) {
      cmd.status = 'failed';
      this.state.queueStats.failed++;
      
      // Log error for debugging
      if (error instanceof Error) {
        // Error logged but not thrown to avoid breaking playback
      }
    }
  }

  /**
   * Update average latency calculation
   */
  private updateAverageLatency(newLatency: number): void {
    const stats = this.state.queueStats;
    const totalExecuted = stats.executed;
    
    if (totalExecuted === 1) {
      stats.avgLatency = newLatency;
    } else {
      // Running average
      stats.avgLatency = 
        (stats.avgLatency * (totalExecuted - 1) + newLatency) / totalExecuted;
    }
  }

  /**
   * Seek to a specific position in the timeline
   */
  async seek(position: number): Promise<void> {
    if (!this.state.timeline) {
      throw new Error('No timeline loaded');
    }

    const wasPlaying = this.state.state === 'playing';
    
    if (wasPlaying) {
      this.pause();
    }

    // Seek local audio if playing
    if (this.audioPlayer) {
      await this.audioPlayer.seek(position);
    }

    // Reset queue from new position
    this.queueCommands(this.state.timeline, position);
    this.state.position = position;

    if (wasPlaying) {
      await this.resume();
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    return { ...this.state.queueStats };
  }

  /**
   * Get pending commands count
   */
  getPendingCommandsCount(): number {
    return this.commandQueue.filter(cmd => cmd.status === 'pending').length;
  }

  /**
   * Clear all pending commands (emergency stop)
   */
  clearQueue(): void {
    this.commandQueue = [];
    this.stopPlaybackLoop();
    this.state.state = 'stopped';
  }
}
