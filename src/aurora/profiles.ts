/**
 * Aurora Profile Loader
 * Dynamically loads and applies device profiles
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { DeviceProfile } from './types';

export interface AuroraConfig {
  version: string;
  generatedAt: string;
  systemStats: {
    worstCaseLatency: number;
    bestCaseLatency: number;
    avgLatency: number;
    avgReliability: number;
    devicesProfiled: number;
  };
  recommendations: {
    safe: {
      minCommandInterval: number;
      maxRatePerDevice: number;
      reliability: string;
    };
    conservative: {
      minCommandInterval: number;
      maxRatePerDevice: number;
      reliability: string;
    };
    aggressive: {
      minCommandInterval: number;
      maxRatePerDevice: number;
      reliability: string;
    };
  };
  adaptiveRanges: {
    minCommandInterval: {
      min: number;
      recommended: number;
      max: number;
    };
    intensityMapping: {
      low: number;
      medium: number;
      high: number;
    };
  };
}

export interface ProfileData {
  version: string;
  generatedAt: string;
  profiles: Array<DeviceProfile & {
    lastCalibrated: string;
    statistics: Array<{
      commandType: string;
      measurements: number[];
      min: number;
      max: number;
      avg: number;
      median: number;
      stdDev: number;
    }>;
    totalMeasurements: number;
    reliabilityScore: number;
    recommendedInterval: number;
  }>;
}

export class AuroraProfileManager {
  private config: AuroraConfig | null = null;
  private profiles: Map<string, DeviceProfile> = new Map();
  private profilesPath = './aurora-profiles/device-profiles.json';
  private configPath = './aurora-profiles/aurora-config.json';

  /**
   * Load configuration and profiles
   */
  async load(): Promise<boolean> {
    try {
      // Load config
      if (existsSync(this.configPath)) {
        const configData = await readFile(this.configPath, 'utf-8');
        this.config = JSON.parse(configData);
      }

      // Load profiles
      if (existsSync(this.profilesPath)) {
        const profileData: ProfileData = JSON.parse(
          await readFile(this.profilesPath, 'utf-8')
        );
        
        for (const profile of profileData.profiles) {
          this.profiles.set(profile.entityId, {
            ...profile,
            lastCalibrated: new Date(profile.lastCalibrated)
          });
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to load Aurora profiles:', error);
      return false;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): AuroraConfig | null {
    return this.config;
  }

  /**
   * Get profile for specific device
   */
  getProfile(entityId: string): DeviceProfile | undefined {
    return this.profiles.get(entityId);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): Map<string, DeviceProfile> {
    return this.profiles;
  }

  /**
   * Get adaptive command interval based on intensity
   * @param intensity 0-1, where 0 is low and 1 is high
   */
  getAdaptiveInterval(intensity: number): number {
    if (!this.config) {
      return 400; // Fallback default
    }

    const ranges = this.config.adaptiveRanges.minCommandInterval;
    
    if (intensity < 0.4) {
      // Low intensity: use conservative (safest)
      return ranges.max;
    } else if (intensity < 0.7) {
      // Medium intensity: use recommended
      return ranges.recommended;
    } else {
      // High intensity: use aggressive (fastest)
      return ranges.min;
    }
  }

  /**
   * Get recommended settings based on strategy
   */
  getRecommendedSettings(strategy: 'safe' | 'conservative' | 'aggressive' = 'safe') {
    if (!this.config) {
      return {
        minCommandInterval: 400,
        maxRatePerDevice: 2,
        reliability: 'unknown'
      };
    }

    return this.config.recommendations[strategy];
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    return this.config?.systemStats || null;
  }

  /**
   * Check if profiles are available
   */
  hasProfiles(): boolean {
    return this.profiles.size > 0;
  }

  /**
   * Get profile age
   */
  getProfileAge(): number | null {
    if (!this.config) return null;
    
    const generated = new Date(this.config.generatedAt);
    const now = new Date();
    return now.getTime() - generated.getTime();
  }

  /**
   * Check if profiles need refresh (older than 7 days)
   */
  needsRefresh(): boolean {
    const age = this.getProfileAge();
    if (age === null) return true;
    
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return age > sevenDaysMs;
  }

  /**
   * Get interval range for validation
   */
  getIntervalRange(): { min: number; max: number } | null {
    if (!this.config) return null;
    
    const ranges = this.config.adaptiveRanges.minCommandInterval;
    return {
      min: ranges.min,
      max: ranges.max
    };
  }

  /**
   * Validate and clamp interval to safe range
   */
  validateInterval(interval: number): number {
    const range = this.getIntervalRange();
    if (!range) return interval;
    
    return Math.max(range.min, Math.min(range.max, interval));
  }

  /**
   * Get device-specific interval (if profile exists)
   */
  getDeviceInterval(entityId: string): number | null {
    const profile = this.getProfile(entityId);
    if (!profile || !('recommendedInterval' in profile)) {
      return null;
    }
    
    return (profile as any).recommendedInterval;
  }

  /**
   * Calculate optimal interval for a set of devices
   */
  getOptimalIntervalForDevices(entityIds: string[]): number {
    if (!this.config) {
      return 400; // Fallback
    }

    // Get worst-case interval from selected devices
    const intervals = entityIds
      .map(id => this.getDeviceInterval(id))
      .filter((interval): interval is number => interval !== null);

    if (intervals.length === 0) {
      // No profiles, use system recommendation
      return this.config.recommendations.safe.minCommandInterval;
    }

    // Use worst-case (highest interval) for safety
    return Math.max(...intervals);
  }

  /**
   * Get summary for logging
   */
  getSummary(): string {
    if (!this.config) {
      return 'No profiles loaded';
    }

    const age = this.getProfileAge();
    const ageHours = age ? Math.floor(age / (1000 * 60 * 60)) : 0;
    const stats = this.config.systemStats;

    return `
Profiles: ${this.profiles.size} devices
Generated: ${ageHours}h ago
Latency: ${stats.bestCaseLatency}ms - ${stats.worstCaseLatency}ms (avg ${Math.round(stats.avgLatency)}ms)
Reliability: ${Math.round(stats.avgReliability * 100)}%
Recommended interval: ${this.config.recommendations.safe.minCommandInterval}ms
`.trim();
  }
}

// Singleton instance
let manager: AuroraProfileManager | null = null;

/**
 * Get or create profile manager instance
 */
export async function getProfileManager(): Promise<AuroraProfileManager> {
  if (!manager) {
    manager = new AuroraProfileManager();
    await manager.load();
  }
  return manager;
}
