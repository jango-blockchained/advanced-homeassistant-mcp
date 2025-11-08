# Aurora via MCP - Wohnzimmer Lights Calibration & Measurement

## 🎵 Aurora Sound-to-Light System - MCP Integration

Aurora is fully integrated with the Home Assistant MCP server and provides the following tools:

### Available MCP Tools for Aurora

#### 1. **aurora_scan_devices** - Device Discovery
- Scans Home Assistant for available light devices
- Filters by area/room (e.g., "Wohnzimmer")
- Filters by capability (color, color_temp, brightness)

**Usage Example:**
```
area: "Wohnzimmer"
capability: "brightness"
```

#### 2. **aurora_profile_device** - Device Profiling & Measurement
- Profiles a single light device to measure:
  - Response latency (command to visible response time)
  - Transition capabilities
  - Color accuracy
  - Brightness linearity
  - Effect performance
- Tests with configurable iterations (default: 3)

**Usage Example:**
```
entity_id: "light.wohnzimmer_spotlampe"
iterations: 3
```

#### 3. **aurora_analyze_audio** - Audio Analysis
- Analyzes audio files for:
  - BPM detection
  - Beat detection
  - Mood classification
  - Frequency analysis (bass, mid, treble)
  - Dominant frequencies

**Usage Example:**
```
audio_file: "/path/to/audio.wav"
sample_rate: 44100
fft_size: 2048
```

#### 4. **aurora_render_timeline** - Timeline Generation
- Generates pre-rendered lighting timeline synchronized to audio
- Maps audio features to light commands
- Includes device-specific timing compensation

**Usage Example:**
```
audio_file: "/path/to/audio.wav"
devices: ["light.wohnzimmer_spotlampe", "light.wohnzimmer_sternleuchte"]
intensity: 0.7
color_mapping: "frequency"
beat_sync: true
smooth_transitions: true
```

#### 5. **aurora_play_timeline** - Timeline Playback
- Executes pre-rendered timeline with precise synchronization
- Supports start position control

#### 6. **aurora_control_playback** - Playback Control
- Pause, resume, stop, or seek through active timeline

#### 7. **aurora_get_status** - System Status
- Get current Aurora system status
- View playback state and statistics

#### 8. **aurora_list_timelines** - Timeline Management
- List all saved Aurora timelines

---

## 🏠 Wohnzimmer Lights Discovered

Found 6 lights in Wohnzimmer:

1. **Wohnzimmer Spotlampe** (`light.wohnzimmer_spotlampe`)
   - Brightness: ✅
   - Color: ❌
   - Effects: 6

2. **Wohnzimmer Sternleuchte** (`light.wohnzimmer_sternleuchte`)
   - Brightness: ✅
   - Color: ✅
   - Effects: 8

3. **Wohnzimmer Filmleuchte** (`light.wohnzimmer_filmleuchte`)
   - Status: unavailable

4. **Wohnzimmer Whiteboard** (`light.wohnzimmer_whiteboard`)
   - Brightness: ✅
   - Color: ✅
   - Effects: 8

5. **Wohnzimmer Schreibtisch Jan** (`light.wohnzimmer_schreibtisch_jan`)
   - Brightness: ✅
   - Color: ❌
   - Effects: 6

6. **Wohnzimmer Schreibtisch Dennis** (`light.wohnzimmer_schreibtisch_dennis`)
   - Brightness: ✅
   - Color: ✅
   - Effects: 8

---

## 📝 Workflow: Calibrate & Measure Wohnzimmer Lights

### Step 1: Scan Devices
```
Tool: aurora_scan_devices
Parameters: {
  "area": "Wohnzimmer"
}
```

### Step 2: Profile Each Light
```
Tool: aurora_profile_device
Parameters: {
  "entity_id": "light.wohnzimmer_spotlampe",
  "iterations": 3
}
```

Repeat for each device:
- `light.wohnzimmer_sternleuchte`
- `light.wohnzimmer_whiteboard`
- `light.wohnzimmer_schreibtisch_jan`
- `light.wohnzimmer_schreibtisch_dennis`

### Step 3: Analyze Audio (Optional)
```
Tool: aurora_analyze_audio
Parameters: {
  "audio_file": "/path/to/music.wav",
  "sample_rate": 44100,
  "fft_size": 2048
}
```

### Step 4: Generate Timeline
```
Tool: aurora_render_timeline
Parameters: {
  "audio_file": "/path/to/music.wav",
  "devices": [
    "light.wohnzimmer_spotlampe",
    "light.wohnzimmer_sternleuchte",
    "light.wohnzimmer_whiteboard",
    "light.wohnzimmer_schreibtisch_jan",
    "light.wohnzimmer_schreibtisch_dennis"
  ],
  "intensity": 0.7,
  "color_mapping": "frequency",
  "beat_sync": true,
  "smooth_transitions": true
}
```

### Step 5: Play Timeline
```
Tool: aurora_play_timeline
Parameters: {
  "timeline_id": "<timeline_id_from_step_4>"
}
```

---

## 📊 Profiling Results Storage

Profiles are automatically saved to:
- Database: `~/.aurora/aurora.db`
- Profiles directory: `./aurora-profiles/`

### Profile Data Collected
- Response latency (ms)
- Transition duration (ms)
- Color accuracy (%)
- Brightness linearity (%)
- Effect performance
- Calibration timestamp
- Calibration method

---

## 🚀 Next Steps via MCP

To use Aurora via MCP in this session:

1. **Use aurora_scan_devices** to list Wohnzimmer lights
2. **Use aurora_profile_device** for each light to measure:
   - Response latency
   - Transition capabilities
   - Color accuracy
3. **Use aurora_analyze_audio** on any audio file
4. **Use aurora_render_timeline** to generate synchronized commands
5. **Use aurora_play_timeline** to execute the timeline

All operations are performed through MCP tools without needing separate scripts!

