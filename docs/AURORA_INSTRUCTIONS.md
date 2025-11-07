---
title: Aurora Sound-to-Light Module Development Guide
description: Architecture, guidelines, and development instructions for the Aurora subproject
---

# Aurora Sound-to-Light Module - Development Instructions

## Overview

Aurora is an intelligent sound-to-light system that synchronizes Home Assistant lighting devices with audio in real-time or through pre-rendered animations. It supports multi-vendor device control, automatic latency compensation, and music-aware animation sequences.

**Current Status:** Phase 2 Complete (Rendering & Execution), Phase 3 In Progress (MCP Integration)

---

## Architecture Principles

### 1. Multi-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Aurora Module                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 4: MCP Tools                                         │
│  ├─ Tool definitions and handlers                           │
│  └─ Integration with main MCP server                        │
│                                                             │
│  Layer 3: Execution Engine                                  │
│  ├─ TimelineExecutor: Playback with precise timing          │
│  ├─ LocalAudioPlayer: Sync audio playback                   │
│  └─ Command queue with adaptive throttling                  │
│                                                             │
│  Layer 2: Rendering Pipeline                               │
│  ├─ TimelineGenerator: Pre-render animation sequences       │
│  ├─ AudioLightMapper: Frequency/mood → color/brightness    │
│  ├─ SynchronizationCalculator: Latency compensation        │
│  └─ RenderSettings: Configurable rendering parameters      │
│                                                             │
│  Layer 1: Analysis & Discovery                             │
│  ├─ AudioAnalyzer: FFT, BPM, beat detection                │
│  ├─ AudioCapture: File and microphone input                │
│  ├─ DeviceScanner: Home Assistant device discovery         │
│  ├─ DeviceProfiler: Automated latency/capability testing   │
│  └─ DeviceProfile: Persistent device characteristics       │
│                                                             │
│  Foundation: Type System & Interfaces                       │
│  └─ Complete TypeScript types for all components           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Design Patterns

#### Single Responsibility Principle
- Each class handles one concern (analysis, rendering, execution, etc.)
- Files organized by function, not by layer

#### Dependency Injection
- Components receive dependencies as constructor arguments
- Enables testing and loose coupling

#### Command Pattern
- TimelineExecutor uses command objects with uniform interface
- Enables queuing, timing, and failure recovery

#### Observer Pattern
- TimelineExecutor emits state changes for UI updates
- SSE broadcasts state changes to connected clients

#### Strategy Pattern
- Multiple rendering strategies: frequency-based, mood-based, custom
- Multiple execution modes: live, prerendered, streamed

---

## Module Organization

```
src/aurora/
├── types.ts                 # All TypeScript interfaces and types
├── index.ts                 # Module exports and default config
├── profiles.ts              # Device profile management
├── tools.ts                 # MCP tool definitions
├── handlers.ts              # MCP tool implementation
│
├── ai/                      # AI/ML optimization
│   └── optimizer.ts         # Mood-based optimizations
│
├── audio/                   # Audio processing
│   ├── capture.ts          # WAV/MP3 file and microphone input
│   ├── analyzer.ts         # FFT, BPM, beat detection
│   └── player.ts           # Local audio playback sync
│
├── devices/                 # Device management
│   ├── scanner.ts          # Home Assistant device discovery
│   ├── profiler.ts         # Automated device testing
│   └── registry.ts         # Device registry (profiles, cache)
│
├── rendering/              # Timeline generation
│   ├── mapper.ts           # Audio feature → light command mapping
│   ├── synchronizer.ts     # Latency compensation
│   ├── timeline.ts         # Timeline generator (orchestrator)
│   └── effects.ts          # Effect definitions and parameters
│
├── execution/              # Playback engine
│   ├── executor.ts         # Timeline playback with timing
│   ├── queue.ts            # Command queue management
│   └── adapter.ts          # Home Assistant service adapter
│
└── examples/               # Example workflows and demos
    ├── basic-animation.ts
    ├── live-mode.ts
    └── multi-zone.ts
```

---

## Core Concepts

### 1. Audio Features

**What Aurora extracts from audio:**

```typescript
interface AudioFeatures {
  bpm: number;              // Beats per minute (tempo)
  beats: number[];          // Beat timestamps in seconds
  frequencyData: FrequencySlice[];  // Per-frame frequency analysis
  energy: number;           // Overall energy (0-1 normalized)
  mood: 'calm'|'energetic'|'intense'|'dramatic'|'ambient';
  duration: number;         // Audio length in seconds
}

interface FrequencySlice {
  timestamp: number;        // Time in audio (seconds)
  bass: number;            // 20-250 Hz normalized (0-1)
  mid: number;             // 250-4000 Hz normalized (0-1)
  treble: number;          // 4000-20000 Hz normalized (0-1)
  amplitude: number;       // Overall loudness (0-1)
  dominantFrequency: number; // Peak frequency in Hz
}
```

