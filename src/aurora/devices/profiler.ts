/**
 * Device Profiler Module
 * Automated testing and profiling of light devices
 */

import type { LightDevice, DeviceProfile, ProfileTestResult, ProfileTestSuite } from '../types';

export class DeviceProfiler {
  private hassCallService: (domain: string, service: string, data: any) => Promise<any>;
  private hassGetState: (entityId: string) => Promise<any>;

  constructor(
    hassCallService: (domain: string, service: string, data: any) => Promise<any>,
    hassGetState: (entityId: string) => Promise<any>
  ) {
    this.hassCallService = hassCallService;
    this.hassGetState = hassGetState;
  }

  /**
   * Profile a device with automated tests
   */
  async profileDevice(device: LightDevice, iterations: number = 3): Promise<DeviceProfile> {
    const startTime = Date.now();
    const results: ProfileTestResult[] = [];

    try {
      // Test latency
      const latencyResults = await this.testLatency(device.entityId, iterations);
      results.push(...latencyResults);

      // Test transition speed if supported
      if (device.capabilities.supportsBrightness) {
        const transitionResults = await this.testTransitionSpeed(device.entityId, iterations);
        results.push(...transitionResults);
      }

      // Test color accuracy if supported
      if (device.capabilities.supportsColor) {
        const colorResults = await this.testColorAccuracy(device.entityId);
        results.push(...colorResults);
      }

      // Calculate profile from results
      const profile = this.createProfileFromResults(device.entityId, results);
      
      const duration = (Date.now() - startTime) / 1000;
      
      return profile;
    } catch (error) {
      throw new Error(`Failed to profile device ${device.entityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test device latency (command to visible response time)
   */
  private async testLatency(entityId: string, iterations: number): Promise<ProfileTestResult[]> {
    const results: ProfileTestResult[] = [];

    for (let i = 0; i < iterations; i++) {
      try {
        // Ensure device is off
        await this.hassCallService('light', 'turn_off', { entity_id: entityId });
        await this.sleep(500); // Wait for state to settle

        // Measure time to turn on
        const startTime = Date.now();
        await this.hassCallService('light', 'turn_on', { entity_id: entityId });
        
        // Poll for state change
        const latency = await this.waitForStateChange(entityId, 'on', 2000);
        
        results.push({
          entityId,
          testType: 'latency',
          success: latency !== null,
          value: latency || 2000,
          unit: 'ms',
          timestamp: new Date(),
          error: latency === null ? 'Timeout waiting for state change' : undefined,
        });

        await this.sleep(500); // Wait between tests
      } catch (error) {
        results.push({
          entityId,
          testType: 'latency',
          success: false,
          value: 0,
          unit: 'ms',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Test transition speed capabilities
   */
  private async testTransitionSpeed(entityId: string, iterations: number): Promise<ProfileTestResult[]> {
    const results: ProfileTestResult[] = [];
    const transitionTimes = [0.5, 1.0, 2.0]; // seconds

    for (const transitionTime of transitionTimes) {
      try {
        // Set brightness to 0
        await this.hassCallService('light', 'turn_on', {
          entity_id: entityId,
          brightness: 0,
          transition: 0,
        });
        await this.sleep(500);

        // Transition to full brightness
        const startTime = Date.now();
        await this.hassCallService('light', 'turn_on', {
          entity_id: entityId,
          brightness: 255,
          transition: transitionTime,
        });

        // Wait for transition to complete
        await this.sleep(transitionTime * 1000 + 500);
        const actualTime = Date.now() - startTime;

        results.push({
          entityId,
          testType: 'transition',
          success: true,
          value: actualTime,
          unit: 'ms',
          timestamp: new Date(),
        });
      } catch (error) {
        results.push({
          entityId,
          testType: 'transition',
          success: false,
          value: 0,
          unit: 'ms',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Test color accuracy (requires manual verification or camera)
   */
  private async testColorAccuracy(entityId: string): Promise<ProfileTestResult[]> {
    const results: ProfileTestResult[] = [];
    const testColors: [number, number, number][] = [
      [255, 0, 0],   // Red
      [0, 255, 0],   // Green
      [0, 0, 255],   // Blue
      [255, 255, 0], // Yellow
      [255, 0, 255], // Magenta
      [0, 255, 255], // Cyan
    ];

    for (const color of testColors) {
      try {
        await this.hassCallService('light', 'turn_on', {
          entity_id: entityId,
          rgb_color: color,
          transition: 0,
        });

        await this.sleep(500);

        // TODO: In a full implementation, this would:
        // 1. Capture image with camera
        // 2. Analyze color in image
        // 3. Compare with expected color
        // For now, we assume 100% accuracy as placeholder

        results.push({
          entityId,
          testType: 'color',
          success: true,
          value: 1.0, // Placeholder: 100% accuracy
          unit: 'accuracy',
          timestamp: new Date(),
        });
      } catch (error) {
        results.push({
          entityId,
          testType: 'color',
          success: false,
          value: 0,
          unit: 'accuracy',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Create device profile from test results
   */
  private createProfileFromResults(entityId: string, results: ProfileTestResult[]): DeviceProfile {
    const latencyResults = results.filter(r => r.testType === 'latency' && r.success);
    const transitionResults = results.filter(r => r.testType === 'transition' && r.success);
    const colorResults = results.filter(r => r.testType === 'color' && r.success);

    // Calculate average latency
    const avgLatency = latencyResults.length > 0
      ? latencyResults.reduce((sum, r) => sum + r.value, 0) / latencyResults.length
      : 250; // Default 250ms

    // Calculate transition speed range
    const transitionValues = transitionResults.map(r => r.value);
    const minTransition = transitionValues.length > 0 ? Math.min(...transitionValues) : 100;
    const maxTransition = transitionValues.length > 0 ? Math.max(...transitionValues) : 2000;

    // Calculate color accuracy
    const colorAccuracy = colorResults.length > 0
      ? colorResults.reduce((sum, r) => sum + r.value, 0) / colorResults.length
      : undefined;

    return {
      entityId,
      latencyMs: Math.round(avgLatency),
      minTransitionMs: Math.round(minTransition),
      maxTransitionMs: Math.round(maxTransition),
      colorAccuracy,
      brightnessLinearity: undefined, // Not yet implemented
      lastCalibrated: new Date(),
      calibrationMethod: 'auto',
    };
  }

  /**
   * Wait for device state to change
   */
  private async waitForStateChange(
    entityId: string,
    expectedState: string,
    timeout: number
  ): Promise<number | null> {
    const startTime = Date.now();
    const pollInterval = 50; // Poll every 50ms

    while (Date.now() - startTime < timeout) {
      try {
        const state = await this.hassGetState(entityId);
        if (state && state.state === expectedState) {
          return Date.now() - startTime;
        }
      } catch {
        // Ignore errors and continue polling
      }
      await this.sleep(pollInterval);
    }

    return null; // Timeout
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save profile to database/file
   */
  async saveProfile(profile: DeviceProfile, profilesPath: string): Promise<void> {
    // TODO: Implement profile persistence
    // This would typically save to a database or JSON file
    throw new Error('Profile saving not yet implemented');
  }

  /**
   * Load profile from database/file
   */
  async loadProfile(entityId: string, profilesPath: string): Promise<DeviceProfile | null> {
    // TODO: Implement profile loading
    // This would typically load from a database or JSON file
    return null;
  }

  /**
   * Check if device needs re-profiling
   */
  needsReprofiling(profile: DeviceProfile, reprofileIntervalDays: number): boolean {
    const daysSinceCalibration = 
      (Date.now() - profile.lastCalibrated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCalibration >= reprofileIntervalDays;
  }
}
