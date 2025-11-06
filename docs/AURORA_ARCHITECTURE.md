# Aurora - Sound-to-Light System Architecture

## Overview
Aurora is an intelligent sound-to-light module that analyzes audio and generates synchronized lighting animations across heterogeneous smart home lighting systems.

## System Architecture

```mermaid
flowchart TB
    subgraph Input["Audio Input Layer"]
        MIC[Live Microphone Input]
        FILE[Pre-recorded Audio File]
    end

    subgraph Analysis["Audio Analysis & Intelligence Layer"]
        CAPTURE[Audio Capture/Buffer]
        ANALYZER[Audio Analyzer]
        
        subgraph AudioFeatures["Feature Extraction"]
            BPM[BPM Detection]
            FREQ[Frequency Analysis<br/>Bass/Mid/Treble]
            AMP[Amplitude/Volume]
            ONSET[Beat/Onset Detection]
            SPECTRAL[Spectral Analysis]
            MOOD[AI Mood Detection]
        end
        
        AI_OPT[AI Parameter Optimizer<br/>Pattern Recognition]
    end

    subgraph Device["Device Management Layer"]
        SCANNER[Device Scanner]
        PROFILER[Device Profiler]
        
        subgraph DeviceTests["Automated Testing"]
            LATENCY[Latency Test]
            COLOR_TEST[Color Accuracy Test]
            BRIGHT_TEST[Brightness Response Test]
            TRANS_TEST[Transition Speed Test]
        end
        
        MANUAL_CALIB[Manual Calibration Input]
        DEVICE_DB[Device Profile Database<br/>Capabilities & Timings]
    end

    subgraph Rendering["Pre-Rendering Engine"]
        TIMELINE[Timeline Generator]
        MAPPER[Device-Audio Mapper]
        
        subgraph RenderLogic["Rendering Logic"]
            SYNC_CALC[Synchronization Calculator]
            COMP_DELAY[Compensate Device Delays]
            EFFECT_GEN[Effect Generator<br/>Color/Brightness/Patterns]
            ZONE_MAP[Zone/Group Mapping]
        end
        
        RENDER_OUT[Rendered Animation Timeline<br/>Per-Device Commands]
    end

    subgraph Execution["Execution Layer"]
        LIVE_EXE[Live Execution Engine]
        PRERENDER_EXE[Pre-rendered Playback Engine]
        
        subgraph Execute["Command Execution"]
            QUEUE[Command Queue Manager]
            TIMING[Precise Timing Controller]
            BATCH[Batch Command Optimizer]
        end
        
        HA_API[Home Assistant API]
    end

    subgraph Feedback["Feedback & Calibration Loop"]
        MONITOR[Real-time Monitor<br/>Optional Camera/Sensor]
        MEASURE[Measure Actual Timing]
        ADJUST[Auto-adjust Profiles]
        CLOSED_LOOP{Closed Loop<br/>Available?}
    end

    subgraph Output["Smart Home Devices"]
        LIGHTS[Smart Lights<br/>Various Brands]
        STRIPS[LED Strips]
        BULBS[Smart Bulbs]
        GROUPS[Light Groups]
    end

    %% Connections - Input Flow
    MIC --> CAPTURE
    FILE --> CAPTURE
    CAPTURE --> ANALYZER
    
    %% Analysis Flow
    ANALYZER --> BPM
    ANALYZER --> FREQ
    ANALYZER --> AMP
    ANALYZER --> ONSET
    ANALYZER --> SPECTRAL
    ANALYZER --> MOOD
    
    BPM --> AI_OPT
    FREQ --> AI_OPT
    AMP --> AI_OPT
    ONSET --> AI_OPT
    SPECTRAL --> AI_OPT
    MOOD --> AI_OPT
    
    %% Device Management Flow
    SCANNER --> PROFILER
    PROFILER --> LATENCY
    PROFILER --> COLOR_TEST
    PROFILER --> BRIGHT_TEST
    PROFILER --> TRANS_TEST
    
    LATENCY --> DEVICE_DB
    COLOR_TEST --> DEVICE_DB
    BRIGHT_TEST --> DEVICE_DB
    TRANS_TEST --> DEVICE_DB
    MANUAL_CALIB --> DEVICE_DB
    
    %% Rendering Flow
    AI_OPT --> TIMELINE
    DEVICE_DB --> MAPPER
    TIMELINE --> MAPPER
    
    MAPPER --> SYNC_CALC
    SYNC_CALC --> COMP_DELAY
    COMP_DELAY --> EFFECT_GEN
    EFFECT_GEN --> ZONE_MAP
    ZONE_MAP --> RENDER_OUT
    
    %% Execution Flow - Live Mode
    AI_OPT -.Live Mode.-> LIVE_EXE
    DEVICE_DB --> LIVE_EXE
    LIVE_EXE --> QUEUE
    
    %% Execution Flow - Pre-rendered Mode
    RENDER_OUT --> PRERENDER_EXE
    PRERENDER_EXE --> QUEUE
    
    %% Command Execution
    QUEUE --> TIMING
    TIMING --> BATCH
    BATCH --> HA_API
    
    %% Output
    HA_API --> LIGHTS
    HA_API --> STRIPS
    HA_API --> BULBS
    HA_API --> GROUPS
    
    %% Feedback Loop
    LIGHTS --> MONITOR
    STRIPS --> MONITOR
    BULBS --> MONITOR
    GROUPS --> MONITOR
    
    MONITOR --> CLOSED_LOOP
    CLOSED_LOOP -->|Yes| MEASURE
    CLOSED_LOOP -->|No| MANUAL_CALIB
    MEASURE --> ADJUST
    ADJUST --> DEVICE_DB
    
    %% Styling
    classDef inputStyle fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef analysisStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef deviceStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef renderStyle fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef execStyle fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    classDef feedbackStyle fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef outputStyle fill:#e0f2f1,stroke:#00897b,stroke-width:2px
    
    class MIC,FILE,CAPTURE inputStyle
    class ANALYZER,BPM,FREQ,AMP,ONSET,SPECTRAL,MOOD,AI_OPT analysisStyle
    class SCANNER,PROFILER,LATENCY,COLOR_TEST,BRIGHT_TEST,TRANS_TEST,MANUAL_CALIB,DEVICE_DB deviceStyle
    class TIMELINE,MAPPER,SYNC_CALC,COMP_DELAY,EFFECT_GEN,ZONE_MAP,RENDER_OUT renderStyle
    class LIVE_EXE,PRERENDER_EXE,QUEUE,TIMING,BATCH,HA_API execStyle
    class MONITOR,MEASURE,ADJUST,CLOSED_LOOP feedbackStyle
    class LIGHTS,STRIPS,BULBS,GROUPS outputStyle
```

