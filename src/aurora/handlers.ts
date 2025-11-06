/**
 * Aurora Tool Handlers
 * Implementation of MCP tool handlers for Aurora
 */

import {
  AudioCapture,
  AudioAnalyzer,
  DeviceScanner,
  DeviceProfiler,
  TimelineGenerator,
  TimelineExecutor,
  DEFAULT_CONFIG,
} from './index';
import type {
  AudioFeatures,
  LightDevice,
  DeviceProfile,
  RenderTimeline,
  RenderSettings,
} from './types';
import { getProfileManager } from './profiles';

/**
 * Aurora system state manager
 */
export class AuroraManager {
  private hassApi: any;
  private executor: TimelineExecutor | null = null;
  private timelines: Map<string, RenderTimeline> = new Map();
  private deviceProfiles: Map<string, DeviceProfile> = new Map();
  private currentTimeline: RenderTimeline | null = null;

  constructor(hassApi: any) {
    this.hassApi = hassApi;
  }

  /**
   * Handle: aurora_analyze_audio
   */
  async handleAnalyzeAudio(args: {
    audio_file: string;
    sample_rate?: number;
    fft_size?: number;
  }): Promise<AudioFeatures> {
    const sampleRate = args.sample_rate || DEFAULT_CONFIG.audio.sampleRate;
    const fftSize = args.fft_size || DEFAULT_CONFIG.audio.fftSize;

    const capture = new AudioCapture(sampleRate, 1);
    const audioBuffer = await capture.loadFromFile(args.audio_file);

    const analyzer = new AudioAnalyzer(fftSize, DEFAULT_CONFIG.audio.hopSize, audioBuffer.sampleRate);
    const features = await analyzer.analyze(audioBuffer);

    return features;
  }

  /**
   * Handle: aurora_scan_devices
   */
  async handleScanDevices(args: {
    area?: string;
    capability?: 'color' | 'color_temp' | 'brightness';
  }): Promise<{ devices: LightDevice[]; statistics: any }> {
    const scanner = new DeviceScanner(this.hassApi);
    let devices = await scanner.scanDevices(args.area);

    // Filter by capability if specified
    if (args.capability) {
      const capabilityMap = {
        color: 'supportsColor',
        color_temp: 'supportsColorTemp',
        brightness: 'supportsBrightness',
      };
      const capKey = capabilityMap[args.capability] as keyof typeof devices[0]['capabilities'];
      devices = devices.filter(d => d.capabilities[capKey] === true);
    }

    const statistics = scanner.getStatistics(devices);

    return {
      devices,
      statistics,
    };
  }

  /**
   * Handle: aurora_profile_device
   */
  async handleProfileDevice(args: {
    entity_id: string;
    iterations?: number;
  }): Promise<DeviceProfile> {
    const iterations = args.iterations || 3;

    // Get device info
    const scanner = new DeviceScanner(this.hassApi);
    const device = await scanner.getDeviceInfo(args.entity_id);
    
    if (!device) {
      throw new Error(`Device not found: ${args.entity_id}`);
    }

    // Profile the device
    const profiler = new DeviceProfiler(
      this.hassApi.callService.bind(this.hassApi),
      this.hassApi.getState.bind(this.hassApi)
    );

    const profile = await profiler.profileDevice(device, iterations);
    
    // Store profile
    this.deviceProfiles.set(args.entity_id, profile);

    return profile;
  }