**Usage:**
- Bass frequencies → warm colors (red/orange)
- Treble frequencies → cool colors (blue/cyan)
- Energy → brightness
- Beats → synchronized flashes/pulses
- BPM → animation speed

### 2. Device Profiles

**What Aurora measures about each device:**

```typescript
interface DeviceProfile {
  latencyMs: number;        // Command to visible response (50-500ms)
  minTransitionMs: number;  // Minimum fade duration
  maxTransitionMs: number;  // Maximum fade duration
  colorAccuracy: number;    // Color reproduction fidelity (0-1)
  brightnessLinearity: number; // Brightness curve linearity (0-1)
  
  // Enhanced measurements
  effectsPerformance?: EffectPerformance[];
  transitionProfiles?: TransitionProfile[];
  colorAccuracyByMode?: Record<string, number>;
  brightnessCurve?: BrightnessCurveData;
  responseTimeConsistency?: number;
  peakResponseTimeMs?: number;
  
  lastCalibrated: Date;
  calibrationMethod: 'auto'|'manual'|'estimated';
}
```

**Why it matters:**
- Different devices have different response times
- Some lights fade linearly, others logarithmically
- Some can change colors faster than others
- Profile data enables latency compensation and accurate rendering

### 3. Rendering Pipeline

**Timeline generation workflow:**

```
1. Audio Analysis
   ├─ Load audio file
   ├─ Convert to mono if stereo
   ├─ Analyze frequencies (FFT)
   ├─ Detect beats and BPM
   └─ Calculate energy and mood

2. Device Discovery & Profiling
   ├─ Query Home Assistant for light devices
   ├─ Group by area/zone
   ├─ Load or create device profiles
   └─ Measure latency if needed

3. Timeline Generation
   ├─ For each time frame (e.g., every 50ms):
   │  ├─ Get current audio features
   │  ├─ Map to target colors/brightness
   │  ├─ Apply zone-specific settings
   │  └─ Generate commands for each device
   │
   ├─ Sort commands by timestamp
   ├─ Apply synchronization compensation
   └─ Group into tracks per device

4. Optimization
   ├─ Merge redundant commands
   ├─ Add smooth transitions
   ├─ Apply effects
   └─ Calculate total command count

5. Output
   └─ RenderTimeline object ready for playback
```

### 4. Execution & Synchronization

**How Aurora ensures precise timing:**

```
Timeline Playback:
│
├─ Start playback loop (10 Hz = 100ms ticks)
│  For each tick:
│  ├─ Calculate current time (wallclock - startTime)
│  ├─ Find commands scheduled for next 100ms
│  ├─ Apply device-specific latency compensation
│  ├─ Send ≤2 commands per device (throttle)
│  └─ Track execution stats (latency, failures)
│
├─ Parallel audio playback
│  ├─ LocalAudioPlayer syncs to same startTime
│  ├─ Audio and lights stay synchronized
│  └─ Seek operations sync both
│
└─ State tracking
   ├─ Emit state changes for UI
   ├─ Calculate queue statistics
   └─ Measure real execution latency
```

**Latency Compensation:**
- Profile measures device response time: 150ms average
- When generating timeline: add 150ms lead time
- When executing: compensate by applying latency offset
- Result: Lights and audio stay synchronized despite device delays

---

## Development Guidelines

### 1. Adding Audio Format Support

**Goal:** Support MP3, OGG, FLAC in addition to WAV

**Location:** `src/aurora/audio/capture.ts`

**Steps:**

1. Add decoder method:
```typescript
private async decodeMp3(buffer: Buffer): Promise<AudioBuffer> {
  // Use existing library (mp3-parser, node-lame, or web-audio-api)
  // Return AudioBuffer with decoded samples
}
```

2. Update `loadFromFile()`:
```typescript
case 'mp3':
  return await this.decodeMp3(fileBuffer);
case 'ogg':
  return await this.decodeOgg(fileBuffer);
```

3. Add tests in `__tests__/aurora/audio/capture.test.ts`

### 2. Implementing Live Microphone Input

**Goal:** Real-time animation from microphone input

**Location:** `src/aurora/audio/capture.ts`

**Implementation:**

