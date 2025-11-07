# Device Measurement and Data Collection Enhancement

## Overview

This document outlines the comprehensive enhancement to device measurement and data collection for light sequence generation in the Aurora module. The system now collects extensive device capabilities and performance metrics to optimize light sequences for specific hardware.

## Key Components

### 1. Enhanced Light Schema (`src/schemas.ts`)

Added comprehensive `LightAttributesSchema` and `LightSchema` that capture:

**Brightness Support:**
- Current brightness level (0-255)
- Min/max brightness capabilities
- Brightness percentage

**Color Support:**
- RGB color values
- Hue/Saturation color values
- XY color values
- Color temperature in mireds and Kelvin
- Minimum/maximum color temperature ranges
- Supported color modes (hs, rgb, xy, color_temp, rgbw, rgbww)
- Current color mode

**Effects:**
- Available effects list
- Current effect
- Effect speed

**Device Information:**
- Friendly name
- Manufacturer and model
- Hardware/software versions
- Device category
- Icon

**Feature Flags:**
- Supported features bitmask
- Hue group indicator
- Deconz light indicator

### 2. Extended DeviceCapabilities (`src/aurora/types.ts`)

Enhanced `DeviceCapabilities` interface now includes:

```typescript
colorModes?: string[];           // Supported color modes
currentColorMode?: string;       // Current operating color mode
minColorTempKelvin?: number;    // Color temp in Kelvin
maxColorTempKelvin?: number;
brightnessPercentage?: number;  // Current brightness %
effectSpeed?: number;            // Effect speed capability (0-1)
```

### 3. Enhanced DeviceProfile (`src/aurora/types.ts`)

Extended `DeviceProfile` interface with advanced measurement data:

**Effect Performance Metrics:**
```typescript
effectsPerformance?: EffectPerformance[];
```
Tracks for each effect:
- Response time
- Smoothness rating (0-1)
- Color accuracy
- Support status
- Performance notes

**Transition Profiles:**
```typescript
transitionProfiles?: TransitionProfile[];
```
Measures:
- Transition duration
- Actual execution time
- Smoothness rating
- Consistency (standard deviation)
- Sample count

**Brightness Curve Data:**
```typescript
brightnessCurve?: BrightnessCurveData;
```
Captures:
- Input/output measurements at different levels
- Linearity fit (R² value)
- Curve type (linear, logarithmic, etc.)

**Response Time Analytics:**
```typescript
responseTimeConsistency?: number;    // Std deviation in ms
peakResponseTimeMs?: number;         // 99th percentile response time
avgPowerConsumption?: number;        // During operations
```

### 4. Device Measurement Collector (`src/aurora/devices/measurement.ts`)

New utility module providing standardized measurement operations:

**Core Methods:**

- `collectDeviceData()`: Gathers all available device capabilities and state
- `calculateBrightnessLinearity()`: Computes R² for brightness curve
- `calculateConsistency()`: Standard deviation of measurements
- `calculatePercentile()`: Percentile calculation from sorted values
- `analyzeEffectPerformance()`: Aggregates effect test results
- `analyzeTransitionProfiles()`: Analyzes transition data
- `mergeProfiles()`: Safely merges old and new profile data
- `generateOptimizationRecommendations()`: Provides actionable insights
- `calculateDeviceScore()`: 0-100 quality score based on metrics

**Extended Device Data Structure:**

```typescript
interface ExtendedDeviceData {
  brightness: { current, min, max, percentage }
  color: { supportsRGB, supportsColorTemp, currentRGB, currentHSColor, etc. }
  colorTemperature: { current, currentKelvin, min/max mireds/kelvin }
  effects: { supported, availableEffects, currentEffect, effectSpeed }
  colorModes: { supported, current, hsColorMode, rgbColorMode, etc. }
  metadata: { friendlyName, manufacturer, model, hwVersion, swVersion }
  features: { supportedFeatures, isHueGroup, isDeconzLight }
}
```

### 5. Enhanced Device Scanner (`src/aurora/devices/scanner.ts`)

The `DeviceScanner` now collects comprehensive capabilities:

- **Color modes**: Modern Home Assistant `supported_color_modes`
- **Color temperature**: Both mireds and Kelvin ranges
- **Brightness percentage**: Current brightness as percentage
- **Effect speed**: Device's effect speed capability
- **Legacy fallback**: Feature flags for older HA versions

### 6. Enhanced Device Profiler (`src/aurora/devices/profiler.ts`)

Comprehensive automated testing with new test types:

**Test Types:**

1. **Latency Testing**
   - Measures command-to-response time
   - Runs multiple iterations
   - Tracks response consistency (std dev)
   - Calculates peak response time (99th percentile)

2. **Transition Speed Testing**
   - Tests transitions at 0.5s, 1.0s, 2.0s
   - Measures actual vs. specified duration
   - Calculates smoothness rating
   - Determines device's transition range

3. **Color Accuracy Testing**
   - Tests RGB color output
   - Placeholder for camera-based verification
   - Returns color accuracy percentage

4. **Effect Performance Testing** (New)
   - Tests each available effect
   - Measures response time per effect
   - Determines success/failure
   - Analyzes smoothness

5. **Brightness Curve Testing** (New)
   - Tests brightness at multiple levels (0, 64, 128, 192, 255)
   - Measures linearity
   - Detects non-linear response curves
   - Provides curve type classification

