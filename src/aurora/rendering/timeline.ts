/**
 * Timeline Generator
 * Creates synchronized lighting timelines from audio features
 */

import type {
  AudioFeatures,
  LightDevice,
  DeviceProfile,
  RenderTimeline,
  DeviceTrack,
  TimedCommand,
  RenderSettings,
  RenderMetadata,
} from '../types';
import { AudioLightMapper } from './mapper';
import { SynchronizationCalculator } from './synchronizer';
import { v4 as uuidv4 } from 'uuid';

export class TimelineGenerator {
  private mapper: AudioLightMapper;
  private synchronizer: SynchronizationCalculator;

  constructor(settings: RenderSettings) {
    this.mapper = new AudioLightMapper(settings);
    this.synchronizer = new SynchronizationCalculator();
  }

  /**
   * Generate a complete timeline from audio features and devices
   */
  async generateTimeline(
    audioFeatures: AudioFeatures,
    devices: LightDevice[],
    profiles: Map<string, DeviceProfile>,
    settings: RenderSettings,
    options: TimelineOptions = {}
  ): Promise<RenderTimeline> {
    const startTime = Date.now();

    // Update mapper settings
    this.mapper.updateSettings(settings);

    // Calculate reference latency for synchronization
    const referenceLatency = this.synchronizer.calculateReferenceLatency(devices, profiles);

    // Generate device tracks
    const tracks: DeviceTrack[] = [];
    let totalCommands = 0;

    for (const device of devices) {
      const profile = profiles.get(device.entityId);
      const track = await this.generateDeviceTrack(
        device,
        profile,
        audioFeatures,
        referenceLatency,
        settings,
        options
      );
      
      tracks.push(track);
      totalCommands += track.commands.length;
    }

    // Create metadata
    const processingTime = (Date.now() - startTime) / 1000;
    const metadata: RenderMetadata = {
      version: '0.1.0',
      settings,
      deviceCount: devices.length,
      commandCount: totalCommands,
      processingTime,
    };

    // Create timeline
    const timeline: RenderTimeline = {
      id: options.id || uuidv4(),
      name: options.name || `Timeline ${new Date().toISOString()}`,
      audioFile: options.audioFile,
      audioFeatures,
      duration: audioFeatures.duration,
      tracks,
      metadata,
      createdAt: new Date(),
    };

    return timeline;
  }

  /**
   * Generate commands for a single device with optimized parameters
   */
  private async generateDeviceTrack(
    device: LightDevice,
    profile: DeviceProfile | undefined,
    audioFeatures: AudioFeatures,
    referenceLatency: number,
    settings: RenderSettings,
    options: TimelineOptions
  ): Promise<DeviceTrack> {
    const commands: TimedCommand[] = [];

    // Calculate compensation for this device
    const compensationMs = this.synchronizer.calculateCompensation(
      device,
      profile,
      referenceLatency
    );

    // Get zone settings if device is in a zone
    const zoneSettings = device.area && settings.zoneSettings 
      ? settings.zoneSettings[device.area]
      : undefined;

    // Use optimized transition times from profile if available
    const transitionTime = profile 
      ? Math.min(profile.maxTransitionMs, settings.minCommandInterval) / 1000
      : settings.minCommandInterval / 1000;

    // Generate commands based on frequency data
    let lastCommandTime = -settings.minCommandInterval / 1000;

    for (const slice of audioFeatures.frequencyData) {
      // Skip if too close to last command
      if (slice.timestamp - lastCommandTime < settings.minCommandInterval / 1000) {
        continue;
      }

      // Check if this timestamp is a beat
      const isBeat = this.mapper.isBeat(slice.timestamp, audioFeatures.beats);

      // Generate command parameters optimized for device capabilities
      const params = this.generateOptimizedCommand(
        device,
        slice,
        isBeat,
        zoneSettings,
        profile,
        transitionTime
      );

      // Determine command type based on capabilities and parameters
      let commandType: TimedCommand['type'] = 'turn_on';
      
      if (params.rgb_color && device.capabilities.supportsColor) {
        commandType = 'set_color';
      } else if (params.effect && device.capabilities.supportsEffects) {
        commandType = 'effect';
      } else if (params.brightness !== undefined && device.capabilities.supportsBrightness) {
        commandType = 'set_brightness';
      } else if (params.color_temp !== undefined && device.capabilities.supportsColorTemp) {
        commandType = 'set_color_temp';
      }

      // Create command
      const command: TimedCommand = {
        timestamp: slice.timestamp,
        type: commandType,
        params,
      };

      commands.push(command);
      lastCommandTime = slice.timestamp;
    }

    // Add beat emphasis commands if enabled
    if (settings.beatSync) {
      this.addBeatEmphasisCommands(commands, audioFeatures.beats, device, profile, settings);
    }

    // Optimize timeline by removing redundant commands
    const optimizedCommands = this.removeRedundantCommands(commands);

    // Apply synchronization compensation
    const compensatedCommands = this.synchronizer.compensateCommands(
      optimizedCommands,
      compensationMs
    );

    return {
      entityId: device.entityId,
      deviceName: device.name,
      commands: compensatedCommands,
      compensationMs,
    };
  }

