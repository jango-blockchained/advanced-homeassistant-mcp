/**
 * Device Measurement and Data Collection - Usage Examples
 * 
 * This file demonstrates how to use the enhanced device measurement
 * and data collection features for optimized light sequences.
 */

import { DeviceScanner } from './aurora/devices/scanner.js';
import { DeviceProfiler } from './aurora/devices/profiler.js';
import { DeviceMeasurementCollector } from './aurora/devices/measurement.js';
import { TimelineGenerator } from './aurora/rendering/timeline.js';
import type { LightDevice, DeviceProfile } from './aurora/types.js';

// ============================================================================
// Example 1: Discover and Profile All Light Devices
// ============================================================================

async function profileAllLights(hassApi: any): Promise<Map<string, DeviceProfile>> {
  const profiles = new Map<string, DeviceProfile>();

  try {
    // Step 1: Scan for all available lights
    const scanner = new DeviceScanner(hassApi);
    const devices = await scanner.scanDevices();
    
    console.log(`Found ${devices.length} light devices`);
    
    // Step 2: Get statistics
    const stats = scanner.getStatistics(devices);
    console.log(`Color-capable devices: ${stats.supportsColor}`);
    console.log(`Color-temp devices: ${stats.supportsColorTemp}`);
    console.log(`Brightness-capable: ${stats.supportsBrightness}`);

    // Step 3: Profile each device
    const profiler = new DeviceProfiler(
      (domain, service, data) => hassApi.callService(domain, service, data),
      (entityId) => hassApi.getState(entityId)
    );

    for (const device of devices) {
      try {
        console.log(`Profiling ${device.name}...`);
        const profile = await profiler.profileDevice(device, 3);
        profiles.set(device.entityId, profile);
        
        // Get device score
        const score = DeviceMeasurementCollector.calculateDeviceScore(profile);
        console.log(`  Score: ${score}/100`);
        
        // Get optimization recommendations
        const recommendations = 
          DeviceMeasurementCollector.generateOptimizationRecommendations(profile);
        recommendations.forEach(rec => console.log(`  → ${rec}`));
      } catch (error) {
        console.error(`Failed to profile ${device.name}:`, error);
      }
    }

    return profiles;
  } catch (error) {
    console.error('Failed to profile lights:', error);
    return profiles;
  }
}

// ============================================================================
// Example 2: Collect Comprehensive Device Data
// ============================================================================

async function collectDeviceCapabilities(
  entityId: string,
  hassApi: any
): Promise<void> {
  try {
    // Get current state and capabilities
    const state = await hassApi.getState(entityId);
    
    // Use scanner to extract capabilities
    const scanner = new DeviceScanner(hassApi);
    const device = await scanner.getDeviceInfo(entityId);
    
    if (!device) {
      console.log(`Device ${entityId} not found`);
      return;
    }

    // Collect all available data
    const extendedData = DeviceMeasurementCollector.collectDeviceData(
      entityId,
      state,
      device.capabilities
    );

    // Display comprehensive information
    console.log(`\n=== Device: ${extendedData.metadata.friendlyName} ===`);
    
    console.log(`\nBrightness:`);
    console.log(`  Current: ${extendedData.brightness.current}/255 (${extendedData.brightness.percentage}%)`);
    console.log(`  Range: ${extendedData.brightness.min}-${extendedData.brightness.max}`);
    
    console.log(`\nColor Capabilities:`);
    console.log(`  RGB Support: ${extendedData.color.supportsRGB}`);
    console.log(`  Color Temp Support: ${extendedData.color.supportsColorTemp}`);
    console.log(`  Current Color Mode: ${extendedData.color.currentColorMode}`);
    
    console.log(`\nColor Temperature:`);
    if (extendedData.colorTemperature.minKelvin) {
      console.log(`  Range: ${extendedData.colorTemperature.minKelvin}K - ${extendedData.colorTemperature.maxKelvin}K`);
    }
    
    console.log(`\nColor Modes:`);
    console.log(`  Supported: ${extendedData.colorModes.supported.join(', ')}`);
    
    console.log(`\nEffects:`);
    console.log(`  Supported: ${extendedData.effects.supported}`);
    if (extendedData.effects.availableEffects.length > 0) {
      console.log(`  Available: ${extendedData.effects.availableEffects.join(', ')}`);
    }
    
    console.log(`\nDevice Info:`);
    console.log(`  Manufacturer: ${extendedData.metadata.manufacturer}`);
    console.log(`  Model: ${extendedData.metadata.model}`);
    console.log(`  Hardware: ${extendedData.metadata.hwVersion}`);
    console.log(`  Software: ${extendedData.metadata.swVersion}`);
  } catch (error) {
    console.error('Failed to collect device data:', error);
  }
}

