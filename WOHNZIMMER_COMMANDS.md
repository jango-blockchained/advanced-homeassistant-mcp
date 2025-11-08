# 🎨 Aurora Wohnzimmer - MCP Commands Reference

## Summary

All Aurora tool schema issues are **FIXED ✅**. Ready to profile all Wohnzimmer devices.

## Wohnzimmer Devices to Profile

**IMPORTANT: Filter by area = "Wohnzimmer" only**

### Available Devices (5/6)

1. `light.wohnzimmer_spotlampe` - Brightness light
2. `light.wohnzimmer_sternleuchte` - Color light (already profiled)
3. `light.wohnzimmer_whiteboard` - Color light
4. `light.wohnzimmer_schreibtisch_jan` - Brightness light
5. `light.wohnzimmer_schreibtisch_dennis` - LED Strip (color)

(Skip: `light.wohnzimmer_filmleuchte` - unavailable)

## MCP Commands for Profiling

### Profile Each Device

```
// 1. Spotlampe (brightness only)
aurora_profile_device(
  entity_id="light.wohnzimmer_spotlampe",
  iterations=3
)

// 2. Sternleuchte (color - already done)
aurora_profile_device(
  entity_id="light.wohnzimmer_sternleuchte",
  iterations=3
)

// 3. Whiteboard (color)
aurora_profile_device(
  entity_id="light.wohnzimmer_whiteboard",
  iterations=3
)

// 4. Schreibtisch Jan (brightness)
aurora_profile_device(
  entity_id="light.wohnzimmer_schreibtisch_jan",
  iterations=3
)

// 5. Schreibtisch Dennis LED Strip (color)
aurora_profile_device(
  entity_id="light.wohnzimmer_schreibtisch_dennis",
  iterations=3
)
```

## Expected Outputs

Each profile returns:

```json
{
  "entity_id": "light.wohnzimmer_spotlampe",
  "latency_ms": 200,
  "min_transition_ms": 100,
  "max_transition_ms": 2000,
  "color_accuracy": 0.95,
  "brightness_linearity": 0.85,
  "last_calibrated": "2025-11-08T...",
  "calibration_method": "auto",
  "test_iterations": 3
}
```

## Workflow After Profiling

### 1. Analyze Audio File

```
aurora_analyze_audio(
  audio_file="/path/to/song.wav",
  sample_rate=44100,
  fft_size=2048
)
```

Returns: BPM, beats, mood, frequency data

### 2. Render Timeline

```
aurora_render_timeline(
  audio_file="/path/to/song.wav",
  devices=[
    "light.wohnzimmer_spotlampe",
    "light.wohnzimmer_sternleuchte",
    "light.wohnzimmer_whiteboard",
    "light.wohnzimmer_schreibtisch_jan",
    "light.wohnzimmer_schreibtisch_dennis"
  ],
  intensity=0.7,
  color_mapping="frequency",
  beat_sync=true,
  smooth_transitions=true,
  timeline_name="Wohnzimmer Party Mix"
)
```

Returns: timeline ID, rendering stats

### 3. Play Timeline

```
aurora_play_timeline(
  timeline_id="<timeline_id>",
  start_position=0,
  media_player="media_player.living_room",
  audio_url="http://localhost:8123/local/song.wav"
)
```

## Key Metrics Explained

| Metric | Range | What It Means |
|--------|-------|---------------|
| Latency | 50-500ms | How fast light responds to commands |
| Min Transition | 100-2000ms | Fastest fade speed |
| Max Transition | 100-2000ms | Slowest fade speed |
| Color Accuracy | 0-1.0 (0-100%) | How accurately colors match |
| Brightness Linearity | 0-1.0 (0-100%) | How smooth brightness changes are |

## Good Ranges

- ✅ Latency < 250ms = Good for sync
- ✅ Latency 250-500ms = Acceptable
- ⚠️ Latency > 500ms = May need compensation

- ✅ Color Accuracy > 0.9 = Excellent
- ✅ Brightness Linearity > 0.8 = Smooth curves

## Files Updated

- `profile-wohnzimmer-devices.ts` - Batch profiling script
- `WOHNZIMMER_PROFILING_GUIDE.md` - Detailed guide
- `WOHNZIMMER_PROFILING_STATUS.md` - Current status
- `AURORA_SCHEMA_FIX_SUMMARY.md` - Schema fixes

## Previous Results

**Sternleuchte (already profiled)**
- Latency: 250ms ✅
- Transitions: 1.0-2.5s
- Color Accuracy: 100%
- Brightness Linearity: 60%

---

**Ready to profile all Wohnzimmer devices! 🚀**
