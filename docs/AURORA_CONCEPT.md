# Aurora Sound-to-Light System - Concept Overview

## Executive Summary

Aurora is an intelligent sound-to-light module that synchronizes smart home lighting with audio in real-time or through pre-rendered animations. It solves the challenge of heterogeneous lighting systems by profiling each device's capabilities and compensating for timing differences.

## Core Problem

**Challenge**: Different smart home lights from various manufacturers have:
- Different response latencies (50ms - 500ms+)
- Different color capabilities (RGB, RGBW, RGBWW, Tunable White)
- Different transition speeds
- Different command processing behaviors

**Result**: Standard "one-size-fits-all" animations appear out of sync and poorly coordinated.

## Aurora Solution

### Phase 1: Device Discovery & Profiling
1. **Scan** all Home Assistant light entities
2. **Test** each device automatically:
   - Measure command-to-response latency
   - Test color accuracy and range
   - Measure brightness response curves
   - Test transition speed capabilities
3. **Store** device profiles in database
4. **Optional**: Manual calibration for devices requiring external measurement

### Phase 2: Audio Analysis
1. **Capture** audio (live mic or pre-recorded file)
2. **Analyze** audio features:
   - BPM and tempo detection
   - Frequency analysis (bass, mid, treble)
   - Beat onset detection
   - Amplitude/volume tracking
   - Spectral analysis for color mapping
   - AI mood detection
3. **Optimize** parameters using AI/ML

### Phase 3: Pre-Rendering (Primary Mode)
1. **Generate** timeline based on audio analysis
2. **Map** audio features to lighting effects
3. **Calculate** synchronization offsets per device
4. **Compensate** for device-specific delays
5. **Create** device-specific command sequences
6. **Export** timeline with precise timestamps

### Phase 4: Execution
1. **Queue** commands with precise timing
2. **Batch** compatible commands for efficiency
3. **Execute** via Home Assistant API
4. **Monitor** (optional closed-loop feedback)
5. **Adjust** device profiles based on real measurements

## Two Execution Modes

### Mode 1: Live via Microphone
- Real-time audio capture
- Immediate analysis and execution
- Lower complexity effects
- Target: <50ms latency
- Use case: Live performances, DJ sets

### Mode 2: Pre-rendered (Focus)
- Full audio analysis upfront
- Complex effect generation
- Perfect synchronization
- Device-optimized timing
- Use case: Parties, ambient lighting, shows

## Technical Architecture Layers

```
┌─────────────────────────────────────────┐
│     Audio Input (Mic / File)            │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│   Audio Analysis & AI Intelligence      │
│   (FFT, BPM, Onset, Mood Detection)     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│   Device Management & Profiling         │
│   (Scanner, Tester, Database)           │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│   Pre-Rendering Engine                  │
│   (Timeline, Mapper, Sync Calculator)   │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│   Execution Engine                      │
│   (Queue, Timing, Batch, HA API)        │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│   Smart Home Lights (Heterogeneous)     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│   Feedback Loop (Optional)              │
│   (Monitor, Measure, Auto-adjust)       │
└─────────────────────────────────────────┘
```

## Key Innovations

### 1. Device-Aware Synchronization
Instead of sending the same command to all lights at the same time, Aurora:
- Sends commands **earlier** to slower devices
- Sends commands **later** to faster devices
- Result: All lights change **simultaneously** to the user's eye

### 2. Capability-Based Effect Mapping
Aurora only uses effects each device can actually perform:
- Color-changing bulbs get color effects
- Tunable-white bulbs get temperature effects
- Dimmable-only bulbs get brightness effects

### 3. Automated Testing & Profiling
One-time setup that measures each device:
- Turn on → measure time → record latency
- Set colors → (optional: measure with camera) → record accuracy
- Test transitions → record speed capabilities

### 4. AI-Optimized Mapping
Machine learning improves audio-to-light mapping:
- Learns which frequencies map best to which colors
- Optimizes beat detection sensitivity
- Adapts to music genre characteristics

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Audio capture module (mic + file)
- [ ] Basic FFT and frequency analysis
- [ ] Device scanner for HA entities
- [ ] Simple device profiler (latency test)

### Phase 2: Core Features (Weeks 3-4)
- [ ] Advanced audio analysis (BPM, onset detection)
- [ ] Device profile database
- [ ] Timeline generator
- [ ] Synchronization calculator

### Phase 3: Pre-rendering Engine (Weeks 5-6)
- [ ] Effect generator with device mapping
- [ ] Delay compensation system
- [ ] Timeline export/import
- [ ] Pre-rendered playback engine

### Phase 4: Live Mode (Week 7)
- [ ] Real-time execution path
- [ ] Low-latency optimizations
- [ ] Command queue manager

### Phase 5: Polish & AI (Week 8+)
- [ ] AI parameter optimizer
- [ ] Mood detection
- [ ] Closed-loop feedback system
- [ ] UI for configuration and preview

## Technical Stack

### Audio Processing
- **Web Audio API** or **native FFT** library
- **AudioWorklet** for low-latency processing
- **ML5.js** or **TensorFlow.js** for AI features

### Device Communication
- **Home Assistant WebSocket API**
- **REST API** for device discovery
- **Rate limiting** and batching logic

### Data Storage
- **SQLite** for device profiles
- **JSON** for timeline export
- **IndexedDB** for browser caching

### Language & Framework
- **TypeScript** (existing codebase)
- **Node.js** runtime
- **Bun** for performance

## Success Metrics

1. **Synchronization Accuracy**: ±20ms or better
2. **Device Coverage**: Support 95%+ of HA light types
3. **Processing Speed**: 5x real-time for pre-rendering
4. **User Setup Time**: <5 minutes for full device profiling
5. **Effect Quality**: Subjectively "professional" appearance

## Next Steps

1. **Review** this concept and architecture
2. **Approve** or request modifications
3. **Begin** implementation with Phase 1
4. **Iterate** based on testing and feedback

---

**See detailed architecture**: [AURORA_ARCHITECTURE.md](./AURORA_ARCHITECTURE.md)