```typescript
async captureFromMicrophone(
  durationSeconds: number,
  deviceId?: string
): Promise<AudioBuffer> {
  // Use node-microphone or sox
  // Return streaming AudioBuffer
}

// In executor:
const audioBuffer = await capture.captureFromMicrophone(300);
await this.play(timeline, 0, undefined, {
  liveAudio: true,
  audioBuffer
});
```

**Challenges:**
- Audio processing must happen in real-time (<50ms latency)
- Commands must be generated on-the-fly
- Streaming rendering instead of pre-computed

### 3. Adding Device Profile Persistence

**Goal:** Store and retrieve device profiles across sessions

**Current:** Profiles computed per session, not persisted

**Implementation:**

```typescript
// Add to src/aurora/profiles.ts
class ProfileManager {
  private storage: StorageBackend;
  
  async saveProfile(profile: DeviceProfile): Promise<void> {
    await this.storage.save(
      `profiles/${profile.entityId}`,
      JSON.stringify(profile)
    );
  }
  
  async loadProfile(entityId: string): Promise<DeviceProfile | null> {
    const data = await this.storage.load(`profiles/${entityId}`);
    return data ? JSON.parse(data) : null;
  }
}
```

**Storage Options:**
- File system (JSON files in `~/.aurora/profiles/`)
- Database (SQLite, PostgreSQL)
- Home Assistant's native storage

### 4. Implementing AI Mood Optimization

**Goal:** Learn user preferences and optimize rendering

**Location:** `src/aurora/ai/optimizer.ts`

**Concept:**

```typescript
class MoodOptimizer {
  private history: OptimizationHistory[] = [];
  
  optimizeForMood(
    features: AudioFeatures,
    userMood: string,
    preferences: UserPreferences
  ): RenderSettings {
    // 1. Look up similar songs in history
    // 2. Find settings that were rated highly (4-5 stars)
    // 3. Blend with current preferences
    // 4. Return optimized settings
  }
  
  recordUserFeedback(
    timeline: RenderTimeline,
    rating: number // 1-5 stars
  ): void {
    this.history.push({
      features: timeline.audioFeatures,
      settings: timeline.metadata.settings,
      rating,
      timestamp: new Date()
    });
  }
}
```

**Data to track:**
- Audio features (BPM, energy, mood)
- Rendering settings used
- User ratings (simple 1-5 star)
- Learning: cluster similar songs, find best settings

### 5. Building Web UI for Configuration

**Goal:** Visual interface to configure rendering parameters

**Current:** Programmatic API only

**Suggested Stack:**
- React + TypeScript (matches Node.js setup)
- Real-time preview WebSocket
- Device visualization
- Profile editor

**Integration:**
```typescript
// Add HTTP endpoint in index.ts
app.get('/aurora/api/devices', async (req, res) => {
  const scanner = new DeviceScanner(hassApi);
  const devices = await scanner.scanDevices();
  res.json(devices);
});

app.post('/aurora/api/render', async (req, res) => {
  const { audioPath, settings } = req.body;
  const timeline = await generateTimeline(audioPath, settings);
  res.json(timeline);
});
```

---

## Testing Requirements

### Unit Tests

**Coverage targets:** 80%+ for core modules

```typescript
// tests/aurora/audio/analyzer.test.ts
describe('AudioAnalyzer', () => {
  it('should detect correct BPM from known audio');
  it('should handle edge cases (silence, clicks)');
  it('should extract correct frequency bands');
  it('should classify mood correctly');
});

// tests/aurora/devices/profiler.test.ts
describe('DeviceProfiler', () => {
  it('should measure device latency');
  it('should handle unresponsive devices');
  it('should adapt to device capabilities');
});

// tests/aurora/rendering/timeline.test.ts
describe('TimelineGenerator', () => {
  it('should generate valid timeline');
  it('should apply synchronization compensation');
  it('should respect render settings');
});
```

### Integration Tests

```typescript
// tests/aurora/integration.test.ts
describe('Aurora End-to-End', () => {
  it('should generate animation for full song');
  it('should execute animation without errors');
  it('should stay synchronized with audio');
});
```

### Performance Benchmarks

```typescript
// Measure in BUN runtime
const results = Bun.serve({
  port: 3000,
  fetch: async (req) => {
    const start = performance.now();
    
    const capture = new AudioCapture();
    const audio = await capture.loadFromFile('test.wav');
    
    const analyzer = new AudioAnalyzer();
    const features = await analyzer.analyze(audio);
    
    const elapsed = performance.now() - start;
    console.log(`Analysis time: ${elapsed.toFixed(2)}ms`);
    
    return new Response(`${elapsed}ms`);
  }
});
```

