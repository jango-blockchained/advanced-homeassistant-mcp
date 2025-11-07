/**
 * Device Measurement Utility Module
 * Provides standardized device measurement and data collection operations
 * for light sequence generation and optimization
 */

import type {
  LightDevice,
  DeviceCapabilities,
  DeviceProfile,
  EffectPerformance,
  TransitionProfile,
  BrightnessCurveData,
  ProfileTestResult,
} from '../types';

/**
 * Comprehensive measurement collector for light devices
 */
export class DeviceMeasurementCollector {
  /**
   * Collect all available device capabilities and state data
   */
  static collectDeviceData(
    entityId: string,
    state: any,
    capabilities: DeviceCapabilities
  ): ExtendedDeviceData {
    const attrs = state.attributes || {};
    
    return {
      entityId,
      currentState: state.state,
      // Brightness measurements
      brightness: {
        current: attrs.brightness || 0,
        min: capabilities.minBrightness || 0,
        max: capabilities.maxBrightness || 255,
        percentage: capabilities.brightnessPercentage,
      },
      // Color measurements
      color: {
        supportsRGB: capabilities.supportsColor,
        supportsColorTemp: capabilities.supportsColorTemp,
        supportsEffects: capabilities.supportsEffects,
        currentRGB: attrs.rgb_color,
        currentHSColor: attrs.hs_color,
        currentXYColor: attrs.xy_color,
        currentColorMode: capabilities.currentColorMode || attrs.color_mode,
      },
      // Color temperature measurements
      colorTemperature: {
        current: attrs.color_temp,
        currentKelvin: attrs.color_temp_kelvin,
        minMireds: capabilities.minMireds,
        maxMireds: capabilities.maxMireds,
        minKelvin: capabilities.minColorTempKelvin,
        maxKelvin: capabilities.maxColorTempKelvin,
      },
      // Effect measurements
      effects: {
        supported: capabilities.supportsEffects,
        availableEffects: capabilities.effects || [],
        currentEffect: attrs.effect,
        effectSpeed: capabilities.effectSpeed || attrs.effect_speed,
      },
      // Color modes
      colorModes: {
        supported: capabilities.colorModes || [],
        current: capabilities.currentColorMode || attrs.color_mode,
        hsColorMode: capabilities.colorModes?.includes('hs'),
        rgbColorMode: capabilities.colorModes?.includes('rgb'),
        xyColorMode: capabilities.colorModes?.includes('xy'),
        colorTempMode: capabilities.colorModes?.includes('color_temp'),
        rgbwColorMode: capabilities.colorModes?.includes('rgbw'),
        rgbwwColorMode: capabilities.colorModes?.includes('rgbww'),
      },
      // Device metadata
      metadata: {
        friendlyName: attrs.friendly_name || entityId,
        manufacturer: attrs.device_info?.manufacturer,
        model: attrs.device_info?.model,
        hwVersion: attrs.device_info?.hw_version,
        swVersion: attrs.device_info?.sw_version,
        icon: attrs.icon,
        entityCategory: attrs.entity_category,
      },
      // Feature flags
      features: {
        supportedFeatures: attrs.supported_features,
        isHueGroup: attrs.is_hue_group || false,
        isDeconzLight: attrs.is_deconz_light || false,
      },
    };
  }