  /**
   * Handle: aurora_render_timeline
   */
  async handleRenderTimeline(args: {
    audio_file: string;
    devices?: string[];
    intensity?: number;
    color_mapping?: 'frequency' | 'mood' | 'custom';
    beat_sync?: boolean;
    smooth_transitions?: boolean;
    timeline_name?: string;
  }): Promise<{ timeline: RenderTimeline; stats: any }> {
    // Analyze audio
    const capture = new AudioCapture();
    const analyzer = new AudioAnalyzer();
    const audioBuffer = await capture.loadFromFile(args.audio_file);
    const audioFeatures = await analyzer.analyze(audioBuffer);

    // Get devices
    const scanner = new DeviceScanner(this.hassApi);
    let devices = await scanner.scanDevices();

    // Filter by specified device IDs if provided
    if (args.devices && args.devices.length > 0) {
      devices = devices.filter(d => args.devices!.includes(d.entityId));
    }

    if (devices.length === 0) {
      throw new Error('No devices available for timeline rendering');
    }

    // Load profile manager and get adaptive interval
    const profileManager = await getProfileManager();
    const intensity = args.intensity ?? DEFAULT_CONFIG.rendering.intensity;
    
    let minCommandInterval: number;
    if (profileManager.hasProfiles()) {
      // Use adaptive interval based on intensity
      const deviceIds = devices.map(d => d.entityId);
      minCommandInterval = profileManager.getOptimalIntervalForDevices(deviceIds);
      
      // Further adapt based on intensity level
      const adaptiveInterval = profileManager.getAdaptiveInterval(intensity);
      minCommandInterval = Math.max(minCommandInterval, adaptiveInterval);
      
      // Validate against safe ranges
      minCommandInterval = profileManager.validateInterval(minCommandInterval);
    } else {
      // Fallback to default config if no profiles
      minCommandInterval = DEFAULT_CONFIG.rendering.minCommandInterval;
    }

    // Build render settings
    const renderSettings: RenderSettings = {
      intensity,
      colorMapping: args.color_mapping ?? DEFAULT_CONFIG.rendering.colorMapping,
      beatSync: args.beat_sync ?? DEFAULT_CONFIG.rendering.beatSync,
      brightnessMapping: DEFAULT_CONFIG.rendering.brightnessMapping,
      smoothTransitions: args.smooth_transitions ?? DEFAULT_CONFIG.rendering.smoothTransitions,
      minCommandInterval,
    };

    // Generate timeline
    const generator = new TimelineGenerator(renderSettings);
    const timeline = await generator.generateTimeline(
      audioFeatures,
      devices,
      this.deviceProfiles,
      renderSettings,
      {
        name: args.timeline_name,
        audioFile: args.audio_file,
      }
    );

    // Optimize timeline
    const optimizedTimeline = generator.optimizeTimeline(timeline);

    // Store timeline
    this.timelines.set(optimizedTimeline.id, optimizedTimeline);
    this.currentTimeline = optimizedTimeline;

    // Get statistics
    const stats = generator.getTimelineStats(optimizedTimeline);

    return {
      timeline: optimizedTimeline,
      stats,
    };
  }

