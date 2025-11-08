# 🎨 Aurora Wohnzimmer Device Profiling Guide

## Discovered Wohnzimmer Lights

Based on the previous scan, here are all available devices in the Wohnzimmer area:

| # | Light | Entity ID | Status | Brightness | Color | Effects |
|----|-------|-----------|--------|-----------|-------|---------|
| 1 | Wohnzimmer Spotlampe | `light.wohnzimmer_spotlampe` | ✅ ON | ✅ Yes | ❌ No | 6 |
| 2 | Wohnzimmer Sternleuchte | `light.wohnzimmer_sternleuchte` | ✅ ON | ✅ Yes | ✅ Yes | 8 |
| 3 | Wohnzimmer Filmleuchte | `light.wohnzimmer_filmleuchte` | ⚠️ Unavailable | N/A | N/A | 8 |
| 4 | Wohnzimmer Whiteboard | `light.wohnzimmer_whiteboard` | ✅ ON | ✅ Yes | ✅ Yes | 8 |
| 5 | Wohnzimmer Schreibtisch Jan | `light.wohnzimmer_schreibtisch_jan` | ✅ ON | ✅ Yes | ❌ No | 6 |
| 6 | Wohnzimmer Schreibtisch Dennis (LED Strip) | `light.wohnzimmer_schreibtisch_dennis` | ✅ ON | ✅ Yes | ✅ Yes | 8 |

## 📊 Profiling Plan

### Profile All Available Devices (5/6)

**Devices to profile (excluding Filmleuchte - unavailable):**

```bash
# 1. Spotlampe - Brightness only
aurora_profile_device(entity_id="light.wohnzimmer_spotlampe", iterations=3)

# 2. Sternleuchte - Color + Brightness
aurora_profile_device(entity_id="light.wohnzimmer_sternleuchte", iterations=3)

# 3. Whiteboard - Color + Brightness  
aurora_profile_device(entity_id="light.wohnzimmer_whiteboard", iterations=3)

# 4. Schreibtisch Jan - Brightness only
aurora_profile_device(entity_id="light.wohnzimmer_schreibtisch_jan", iterations=3)

# 5. Schreibtisch Dennis (LED Strip) - Color + Brightness
aurora_profile_device(entity_id="light.wohnzimmer_schreibtisch_dennis", iterations=3)
```

## 🎯 What Gets Measured

For each device, Aurora measures:

### 📈 Core Metrics
- **Latency (ms)**: Command to visible response time
- **Min Transition (ms)**: Fastest fade duration
- **Max Transition (ms)**: Slowest fade duration
- **Color Accuracy (%)**: How accurately colors are reproduced (0-100%)
- **Brightness Linearity (%)**: How linear the brightness curve is (0-100%)

### 🔧 Advanced Metrics
- **Response Time Consistency**: Standard deviation in response times
- **Peak Response Time**: 99th percentile response time
- **Effect Performance**: For each supported effect
- **Transition Profiles**: Detailed transition measurements
- **Brightness Curve Data**: Input/output relationship at different levels

## 📋 Profiling Workflow

### Step 1: Profile Each Device
Run profiling for each device - takes ~30-60 seconds per device:

```
Total time expected: ~2.5-5 minutes for all 5 devices
```

### Step 2: Analyze Results
After profiling, results show:
- Which devices have low latency (good for sync)
- Which devices fade smoothly (good for effects)
- Color accuracy for color lights
- Device consistency metrics

### Step 3: Optimize Timeline Generation
Device profiles feed into Aurora timeline generation:
- Adaptive command intervals based on latency
- Optimal transition durations
- Color management based on accuracy
- Synchronized playback timing

## ✅ Current Progress

- [x] Schema issues fixed
- [x] Tool responses validated
- [ ] Profile all Wohnzimmer devices
  - [ ] Spotlampe
  - [ ] Sternleuchte
  - [ ] Whiteboard
  - [ ] Schreibtisch Jan
  - [ ] Schreibtisch Dennis (LED Strip)
- [ ] Analyze audio file
- [ ] Generate timeline
- [ ] Test playback

## 🚀 Next Steps After Profiling

1. **Analyze Audio**: `aurora_analyze_audio(audio_file="/path/to/song.wav")`
2. **Render Timeline**: `aurora_render_timeline(audio_file="...", devices=[...])`
3. **Play Timeline**: `aurora_play_timeline(timeline_id="...")`

## 💡 Device Notes

**Sternleuchte (Priority)**: Already profiled once
- Response latency: 250ms
- Transition range: 1.0-2.5s
- Color accuracy: 100%
- Brightness linearity: 60%

**Schreibtisch Dennis (LED Strip)**: Important for full coverage
- Color light with potentially faster response
- Smooth transitions expected
- Good for color effects testing

**Whiteboard**: Color light 
- Should have good color accuracy
- Full effect support

**Spotlampe & Schreibtisch Jan**: Brightness-only
- Fast brightness control
- Good for testing response times

---

**To profile all devices in Wohnzimmer:**

Use the MCP tools directly:
```
aurora_profile_device(entity_id="light.wohnzimmer_spotlampe", iterations=3)
aurora_profile_device(entity_id="light.wohnzimmer_sternleuchte", iterations=3)
aurora_profile_device(entity_id="light.wohnzimmer_whiteboard", iterations=3)
aurora_profile_device(entity_id="light.wohnzimmer_schreibtisch_jan", iterations=3)
aurora_profile_device(entity_id="light.wohnzimmer_schreibtisch_dennis", iterations=3)
```

Or call them through Home Assistant:
```bash
curl -X POST http://localhost:8123/api/services/light/turn_on \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.wohnzimmer_spotlampe", "brightness": 255}'
```