  /**
   * Calculate brightness curve linearity from measurements
   */
  static calculateBrightnessLinearity(
    measurements: Array<{ input: number; output: number }>
  ): number {
    if (measurements.length < 2) return 0;

    // Calculate linear regression R² value
    const n = measurements.length;
    const sumX = measurements.reduce((sum, m) => sum + m.input, 0);
    const sumY = measurements.reduce((sum, m) => sum + m.output, 0);
    const sumXY = measurements.reduce((sum, m) => sum + m.input * m.output, 0);
    const sumX2 = measurements.reduce((sum, m) => sum + m.input * m.input, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² (coefficient of determination)
    const yMean = sumY / n;
    const ssRes = measurements.reduce(
      (sum, m) => sum + Math.pow(m.output - (slope * m.input + intercept), 2),
      0
    );
    const ssTot = measurements.reduce(
      (sum, m) => sum + Math.pow(m.output - yMean, 2),
      0
    );

    return ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  }

  /**
   * Calculate consistency (standard deviation) of measurements
   */
  static calculateConsistency(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentile from sorted values
   */
  static calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Analyze effect performance data
   */
  static analyzeEffectPerformance(
    results: ProfileTestResult[]
  ): EffectPerformance[] {
    const effectResults = new Map<string, ProfileTestResult[]>();

    // Group results by effect
    for (const result of results) {
      if (result.testType === 'effect') {
        const effectName = (result as any).effectName || 'unknown';
        if (!effectResults.has(effectName)) {
          effectResults.set(effectName, []);
        }
        effectResults.get(effectName)!.push(result);
      }
    }

    // Analyze each effect
    const analysis: EffectPerformance[] = [];
    for (const [effectName, effectTestResults] of effectResults) {
      const responseTimes = effectTestResults
        .filter(r => r.success)
        .map(r => r.value);

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : undefined;

      const smoothnessRating = responseTimes.length > 0
        ? Math.min(1, 1 - (this.calculateConsistency(responseTimes) / 200))
        : undefined;

      analysis.push({
        effectName,
        supported: effectTestResults.some(r => r.success),
        responseTimeMs: avgResponseTime,
        smoothness: smoothnessRating,
        colorAccuracy: undefined, // Would require camera/color sensor
        notes: effectTestResults.length > 0
          ? `Tested ${effectTestResults.length} times`
          : 'No test data',
      });
    }

    return analysis;
  }

  /**
   * Analyze transition profile data
   */
  static analyzeTransitionProfiles(
    transitionTests: Array<{
      duration: number;
      measurements: number[];
    }>
  ): TransitionProfile[] {
    return transitionTests.map(test => {
      const sorted = [...test.measurements].sort((a, b) => a - b);
      const mean = test.measurements.reduce((a, b) => a + b, 0) / test.measurements.length;

      return {
        duration: test.duration,
        actualTimeMs: Math.round(mean),
        smoothness: Math.min(1, 1 - (this.calculateConsistency(test.measurements) / 100)),
        samples: test.measurements.length,
        consistency: this.calculateConsistency(test.measurements),
      };
    });
  }

  /**
   * Merge device profiles with priority to newer data
   */
  static mergeProfiles(
    existingProfile: DeviceProfile,
    newData: Partial<DeviceProfile>
  ): DeviceProfile {
    return {
      ...existingProfile,
      ...newData,
      lastCalibrated: newData.lastCalibrated || existingProfile.lastCalibrated,
      // Merge array fields carefully
      effectsPerformance: newData.effectsPerformance || existingProfile.effectsPerformance,
      transitionProfiles: newData.transitionProfiles || existingProfile.transitionProfiles,
      colorAccuracyByMode: {
        ...(existingProfile.colorAccuracyByMode || {}),
        ...(newData.colorAccuracyByMode || {}),
      },
    };
  }

  /**
   * Generate optimization recommendations based on profile
   */
  static generateOptimizationRecommendations(profile: DeviceProfile): string[] {
    const recommendations: string[] = [];

    // Latency recommendations
    if (profile.latencyMs > 500) {
      recommendations.push(
        `High latency detected (${profile.latencyMs}ms). Consider reducing command frequency.`
      );
    }

    // Response time consistency recommendations
    if (profile.responseTimeConsistency && profile.responseTimeConsistency > 100) {
      recommendations.push(
        `Inconsistent response times (std: ${profile.responseTimeConsistency.toFixed(1)}ms). Consider batching commands.`
      );
    }

    // Brightness linearity recommendations
    if (profile.brightnessLinearity && profile.brightnessLinearity < 0.9) {
      recommendations.push(
        `Non-linear brightness response (R²: ${profile.brightnessLinearity.toFixed(2)}). Use brightness curve compensation.`
      );
    }

    // Peak response time recommendations
    if (profile.peakResponseTimeMs && profile.peakResponseTimeMs > 1000) {
      recommendations.push(
        `Peak response time very high (${profile.peakResponseTimeMs}ms). May experience lag on command bursts.`
      );
    }

    // Color accuracy recommendations
    if (profile.colorAccuracy && profile.colorAccuracy < 0.8) {
      recommendations.push(
        `Color accuracy moderate (${(profile.colorAccuracy * 100).toFixed(0)}%). Colors may not render as expected.`
      );
    }

    // Effect performance recommendations
    if (profile.effectsPerformance && profile.effectsPerformance.length > 0) {
      const failedEffects = profile.effectsPerformance.filter(e => !e.supported);
      if (failedEffects.length > 0) {
        recommendations.push(
          `${failedEffects.length} effect(s) unsupported: ${failedEffects.map(e => e.effectName).join(', ')}`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Device profile looks optimal. No optimization needed.');
    }

    return recommendations;
  }

  /**
   * Calculate device measurement score (0-100)
   * Based on various performance metrics
   */
  static calculateDeviceScore(profile: DeviceProfile): number {
    let score = 100;

    // Penalize for high latency
    const latencyPenalty = Math.min(20, (profile.latencyMs / 1000) * 20);
    score -= latencyPenalty;

    // Penalize for inconsistent response
    if (profile.responseTimeConsistency) {
      const consistencyPenalty = Math.min(15, (profile.responseTimeConsistency / 300) * 15);
      score -= consistencyPenalty;
    }

    // Penalize for non-linear brightness
    if (profile.brightnessLinearity) {
      const linearityPenalty = (1 - profile.brightnessLinearity) * 15;
      score -= linearityPenalty;
    }

    // Penalize for poor color accuracy
    if (profile.colorAccuracy) {
      const colorPenalty = (1 - profile.colorAccuracy) * 10;
      score -= colorPenalty;
    }

    return Math.max(0, Math.round(score));
  }
}

// ============================================================================
// Types for Extended Device Data
// ============================================================================

export interface ExtendedDeviceData {
  entityId: string;
  currentState: string;
  brightness: {
    current: number;
    min: number;
    max: number;
    percentage?: number;
  };
  color: {
    supportsRGB: boolean;
    supportsColorTemp: boolean;
    supportsEffects: boolean;
    currentRGB?: [number, number, number];
    currentHSColor?: [number, number];
    currentXYColor?: [number, number];
    currentColorMode?: string;
  };
  colorTemperature: {
    current?: number;
    currentKelvin?: number;
    minMireds?: number;
    maxMireds?: number;
    minKelvin?: number;
    maxKelvin?: number;
  };
  effects: {
    supported: boolean;
    availableEffects: string[];
    currentEffect?: string;
    effectSpeed?: number;
  };
  colorModes: {
    supported: string[];
    current?: string;
    hsColorMode?: boolean;
    rgbColorMode?: boolean;
    xyColorMode?: boolean;
    colorTempMode?: boolean;
    rgbwColorMode?: boolean;
    rgbwwColorMode?: boolean;
  };
  metadata: {
    friendlyName: string;
    manufacturer?: string;
    model?: string;
    hwVersion?: string;
    swVersion?: string;
    icon?: string;
    entityCategory?: string;
  };
  features: {
    supportedFeatures?: number;
    isHueGroup: boolean;
    isDeconzLight: boolean;
  };
}
