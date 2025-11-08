# 🎵 Aurora Wohnzimmer Lights - Profiling & Measurement Report
**Date:** November 8, 2025  
**Status:** Ready for Profiling via Aurora MCP Tools

## 📊 Discovered Lights

| Light | Entity ID | State | Brightness | Color | Effects |
|-------|-----------|-------|-----------|-------|---------|
| Wohnzimmer Spotlampe | `light.wohnzimmer_spotlampe` | ON | ✅ | ❌ | 6 |
| Wohnzimmer Sternleuchte | `light.wohnzimmer_sternleuchte` | ON | ✅ | ✅ | 8 |
| Wohnzimmer Filmleuchte | `light.wohnzimmer_filmleuchte` | ❌ UNAVAILABLE | N/A | N/A | 8 |
| Wohnzimmer Whiteboard | `light.wohnzimmer_whiteboard` | ON | ✅ | ✅ | 8 |
| Wohnzimmer Schreibtisch Jan | `light.wohnzimmer_schreibtisch_jan` | ON | ✅ | ❌ | 6 |
| Wohnzimmer Schreibtisch Dennis | `light.wohnzimmer_schreibtisch_dennis` | ON | ✅ | ✅ | 8 |

## 🔍 Profiling Tools Available

### Via Aurora MCP:

**1. Scan Devices**
```
aurora_scan_devices
  area: "Wohnzimmer"
  capability: "brightness" | "color" | "color_temp"
```

**2. Profile Device** 
```
aurora_profile_device
  entity_id: "light.wohnzimmer_spotlampe"
  iterations: 3 (default)
```

Measures:
- Response latency (ms)
- Min/max transition times
- Color accuracy (%)
- Brightness linearity (%)
- Calibration timestamp & method

**3. Analyze Audio**
```
aurora_analyze_audio
  audio_file: "/path/to/audio.wav"
  sample_rate: 44100 (default)
  fft_size: 2048 (default)
```

**4. Render Timeline**
```
aurora_render_timeline
  audio_file: "/path/to/audio.wav"
  devices: ["light.wohnzimmer_spotlampe", ...]
  intensity: 0.7 (0.0-1.0)
  color_mapping: "frequency" | "mood" | "custom"
  beat_sync: true
  smooth_transitions: true
```

**5. Play Timeline**
```
aurora_play_timeline
  timeline_id: "<timeline_id>"
  start_position: 0
```

## 📈 Profiling Workflow

To profile and measure all 6 lights:

### Step 1: Scan Wohnzimmer devices
```
→ aurora_scan_devices(area="Wohnzimmer")
```

### Step 2: Profile each light (5 available)
```
→ aurora_profile_device(entity_id="light.wohnzimmer_spotlampe", iterations=3)
→ aurora_profile_device(entity_id="light.wohnzimmer_sternleuchte", iterations=3)
→ aurora_profile_device(entity_id="light.wohnzimmer_whiteboard", iterations=3)
→ aurora_profile_device(entity_id="light.wohnzimmer_schreibtisch_jan", iterations=3)
→ aurora_profile_device(entity_id="light.wohnzimmer_schreibtisch_dennis", iterations=3)
```

### Step 3: Results
Each profile will measure:
- **Response Latency**: Average, min, max response times
- **Transitions**: Min/max transition durations
- **Color Accuracy**: How accurately colors are reproduced (0-100%)
- **Brightness Linearity**: How linear the brightness curve is (0-100%)
- **Calibration**: Timestamp and method used

## 💾 Storage

Profiles are automatically stored in:
- **Database**: `~/.aurora/aurora.db` (SQLite)
- **Profiles Directory**: `./aurora-profiles/`

## 🚀 Next Steps

1. Use `aurora_scan_devices` to list all devices
2. Use `aurora_profile_device` for each light to measure capabilities
3. Profiles enable optimal light synchronization for audio playback
4. Prepare audio files for analysis and timeline generation
5. Render and play synchronized light timelines

---

**Note:** Filmleuchte is currently unavailable and cannot be profiled.