// ============================================================================
// Example 3: Analyze Effect Performance
// ============================================================================

async function analyzeEffectPerformance(
  profile: DeviceProfile
): Promise<void> {
  if (!profile.effectsPerformance) {
    console.log('No effect performance data available');
    return;
  }

  console.log(`\n=== Effect Performance for ${profile.entityId} ===`);
  
  for (const effect of profile.effectsPerformance) {
    console.log(`\n${effect.effectName}:`);
    console.log(`  Supported: ${effect.supported}`);
    if (effect.supported) {
      console.log(`  Response Time: ${effect.responseTimeMs}ms`);
      console.log(`  Smoothness: ${(effect.smoothness ? effect.smoothness * 100 : 0).toFixed(1)}%`);
      if (effect.colorAccuracy) {
        console.log(`  Color Accuracy: ${(effect.colorAccuracy * 100).toFixed(1)}%`);
      }
    }
  }
}

// ============================================================================
// Example 4: Analyze Brightness Curve and Apply Compensation
// ============================================================================

async function analyzeBrightnessCurve(profile: DeviceProfile): Promise<void> {
  if (!profile.brightnessCurve) {
    console.log('No brightness curve data available');
    return;
  }

  console.log(`\n=== Brightness Curve for ${profile.entityId} ===`);
  console.log(`Linearity (R²): ${(profile.brightnessLinearity ? profile.brightnessLinearity * 100 : 0).toFixed(2)}%`);
  console.log(`Curve Type: ${profile.brightnessCurve.curveType || 'unknown'}`);
  
  console.log(`\nMeasurements:`);
  for (const measurement of profile.brightnessCurve.measurements) {
    const deviation = Math.abs(measurement.input - measurement.output);
    console.log(`  Input: ${measurement.input.toFixed(0)} → Output: ${measurement.output.toFixed(0)} (deviation: ${deviation.toFixed(1)})`);
  }
}

// ============================================================================
// Example 5: Generate Optimized Timeline With Device Profiles
// ============================================================================

async function generateOptimizedTimeline(
  devices: LightDevice[],
  profiles: Map<string, DeviceProfile>,
  audioFeatures: any,
  settings: any
): Promise<void> {
  try {
    const generator = new TimelineGenerator(settings);

    // Generate timeline using device profiles
    const timeline = await generator.generateTimeline(
      audioFeatures,
      devices,
      profiles,
      settings
    );

    console.log(`\n=== Timeline Generated ===`);
    console.log(`ID: ${timeline.id}`);
    console.log(`Duration: ${timeline.duration}s`);
    console.log(`Devices: ${timeline.tracks.length}`);
    console.log(`Total Commands: ${timeline.metadata.commandCount}`);

    // Show per-device statistics
    const stats = generator.getTimelineStats(timeline);
    console.log(`\nPer-Device Statistics:`);
    for (const device of stats.commandsPerDevice) {
      console.log(`  ${device.deviceName}: ${device.commandCount} commands (compensation: ${device.compensationMs}ms)`);
    }

    console.log(`\nPerformance:`);
    console.log(`  Commands/sec: ${stats.commandsPerSecond.toFixed(1)}`);
    console.log(`  Processing time: ${stats.processingTime.toFixed(2)}s`);
  } catch (error) {
    console.error('Failed to generate timeline:', error);
  }
}

// ============================================================================
// Example 6: Device Comparison and Scoring
// ============================================================================

