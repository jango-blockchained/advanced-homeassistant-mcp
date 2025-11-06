/**
 * Timeline Executor
 * Executes pre-rendered timelines with precise timing
 */

import type {
  RenderTimeline,
  ExecutionState,
  ExecutionCommand,
  QueueStats,
  TimedCommand,
} from '../types';

export class TimelineExecutor {
  private hassCallService: (domain: string, service: string, data: any) => Promise<any>;
  private state: ExecutionState;
  private commandQueue: ExecutionCommand[];
  private playbackTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  constructor(hassCallService: (domain: string, service: string, data: any) => Promise<any>) {
    this.hassCallService = hassCallService;
    this.commandQueue = [];
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
  async play(timeline: RenderTimeline, startPosition: number = 0): Promise<void> {
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
    this.state.state = 'paused';
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.state.state !== 'paused') {
      return;
    }

    this.state.state = 'playing';
    this.startTime = Date.now() - (this.state.position * 1000);
    this.startPlaybackLoop();
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.stopPlaybackLoop();
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
   * Queue all commands from timeline
   */
  private queueCommands(timeline: RenderTimeline, startPosition: number): void {
    this.commandQueue = [];

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

        this.commandQueue.push(executionCommand);
      }
    }

    // Sort by scheduled time
    this.commandQueue.sort((a, b) => a.scheduledTime - b.scheduledTime);

    this.state.queueStats.queued = this.commandQueue.length;
  }

  /**
   * Start the playback loop
   */
  private startPlaybackLoop(): void {
    // Execute commands at ~60fps for smooth timing
    this.playbackTimer = setInterval(() => {
      this.executeScheduledCommands();
    }, 16); // ~60fps
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

    // Find commands to execute
    const commandsToExecute: ExecutionCommand[] = [];

    for (const cmd of this.commandQueue) {
      if (cmd.status === 'pending' && cmd.scheduledTime <= currentTime) {
        commandsToExecute.push(cmd);
      }
    }

    // Execute commands
    for (const cmd of commandsToExecute) {
      this.executeCommand(cmd);
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
      const serviceData: any = {
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
      
      // TODO: Implement retry logic
      console.error(`Failed to execute command for ${cmd.entityId}:`, error);
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

    // Reset queue from new position
    this.queueCommands(this.state.timeline, position);
    this.state.position = position;

    if (wasPlaying) {
      this.resume();
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