  /**
   * Handle: aurora_play_timeline
   */
  async handlePlayTimeline(args: {
    timeline_id: string;
    start_position?: number;
    media_player?: string;
    audio_url?: string;
    local_audio?: boolean; // Default true - play on host system
  }): Promise<{ status: string; timeline: RenderTimeline; media_started?: boolean; local_audio?: boolean }> {
    const timeline = this.timelines.get(args.timeline_id);
    
    if (!timeline) {
      throw new Error(`Timeline not found: ${args.timeline_id}`);
    }

    // Create executor if needed
    if (!this.executor) {
      this.executor = new TimelineExecutor(
        this.hassApi.callService.bind(this.hassApi)
      );
    }

    const startPosition = args.start_position ?? 0;
    let mediaStarted = false;
    let localAudio = false;

    // Default behavior: play on local system if no media_player specified
    const useLocalAudio = args.local_audio !== false && !args.media_player;
    
    if (useLocalAudio && timeline.audioFile) {
      // Play audio locally on the host system
      try {
        await this.executor.play(timeline, startPosition, timeline.audioFile);
        localAudio = true;
      } catch (error) {
        throw new Error(`Failed to start local audio playback: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (args.media_player !== undefined && args.media_player !== '' && args.audio_url !== undefined && args.audio_url !== '') {
      // Play via Home Assistant media_player
      try {
        // Start music playback first
        await this.hassApi.callService('media_player', 'play_media', {
          entity_id: args.media_player,
          media_content_id: args.audio_url,
          media_content_type: 'music',
        });

        // If starting from a position, seek the media player
        if (startPosition > 0) {
          await this.hassApi.callService('media_player', 'media_seek', {
            entity_id: args.media_player,
            seek_position: startPosition,
          });
        }

        mediaStarted = true;

        // Small delay to ensure media player is starting
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Start timeline without local audio
        await this.executor.play(timeline, startPosition);
      } catch (error) {
        throw new Error(`Failed to start media playback: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // No audio, just lights
      await this.executor.play(timeline, startPosition);
    }

    this.currentTimeline = timeline;

    return {
      status: 'playing',
      timeline,
      media_started: mediaStarted,
      local_audio: localAudio,
    };
  }

  /**
   * Handle: aurora_control_playback
   */
  async handleControlPlayback(args: {
    action: 'pause' | 'resume' | 'stop' | 'seek';
    position?: number;
    media_player?: string;
  }): Promise<{ status: string; position: number }> {
    if (!this.executor) {
      throw new Error('No active playback');
    }

    // Control media player if provided
    if (args.media_player) {
      try {
        switch (args.action) {
          case 'pause':
            await this.hassApi.callService('media_player', 'media_pause', {
              entity_id: args.media_player,
            });
            break;
          case 'resume':
            await this.hassApi.callService('media_player', 'media_play', {
              entity_id: args.media_player,
            });
            break;
          case 'stop':
            await this.hassApi.callService('media_player', 'media_stop', {
              entity_id: args.media_player,
            });
            break;
          case 'seek':
            if (args.position !== undefined) {
              await this.hassApi.callService('media_player', 'media_seek', {
                entity_id: args.media_player,
                seek_position: args.position,
              });
            }
            break;
        }
      } catch (error) {
        // Continue with light control even if media player fails
      }
    }

    // Control light timeline
    switch (args.action) {
      case 'pause':
        this.executor.pause();
        break;
      case 'resume':
        this.executor.resume();
        break;
      case 'stop':
        this.executor.stop();
        break;
      case 'seek':
        if (args.position === undefined) {
          throw new Error('Position required for seek action');
        }
        this.executor.seek(args.position);
        break;
    }

    const state = this.executor.getState();
    return {
      status: state.state,
      position: state.position,
    };
  }

  /**
   * Handle: aurora_get_status
   */
  async handleGetStatus(args: {
    verbose?: boolean;
  }): Promise<any> {
    const status: any = {
      version: '0.1.0',
      timelines_loaded: this.timelines.size,
      devices_profiled: this.deviceProfiles.size,
    };

    if (this.executor) {
      const state = this.executor.getState();
      const queueStats = this.executor.getQueueStats();

      status.playback = {
        state: state.state,
        position: state.position,
        timeline_id: state.timeline?.id,
        timeline_name: state.timeline?.name,
        duration: state.timeline?.duration,
      };

      if (args.verbose) {
        status.playback.queue_stats = queueStats;
        status.playback.pending_commands = this.executor.getPendingCommandsCount();
      }
    } else {
      status.playback = { state: 'idle' };
    }

    if (args.verbose) {
      status.device_profiles = Array.from(this.deviceProfiles.entries()).map(([id, profile]) => ({
        entity_id: id,
        latency_ms: profile.latencyMs,
        last_calibrated: profile.lastCalibrated,
      }));

      status.timelines = Array.from(this.timelines.values()).map(t => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        devices: t.tracks.length,
        commands: t.metadata.commandCount,
      }));
    }

    return status;
  }

  /**
   * Handle: aurora_list_timelines
   */
  async handleListTimelines(args: {
    limit?: number;
  }): Promise<any[]> {
    const limit = args.limit || 10;
    const timelines = Array.from(this.timelines.values())
      .slice(0, limit)
      .map(t => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        audio_file: t.audioFile,
        devices: t.tracks.length,
        commands: t.metadata.commandCount,
        created_at: t.createdAt,
        bpm: t.audioFeatures.bpm,
        mood: t.audioFeatures.mood,
      }));

    return timelines;
  }

  /**
   * Handle: aurora_export_timeline
   */
  async handleExportTimeline(args: {
    timeline_id: string;
    output_path?: string;
  }): Promise<{ json: string; path?: string }> {
    const timeline = this.timelines.get(args.timeline_id);
    
    if (!timeline) {
      throw new Error(`Timeline not found: ${args.timeline_id}`);
    }

    const generator = new TimelineGenerator(DEFAULT_CONFIG.rendering);
    const json = generator.exportTimeline(timeline);

    // TODO: Save to file if output_path provided

    return {
      json,
      path: args.output_path,
    };
  }

  /**
   * Handle: aurora_import_timeline
   */
  async handleImportTimeline(args: {
    input_path: string;
  }): Promise<{ timeline: RenderTimeline }> {
    // TODO: Read from file
    throw new Error('Import not yet implemented');
  }

  /**
   * Get timeline by ID
   */
  getTimeline(id: string): RenderTimeline | undefined {
    return this.timelines.get(id);
  }

  /**
   * Get all device profiles
   */
  getDeviceProfiles(): Map<string, DeviceProfile> {
    return new Map(this.deviceProfiles);
  }

  /**
   * Clear all data
   */
  clear(): void {
    if (this.executor) {
      this.executor.stop();
    }
    this.timelines.clear();
    this.deviceProfiles.clear();
    this.currentTimeline = null;
  }
}
