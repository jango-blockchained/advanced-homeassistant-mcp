/**
 * Synchronization Calculator
 * Calculates timing offsets to compensate for device latencies
 */

import type { LightDevice, DeviceProfile, TimedCommand } from '../types';

export class SynchronizationCalculator {
  /**
   * Calculate compensation offset for a device
   * Returns the number of milliseconds to send the command EARLIER
   */
  calculateCompensation(
    device: LightDevice,
    profile: DeviceProfile | undefined,
    referenceLatency: number
  ): number {
    if (!profile) {
      // No profile available, use estimated compensation
      return this.estimateCompensation(device);
    }

    // Compensation = device latency - reference latency
    // Positive value means send command earlier
    // Negative value means send command later (rare, for very fast devices)
    return profile.latencyMs - referenceLatency;
  }

  /**
   * Estimate compensation based on device type when no profile exists
   */
  private estimateCompensation(device: LightDevice): number {
    // Rough estimates based on common device types
    // These are conservative estimates and should be replaced with actual profiling
    
    if (device.manufacturer) {
      const manufacturer = device.manufacturer.toLowerCase();
      
      // Fast devices (typically <100ms)
      if (manufacturer.includes('philips') || manufacturer.includes('hue')) {
        return 50;
      }
      if (manufacturer.includes('lifx')) {
        return 80;
      }
      
      // Medium speed devices (100-200ms)
      if (manufacturer.includes('ikea') || manufacturer.includes('tradfri')) {
        return 150;
      }
      if (manufacturer.includes('tp-link') || manufacturer.includes('kasa')) {
        return 120;
      }
      
      // Slower devices (200-400ms)
      if (manufacturer.includes('tuya') || manufacturer.includes('smart life')) {
        return 300;
      }
      if (manufacturer.includes('yeelight')) {
        return 250;
      }
    }

    // Default conservative estimate
    return 200;
  }

  /**
   * Calculate reference latency (baseline for synchronization)
   * Typically uses the fastest device as reference
   */
  calculateReferenceLatency(
    devices: LightDevice[],
    profiles: Map<string, DeviceProfile>
  ): number {
    let minLatency = Number.MAX_VALUE;

    for (const device of devices) {
      const profile = profiles.get(device.entityId);
      let latency: number;

      if (profile) {
        latency = profile.latencyMs;
      } else {
        latency = this.estimateCompensation(device);
      }

      if (latency < minLatency) {
        minLatency = latency;
      }
    }

    // If no devices found, use default
    return minLatency === Number.MAX_VALUE ? 50 : minLatency;
  }

  /**
   * Apply compensation to a timed command
   * Adjusts timestamp to account for device latency
   */
  compensateCommand(
    command: TimedCommand,
    compensationMs: number
  ): TimedCommand {
    // Store original timestamp before compensation
    const originalTimestamp = command.originalTimestamp || command.timestamp;

    // Subtract compensation from timestamp (send earlier)
    const compensatedTimestamp = Math.max(0, command.timestamp - compensationMs / 1000);

    return {
      ...command,
      timestamp: compensatedTimestamp,
      originalTimestamp,
    };
  }

  /**
   * Compensate an array of commands for a device
   */
  compensateCommands(
    commands: TimedCommand[],
    compensationMs: number
  ): TimedCommand[] {
    return commands.map(cmd => this.compensateCommand(cmd, compensationMs));
  }

  /**
   * Calculate optimal command grouping intervals
   * Groups commands that are close together to reduce API calls
   */
  calculateGroupingInterval(
    commands: TimedCommand[],
    minIntervalMs: number
  ): Map<number, TimedCommand[]> {
    const groups = new Map<number, TimedCommand[]>();
    
    // Sort commands by timestamp
    const sorted = [...commands].sort((a, b) => a.timestamp - b.timestamp);
    
    let currentGroupTime = 0;
    let currentGroup: TimedCommand[] = [];

    for (const command of sorted) {
      const commandTimeMs = command.timestamp * 1000;
      
      if (currentGroup.length === 0) {
        // Start new group
        currentGroupTime = commandTimeMs;
        currentGroup = [command];
      } else if (commandTimeMs - currentGroupTime < minIntervalMs) {
        // Add to current group
        currentGroup.push(command);
      } else {
        // Save current group and start new one
        groups.set(currentGroupTime, currentGroup);
        currentGroupTime = commandTimeMs;
        currentGroup = [command];
      }
    }

    // Save last group
    if (currentGroup.length > 0) {
      groups.set(currentGroupTime, currentGroup);
    }

    return groups;
  }

  /**
   * Analyze synchronization quality
   * Returns statistics about timing compensation
   */
  analyzeSynchronization(
    devices: LightDevice[],
    profiles: Map<string, DeviceProfile>
  ): SynchronizationAnalysis {
    const referenceLatency = this.calculateReferenceLatency(devices, profiles);
    const compensations: number[] = [];
    let minCompensation = Number.MAX_VALUE;
    let maxCompensation = Number.MIN_VALUE;

    for (const device of devices) {
      const profile = profiles.get(device.entityId);
      const compensation = this.calculateCompensation(device, profile, referenceLatency);
      
      compensations.push(compensation);
      minCompensation = Math.min(minCompensation, compensation);
      maxCompensation = Math.max(maxCompensation, compensation);
    }

    const avgCompensation = compensations.reduce((sum, c) => sum + c, 0) / compensations.length;
    const compensationRange = maxCompensation - minCompensation;

    return {
      referenceLatency,
      minCompensation,
      maxCompensation,
      avgCompensation,
      compensationRange,
      devicesCount: devices.length,
      profiledDevicesCount: Array.from(profiles.keys()).filter(id => 
        devices.some(d => d.entityId === id)
      ).length,
    };
  }

  /**
   * Validate that compensation won't cause negative timestamps
   */
  validateCompensation(
    commands: TimedCommand[],
    compensationMs: number
  ): boolean {
    const minTimestamp = Math.min(...commands.map(c => c.timestamp));
    return (minTimestamp * 1000) >= compensationMs;
  }
}

export interface SynchronizationAnalysis {
  /** Reference latency (fastest device) */
  referenceLatency: number;
  /** Minimum compensation needed (ms) */
  minCompensation: number;
  /** Maximum compensation needed (ms) */
  maxCompensation: number;
  /** Average compensation (ms) */
  avgCompensation: number;
  /** Range of compensations (max - min) */
  compensationRange: number;
  /** Total number of devices */
  devicesCount: number;
  /** Number of devices with profiles */
  profiledDevicesCount: number;
}