  /**
   * Generate command parameters optimized for device profile and capabilities
   */
  private generateOptimizedCommand(
    device: LightDevice,
    slice: FrequencySlice,
    isBeat: boolean,
    zoneSettings: ZoneSettings | undefined,
    profile: DeviceProfile | undefined,
    transitionTime: number
  ): CommandParams {
    const params: CommandParams = {};

    // Apply zone-specific intensity multiplier
    const zoneIntensity = zoneSettings?.intensityMultiplier ?? 1.0;
    const effectiveIntensity = this.mapper.settings.intensity * zoneIntensity;

    // Color mapping with device capability awareness
    if (device.capabilities.supportsColor) {
      const colorMapping = zoneSettings?.colorMapping || this.mapper.settings.colorMapping;
      const originalMapping = this.mapper.settings.colorMapping;
      this.mapper.settings.colorMapping = colorMapping;
      
      const color = this.mapper.mapFrequencyToColor(slice);
      params.rgb_color = this.optimizeColorForDevice(color, device, profile);
      
      this.mapper.settings.colorMapping = originalMapping;
    }

    // Brightness mapping with profile optimization
    if (device.capabilities.supportsBrightness) {
      const brightness = this.mapper.mapAmplitudeToBrightness(slice);
      const optimizedBrightness = Math.round(brightness * effectiveIntensity);
      
      // Clamp to device brightness range
      const minBrightness = device.capabilities.minBrightness ?? 0;
      const maxBrightness = device.capabilities.maxBrightness ?? 255;
      
      params.brightness = Math.max(
        minBrightness,
        Math.min(maxBrightness, optimizedBrightness)
      );

      // Apply brightness curve compensation if available
      if (profile?.brightnessCurve) {
        params.brightness = this.applyBrightnessCurveCompensation(
          params.brightness,
          profile.brightnessCurve
        );
      }
    }

    // Color temperature for devices that support it but not RGB
    if (
      device.capabilities.supportsColorTemp &&
      !device.capabilities.supportsColor
    ) {
      const colorTemp = this.mapper.mapFrequencyToColorTemp(slice, device);
      params.color_temp = colorTemp;
    }

    // Beat synchronization with device-aware effects
    if (this.mapper.settings.beatSync && isBeat) {
      if (device.capabilities.supportsEffects && device.capabilities.effects?.length) {
        // Use effect-based beat emphasis if device supports it
        const beatEffect = this.selectBeatEffect(device, profile);
        if (beatEffect) {
          params.effect = beatEffect;
          params.transition = 0; // Effects are instant
        }
      } else if (params.brightness !== undefined) {
        // Fallback: boost brightness on beats
        params.brightness = Math.min(255, params.brightness * 1.2);
      }
    }

    // Transition time optimized for device profile
    params.transition = this.selectOptimalTransitionTime(device, profile, transitionTime);

    return params;
  }