---

## Performance Optimization Targets

### Memory Optimization

**Current:** ~5MB per 10-minute timeline (timeline + cache)

**Target:** <2MB per timeline

**Strategies:**
1. Stream commands to disk if timeline > 5MB
2. Lazy-load frequency data on demand
3. Compress profiles with zlib
4. Use typed arrays instead of plain objects

### CPU Optimization

**Current:** 5-10s to analyze 10-minute song

**Target:** <2s analysis time

**Strategies:**
1. Use WASM FFT library (kissfft.js)
2. Multi-threaded analysis with Worker threads
3. Cache FFT windows
4. Batch process frequency bands

### I/O Optimization

**Current:** One device query per render

**Target:** Cached device list with periodic updates

**Strategies:**
1. Cache device capabilities (24h TTL)
2. Batch HA API calls
3. Use WebSocket for real-time updates
4. Pre-fetch device profiles on startup

---

## Security Considerations

### Audio File Handling

**Risk:** Malformed audio files could crash analyzer

**Mitigation:**
```typescript
try {
  const audio = await capture.loadFromFile(userProvidedPath);
} catch (error) {
  logger.error('Failed to load audio:', error);
  // Return safe error, don't expose file paths
  throw new Error('Unable to load audio file');
}
```

### Device Control

**Risk:** Malicious users send unlimited commands

**Mitigation:**
```typescript
// Rate limit: max 20 commands/second per device
// Validate all device IDs against HA registry
// Require authentication for rendering
// Log all animation executions
```

### Profile Data

**Risk:** Device profiles contain sensitive timing data

**Mitigation:**
- Store in restricted directory (~/.aurora/)
- Encrypt if stored in cloud
- Validate profile format on load

---

## Troubleshooting Guide

### Audio Analysis Returns Zero BPM

**Cause:** Audio is silent or corrupt

**Debug:**
```typescript
const features = await analyzer.analyze(audio);
if (features.bpm === 0) {
  console.log('Energy levels:', features.frequencyData
    .slice(0, 5)
    .map(f => f.amplitude)
  );
}
```

**Fix:** Validate audio before analysis

### Lights Don't Respond to Commands

**Cause:** Device profile latency incorrect

**Debug:**
```typescript
const profile = await profiler.profileDevice(device);
console.log('Measured latency:', profile.latencyMs);
```

**Fix:** Re-profile device with `--force-profile` flag

### Timeline Playback Stutters

**Cause:** Too many commands queued

**Debug:**
```typescript
const stats = executor.getQueueStats();
console.log('Pending commands:', stats.queued);
```

**Fix:** Reduce command rate or use fewer lights

---

## Contributing

### Code Style

- TypeScript strict mode required
- ESLint + Prettier formatting
- Comprehensive JSDoc comments
- Meaningful variable names

### Commit Messages

```
feat(aurora): add MP3 audio support
- Implement MP3 decoding with mp3-parser
- Add test coverage for MP3 files
- Update documentation

fix(aurora): fix timeline executor memory leak
- Add proper cleanup in pause/stop handlers
- Clear pending commands queue
- Fixes #123
```

### PR Requirements

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Performance impact assessed
- [ ] Security review (if applicable)

---

## Resources

### Audio Processing
- FFT concepts: https://en.wikipedia.org/wiki/Fast_Fourier_transform
- BPM detection: https://aubio.org/
- Audio formats: WAVE spec, ID3 tags

### Home Assistant
- Light service: https://www.home-assistant.io/integrations/light/
- Entity registration: https://developers.home-assistant.io/docs/core/entity/
- WebSocket API: https://developers.home-assistant.io/docs/api/websocket/

### Performance
- Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- WASM: https://webassembly.org/
- Node.js profiling: https://nodejs.org/en/docs/guides/simple-profiling/

---

## Future Roadmap

### Q4 2025
- [ ] MP3/OGG support
- [ ] Live microphone input
- [ ] Profile persistence (files)
- [ ] AI mood optimization v1

### Q1 2026
- [ ] Web UI (basic preview)
- [ ] Database integration (profiles, history)
- [ ] Multi-zone rendering
- [ ] Effect library expansion

### Q2 2026
- [ ] Camera feedback (color accuracy testing)
- [ ] AI optimization v2 (neural network)
- [ ] Streaming timeline rendering
- [ ] Mobile companion app

---

**Last Updated:** November 8, 2025
**Author:** Development Team
**Status:** In Active Development