## Key Components

### 1. Audio Analysis & Intelligence Layer
- **Real-time Audio Processing**: Captures and buffers audio from mic or file
- **Multi-dimensional Analysis**: 
  - BPM detection for rhythm synchronization
  - Frequency band separation (bass, mid, treble)
  - Beat onset detection for precise timing
  - Spectral analysis for color mapping
  - AI-powered mood detection for scene selection
- **AI Parameter Optimizer**: Learns optimal patterns and improves mapping over time

### 2. Device Management Layer
- **Automated Device Discovery**: Scans Home Assistant for all light entities
- **Device Profiling System**: 
  - Tests latency (command to visible response)
  - Color accuracy and gamut
  - Brightness response curves
  - Transition speed capabilities
- **Device Profile Database**: Stores calibration data per device/model
- **Manual Calibration**: Optional manual input for closed-loop testing

### 3. Pre-Rendering Engine (Primary Focus)
- **Timeline Generation**: Creates time-indexed animation sequence
- **Device-Aware Mapping**: Maps audio features to device-specific commands
- **Synchronization Calculator**: Accounts for device latencies
- **Delay Compensation**: Pre-adjusts timing per device characteristics
- **Effect Generation**: Creates color/brightness/pattern sequences
- **Zone Mapping**: Handles grouped lights and spatial distribution

### 4. Execution Layer
- **Live Mode**: Real-time processing with minimal latency
- **Pre-rendered Mode**: Playback of pre-calculated timeline with precise timing
- **Command Queue**: Manages command flow to prevent overwhelming devices
- **Batch Optimization**: Groups compatible commands for efficiency
- **Precise Timing**: Sub-100ms accuracy for synchronization

### 5. Feedback & Calibration Loop
- **Optional Monitoring**: Camera/sensor-based verification
- **Timing Measurement**: Actual response time logging
- **Auto-adjustment**: Refines device profiles based on measurements
- **Closed/Open Loop**: Supports both automatic and manual calibration

## Execution Modes

### Mode 1: Live via Microphone
```
Mic → Analysis → Live Execution → Lights
- Low latency priority
- Simplified effects
- Real-time compensation
```

### Mode 2: Pre-rendered (Primary)
```
Audio File → Full Analysis → Pre-rendering → Timeline → Playback → Lights
- Maximum quality
- Complex effects
- Perfect synchronization
- Device-optimized
```

## Device Heterogeneity Challenges

### Different Manufacturers = Different Behaviors
- **Latency**: 50ms to 500ms+ variation
- **Color Space**: RGB, RGBW, RGBWW, Tunable White
- **Transition Speed**: Fast (50ms) to Slow (2000ms+)
- **Refresh Rate**: Polling vs Push updates
- **Command Processing**: Sequential vs Parallel

### Aurora's Solution
1. **Profile Each Device**: One-time automated testing
2. **Compensate Timing**: Pre-calculate offsets per device
3. **Map Capabilities**: Use only supported features per device
4. **Test & Refine**: Optional closed-loop for perfect calibration

## Technical Requirements

### Audio Processing
- **Libraries**: Web Audio API, AudioWorklet, or native FFT
- **Sample Rate**: 44.1kHz minimum
- **Buffer Size**: Configurable (128-2048 samples)
- **Frequency Range**: 20Hz - 20kHz

### Device Communication
- **Protocol**: Home Assistant WebSocket API
- **Rate Limiting**: Respect HA limits (~60 commands/second)
- **Batching**: Group commands where possible
- **Error Handling**: Retry logic with exponential backoff

### Storage
- **Device Profiles**: SQLite or JSON file per device
- **Rendered Timelines**: JSON format with timestamp + commands
- **Audio Analysis Cache**: Store analysis results

### Performance
- **Pre-rendering**: Real-time factor of 2-10x (process 1min audio in 6-30s)
- **Live Mode**: <50ms latency target
- **Memory**: Streaming for large audio files

## Future Enhancements
- Machine learning for better audio-to-light mapping
- Spatial audio with positional lighting
- Music genre detection for preset selection
- Integration with music streaming services
- Multi-room synchronized playback
- Visual editor for timeline customization