### 7. Enhanced Timeline Generator (`src/aurora/rendering/timeline.ts`)

Timeline generation now leverages collected device data:

**Optimized Command Generation:**
- Respects device brightness ranges (min/max)
- Applies brightness curve compensation
- Selects color modes supported by device
- Uses device-specific transition times

**Effect-Based Beat Emphasis:**
- Selects fast-responding effects for beats
- Prefers strobe/flash effects when available
- Falls back to brightness boost if effects unavailable

**Color Optimization:**
- Applies color accuracy correction
- Accounts for device-specific color rendering
- Optimizes color temperature ranges

**Transition Optimization:**
- Uses device's proven transition capabilities
- Clamps transitions to min/max device capabilities
- Applies consistency data for predictable timing

## Data Collection Flow

```
Home Assistant Device State
        ↓
DeviceScanner (Basic Capabilities)
        ↓
DeviceMeasurementCollector (Extended Data)
        ↓
DeviceProfiler (Performance Metrics)
        ↓
Enhanced DeviceProfile (Comprehensive Record)
        ↓
TimelineGenerator (Optimized Sequences)
```

## Measurement Metrics

### Performance Metrics

| Metric | Range | Purpose |
|--------|-------|---------|
| Latency | 0-∞ ms | Command response time |
| Response Consistency | 0-∞ ms | Std deviation of responses |
| Peak Response | 0-∞ ms | 99th percentile latency |
| Transition Time | 0-∞ ms | Actual vs specified |
| Color Accuracy | 0-1 | RGB rendering quality |
| Brightness Linearity | 0-1 | Linear response curve |
| Effect Smoothness | 0-1 | Visual smoothness rating |

### Device Score Calculation

```
Base Score: 100
- Latency Penalty: up to -20 points
- Consistency Penalty: up to -15 points
- Brightness Linearity Penalty: up to -15 points
- Color Accuracy Penalty: up to -10 points
Final Score: 0-100
```

## Optimization Recommendations

The system generates recommendations based on profile data:

1. **High Latency** (>500ms)
   - Recommendation: Reduce command frequency
   
2. **Inconsistent Response** (std > 100ms)
   - Recommendation: Batch commands together
   
3. **Non-Linear Brightness** (R² < 0.9)
   - Recommendation: Apply brightness curve compensation
   
4. **High Peak Response** (99th percentile > 1000ms)
   - Recommendation: Avoid command bursts
   
5. **Poor Color Accuracy** (< 80%)
   - Recommendation: Account for color rendering limitations
   
6. **Unsupported Effects**
   - Lists effects that won't work on device

## Usage Examples

### Collect Device Data

```typescript
import { DeviceMeasurementCollector } from './devices/measurement.js';

const deviceData = DeviceMeasurementCollector.collectDeviceData(
  'light.living_room',
  deviceState,
  capabilities
);

console.log(deviceData.color.supportsRGB);
console.log(deviceData.brightness.max);
console.log(deviceData.effects.availableEffects);
```

### Analyze Test Results

```typescript
const effectPerformance = DeviceMeasurementCollector.analyzeEffectPerformance(
  profileTestResults
);

effectPerformance.forEach(effect => {
  console.log(`${effect.effectName}: ${effect.responseTimeMs}ms`);
});
```

### Generate Recommendations

```typescript
const recommendations = DeviceMeasurementCollector.generateOptimizationRecommendations(
  deviceProfile
);

recommendations.forEach(rec => console.log(rec));
```

### Calculate Device Score

```typescript
const score = DeviceMeasurementCollector.calculateDeviceScore(deviceProfile);
console.log(`Device Quality Score: ${score}/100`);
```

## Benefits

1. **Precise Device Characterization**: Complete understanding of each light's capabilities
2. **Optimized Sequences**: Timelines respect actual device performance characteristics
3. **Reduced Artifacts**: Accounts for non-linearity and latency issues
4. **Better Beat Synchronization**: Uses fastest effects and responses
5. **Predictable Behavior**: Profile data enables accurate playback timing
6. **Device Compatibility**: Automatically adapts to different light types
7. **Performance Insights**: Detailed metrics for debugging and optimization
8. **Historical Tracking**: Profiles enable detection of device degradation

## Future Enhancements

1. **Camera-Based Color Verification**: Use image analysis for accurate color accuracy
2. **Machine Learning**: Predict optimal parameters based on profile patterns
3. **Adaptive Profiling**: Re-profile devices based on age and usage patterns
4. **Cloud Syncing**: Share profiles across HA instances
5. **A/B Testing**: Compare rendering settings for different devices
6. **Advanced Brightness Curves**: Logarithmic and exponential curve fitting
7. **Effect Chaining**: Optimize sequential effect usage
8. **Power Efficiency**: Track and optimize power consumption during playback

## Implementation Status

✅ Completed:
- Enhanced Light Schema
- Extended DeviceCapabilities
- Device Measurement Collector
- Enhanced DeviceScanner
- Enhanced DeviceProfiler with new tests
- Enhanced Timeline Generator

🔄 In Progress:
- Integration testing
- Performance validation

⏱️ Future:
- Camera-based verification
- Profile persistence/loading
- Advanced analytics dashboard