async function compareDevices(profiles: Map<string, DeviceProfile>): Promise<void> {
  console.log(`\n=== Device Comparison ===`);
  console.log(`Entity ID | Device Score | Latency | Color Accuracy | Brightness Linearity`);
  console.log(`${'─'.repeat(80)}`);

  const sortedProfiles = Array.from(profiles.values())
    .sort((a, b) => {
      const scoreA = DeviceMeasurementCollector.calculateDeviceScore(a);
      const scoreB = DeviceMeasurementCollector.calculateDeviceScore(b);
      return scoreB - scoreA;
    });

  for (const profile of sortedProfiles) {
    const score = DeviceMeasurementCollector.calculateDeviceScore(profile);
    const colorAccuracy = (profile.colorAccuracy ? (profile.colorAccuracy * 100).toFixed(0) : 'N/A');
    const brightness = (profile.brightnessLinearity ? (profile.brightnessLinearity * 100).toFixed(0) : 'N/A');
    
    console.log(
      `${profile.entityId.padEnd(20)} | ${String(score).padEnd(12)} | ${String(profile.latencyMs).padEnd(7)}ms | ${String(colorAccuracy).padEnd(14)}% | ${brightness}%`
    );
  }
}

// ============================================================================
// Example 7: Monitor Device Health
// ============================================================================

async function monitorDeviceHealth(
  profile: DeviceProfile,
  reprofileIntervalDays: number = 7
): Promise<void> {
  const profiler = new DeviceProfiler(
    () => Promise.resolve(),
    () => Promise.resolve({})
  );

  console.log(`\n=== Device Health Check: ${profile.entityId} ===`);
  
  // Check if re-profiling is needed
  const needsReprofiling = profiler.needsReprofiling(profile, reprofileIntervalDays);
  const daysSinceCalibration = 
    (Date.now() - profile.lastCalibrated.getTime()) / (1000 * 60 * 60 * 24);
  
  console.log(`Last Calibrated: ${profile.lastCalibrated.toISOString()}`);
  console.log(`Days Since Calibration: ${daysSinceCalibration.toFixed(1)}`);
  console.log(`Needs Re-profiling: ${needsReprofiling ? 'YES' : 'NO'}`);
  
  console.log(`\nPerformance Metrics:`);
  console.log(`  Device Score: ${DeviceMeasurementCollector.calculateDeviceScore(profile)}/100`);
  console.log(`  Latency: ${profile.latencyMs}ms`);
  console.log(`  Response Consistency: ${profile.responseTimeConsistency?.toFixed(2) || 'N/A'}ms`);
  console.log(`  Peak Response: ${profile.peakResponseTimeMs || 'N/A'}ms`);
  console.log(`  Color Accuracy: ${profile.colorAccuracy ? (profile.colorAccuracy * 100).toFixed(0) : 'N/A'}%`);
  console.log(`  Brightness Linearity: ${profile.brightnessLinearity ? (profile.brightnessLinearity * 100).toFixed(0) : 'N/A'}%`);
  
  // Show recommendations
  const recommendations = 
    DeviceMeasurementCollector.generateOptimizationRecommendations(profile);
  if (recommendations.length > 0) {
    console.log(`\nOptimization Recommendations:`);
    recommendations.forEach(rec => console.log(`  • ${rec}`));
  }
}

// ============================================================================
// Example 8: Export Profile Data for Analysis
// ============================================================================

function exportProfileData(profile: DeviceProfile): string {
  return JSON.stringify({
    entityId: profile.entityId,
    calibrationMethod: profile.calibrationMethod,
    lastCalibrated: profile.lastCalibrated.toISOString(),
    deviceInfo: profile.deviceInfo,
    metrics: {
      latencyMs: profile.latencyMs,
      minTransitionMs: profile.minTransitionMs,
      maxTransitionMs: profile.maxTransitionMs,
      colorAccuracy: profile.colorAccuracy,
      brightnessLinearity: profile.brightnessLinearity,
      responseTimeConsistency: profile.responseTimeConsistency,
      peakResponseTimeMs: profile.peakResponseTimeMs,
    },
    effects: profile.effectsPerformance,
    transitions: profile.transitionProfiles,
    brightness: profile.brightnessCurve,
    deviceScore: DeviceMeasurementCollector.calculateDeviceScore(profile),
  }, null, 2);
}

export {
  profileAllLights,
  collectDeviceCapabilities,
  analyzeEffectPerformance,
  analyzeBrightnessCurve,
  generateOptimizedTimeline,
  compareDevices,
  monitorDeviceHealth,
  exportProfileData,
};
