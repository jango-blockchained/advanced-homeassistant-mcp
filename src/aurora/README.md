# Aurora Sound-to-Light Module

## Status: Alpha Development

The Aurora module is an intelligent sound-to-light system that synchronizes Home Assistant lighting with audio in real-time or through pre-rendered animations.

## Current Implementation Status

### ✅ Completed
- **Type Definitions** (`types.ts`) - Complete type system for all Aurora components
- **Audio Capture** (`audio/capture.ts`) - WAV file loading and audio buffer management
- **Audio Analyzer** (`audio/analyzer.ts`) - FFT analysis, BPM detection, beat detection
- **Device Scanner** (`devices/scanner.ts`) - Home Assistant light entity discovery
- **Device Profiler** (`devices/profiler.ts`) - Automated latency and capability testing

### 🚧 In Progress
- Rendering Engine - Timeline generation and synchronization
- Execution Engine - Command queue and playback
- MCP Tool Integration - Exposing Aurora via Model Context Protocol

### 📋 Planned
- Live microphone input
- MP3/OGG audio decoding
- AI-powered mood detection and optimization
- Closed-loop feedback with camera
- Web UI for configuration and preview

## Quick Start

### Analyze Audio File

```typescript
import { AudioCapture, AudioAnalyzer } from './aurora';

const capture = new AudioCapture();
const analyzer = new AudioAnalyzer();

const audioBuffer = await capture.loadFromFile('/path/to/song.wav');
const features = await analyzer.analyze(audioBuffer);

console.log(`BPM: ${features.bpm}`);
console.log(`Beats: ${features.beats.length}`);
console.log(`Mood: ${features.mood}`);
```

### Scan and Profile Devices

```typescript
import { DeviceScanner, DeviceProfiler } from './aurora';
import { hassApi } from '../hass/api';

const scanner = new DeviceScanner(hassApi);
const profiler = new DeviceProfiler(
  hassApi.callService.bind(hassApi),
  hassApi.getState.bind(hassApi)
);

// Scan for all lights
const devices = await scanner.scanDevices();
console.log(`Found ${devices.length} light devices`);

// Profile a specific device
const device = devices[0];
const profile = await profiler.profileDevice(device);
console.log(`Device latency: ${profile.latencyMs}ms`);
```

## Architecture

```
aurora/
├── types.ts                 # Type definitions
├── index.ts                 # Main entry point
├── audio/
│   ├── capture.ts          # Audio input (file/mic)
│   └── analyzer.ts         # FFT and beat detection
├── devices/
│   ├── scanner.ts          # HA device discovery
│   └── profiler.ts         # Automated testing
├── rendering/              # [TODO] Timeline generation
│   ├── timeline.ts
│   ├── mapper.ts
│   └── synchronizer.ts
├── execution/              # [TODO] Playback engine
│   ├── queue.ts
│   └── executor.ts
└── ai/                     # [TODO] AI optimization
    └── optimizer.ts
```

## Audio Analysis Features

- **Frequency Analysis**: Bass, mid, treble extraction
- **Beat Detection**: Onset-based beat detection with adaptive threshold
- **BPM Calculation**: Tempo detection from beat intervals
- **Mood Detection**: Classify as calm, energetic, intense, dramatic, or ambient
- **Energy Calculation**: Overall audio energy level

## Device Profiling

The profiler automatically tests each light device to measure:

- **Latency**: Time from command to visible response (50-500ms typical)
- **Transition Speed**: Min/max transition times
- **Color Accuracy**: RGB color reproduction (placeholder for camera integration)

This data is used to compensate for device differences during rendering.

## Known Limitations

1. **Audio Formats**: Currently only supports WAV files (MP3 coming soon)
2. **Microphone**: Live capture not yet implemented
3. **Color Testing**: Requires manual verification (camera integration planned)
4. **Profile Storage**: Persistence not yet implemented
5. **HA API Integration**: Scanner needs proper Home Assistant API integration

## Next Steps

See the main architecture document at `/docs/AURORA_ARCHITECTURE.md` for the complete roadmap and feature set.

## Contributing

This module is under active development. Key areas needing work:

1. **Audio Decoding**: Add MP3/OGG support (libraries: `mpg123`, `node-lame`)
2. **Microphone**: Implement live capture (libraries: `node-microphone`, `sox`)
3. **Rendering**: Build timeline generator with device mapping
4. **Execution**: Command queue with precise timing
5. **Testing**: Unit tests for all modules

## License

Same as parent project (see root LICENSE file)