  /**
   * Optimize color output for device capabilities
   */
  private optimizeColorForDevice(
    color: [number, number, number],
    device: LightDevice,
    profile: DeviceProfile | undefined
  ): [number, number, number] {
    // If device has color accuracy profile, apply correction
    if (profile?.colorAccuracy && profile.colorAccuracy < 0.95) {
      // Reduce intensity slightly for devices with lower color accuracy
      const correctionFactor = profile.colorAccuracy;
      return [
        Math.round(color[0] * correctionFactor),
        Math.round(color[1] * correctionFactor),
        Math.round(color[2] * correctionFactor),
      ];
    }

    return color;
  }

  /**
   * Apply brightness curve compensation
   */
  private applyBrightnessCurveCompensation(
    requestedBrightness: number,
    brightnessCurve: any
  ): number {
    // TODO: Implement brightness curve compensation
    // This would apply inverse curve transformation to account for
    // non-linear brightness response
    return requestedBrightness;
  }

  /**
   * Select optimal beat effect based on device and profile
   */
  private selectBeatEffect(
    device: LightDevice,
    profile: DeviceProfile | undefined
  ): string | undefined {
    if (!device.capabilities.effects || device.capabilities.effects.length === 0) {
      return undefined;
    }

    // Prefer fast-responding effects
    if (profile?.effectsPerformance) {
      const fastEffects = profile.effectsPerformance.filter(
        e => e.supported && e.responseTimeMs && e.responseTimeMs < 200
      );

      if (fastEffects.length > 0) {
        // Pick a strobe/flash effect if available
        const flashEffect = fastEffects.find(e =>
          e.effectName.toLowerCase().includes('flash') ||
          e.effectName.toLowerCase().includes('strobe')
        );
        return flashEffect?.effectName || fastEffects[0].effectName;
      }
    }

    // Default to first available effect
    return device.capabilities.effects[0];
  }

  /**
   * Select optimal transition time based on device profile
   */
  private selectOptimalTransitionTime(
    device: LightDevice,
    profile: DeviceProfile | undefined,
    suggestedTime: number
  ): number {
    if (!profile) {
      return suggestedTime;
    }

    // Clamp suggested time to device's proven capabilities
    const clamped = Math.max(
      profile.minTransitionMs / 1000,
      Math.min(profile.maxTransitionMs / 1000, suggestedTime)
    );

    return clamped;
  }

  /**
   * Add special emphasis commands on beats
   */
  private addBeatEmphasisCommands(
    commands: TimedCommand[],
    beats: number[],
    device: LightDevice,
    settings: RenderSettings
  ): void {
    for (const beatTime of beats) {
      // Find closest existing command
      const closestCommand = commands.reduce((closest, cmd) => {
        const currentDist = Math.abs(cmd.timestamp - beatTime);
        const closestDist = Math.abs(closest.timestamp - beatTime);
        return currentDist < closestDist ? cmd : closest;
      });

      // If close enough, enhance that command
      if (Math.abs(closestCommand.timestamp - beatTime) < 0.1) {
        // Boost brightness on beats
        if (closestCommand.params.brightness !== undefined) {
          closestCommand.params.brightness = Math.min(
            255,
            closestCommand.params.brightness * 1.3
          );
        }
      } else {
        // Add new beat flash command
        if (device.capabilities.supportsBrightness) {
          const beatCommand: TimedCommand = {
            timestamp: beatTime,
            type: 'set_brightness',
            params: {
              brightness: Math.round(255 * settings.intensity),
              transition: 0.05, // Quick flash
            },
          };
          commands.push(beatCommand);
        }
      }
    }

    // Re-sort commands by timestamp
    commands.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Optimize timeline by removing redundant commands
   */
  optimizeTimeline(timeline: RenderTimeline): RenderTimeline {
    const optimizedTracks: DeviceTrack[] = [];

    for (const track of timeline.tracks) {
      const optimizedCommands = this.removeRedundantCommands(track.commands);
      optimizedTracks.push({
        ...track,
        commands: optimizedCommands,
      });
    }

    // Update command count in metadata
    const totalCommands = optimizedTracks.reduce(
      (sum, track) => sum + track.commands.length,
      0
    );

    return {
      ...timeline,
      tracks: optimizedTracks,
      metadata: {
        ...timeline.metadata,
        commandCount: totalCommands,
      },
    };
  }

  /**
   * Remove redundant commands (identical consecutive commands)
   */
  private removeRedundantCommands(commands: TimedCommand[]): TimedCommand[] {
    if (commands.length === 0) return commands;

    const filtered: TimedCommand[] = [commands[0]];

    for (let i = 1; i < commands.length; i++) {
      const current = commands[i];
      const previous = filtered[filtered.length - 1];

      // Check if commands are significantly different
      if (!this.areCommandsSimilar(current, previous)) {
        filtered.push(current);
      }
    }

    return filtered;
  }

  /**
   * Check if two commands are similar enough to be considered redundant
   */
  private areCommandsSimilar(cmd1: TimedCommand, cmd2: TimedCommand): boolean {
    if (cmd1.type !== cmd2.type) return false;

    // Compare RGB colors
    if (cmd1.params.rgb_color && cmd2.params.rgb_color) {
      const colorDiff = Math.abs(cmd1.params.rgb_color[0] - cmd2.params.rgb_color[0]) +
                       Math.abs(cmd1.params.rgb_color[1] - cmd2.params.rgb_color[1]) +
                       Math.abs(cmd1.params.rgb_color[2] - cmd2.params.rgb_color[2]);
      
      // If color difference is less than 15 (out of 765 total), consider similar
      if (colorDiff < 15) return true;
    }

    // Compare brightness
    if (cmd1.params.brightness !== undefined && cmd2.params.brightness !== undefined) {
      const brightnessDiff = Math.abs(cmd1.params.brightness - cmd2.params.brightness);
      
      // If brightness difference is less than 5 (out of 255), consider similar
      if (brightnessDiff < 5) return true;
    }

    return false;
  }

  /**
   * Export timeline to JSON
   */
  exportTimeline(timeline: RenderTimeline): string {
    return JSON.stringify(timeline, null, 2);
  }

  /**
   * Import timeline from JSON
   */
  importTimeline(json: string): RenderTimeline {
    const data = JSON.parse(json);
    
    // Convert date strings back to Date objects
    data.createdAt = new Date(data.createdAt);
    
    return data as RenderTimeline;
  }

  /**
   * Get timeline statistics
   */
  getTimelineStats(timeline: RenderTimeline): TimelineStats {
    const commandsPerDevice = timeline.tracks.map(t => ({
      entityId: t.entityId,
      deviceName: t.deviceName,
      commandCount: t.commands.length,
      compensationMs: t.compensationMs,
    }));

    const avgCommandsPerDevice = 
      timeline.metadata.commandCount / timeline.metadata.deviceCount;

    const commandsPerSecond = 
      timeline.metadata.commandCount / timeline.duration;

    return {
      timelineId: timeline.id,
      duration: timeline.duration,
      deviceCount: timeline.metadata.deviceCount,
      totalCommands: timeline.metadata.commandCount,
      avgCommandsPerDevice,
      commandsPerSecond,
      processingTime: timeline.metadata.processingTime,
      commandsPerDevice,
    };
  }
}

export interface TimelineOptions {
  /** Custom timeline ID */
  id?: string;
  /** Timeline name */
  name?: string;
  /** Source audio file path */
  audioFile?: string;
}

export interface TimelineStats {
  /** Timeline ID */
  timelineId: string;
  /** Duration in seconds */
  duration: number;
  /** Number of devices */
  deviceCount: number;
  /** Total number of commands */
  totalCommands: number;
  /** Average commands per device */
  avgCommandsPerDevice: number;
  /** Commands per second */
  commandsPerSecond: number;
  /** Processing time in seconds */
  processingTime: number;
  /** Per-device statistics */
  commandsPerDevice: Array<{
    entityId: string;
    deviceName: string;
    commandCount: number;
    compensationMs: number;
  }>;
}
