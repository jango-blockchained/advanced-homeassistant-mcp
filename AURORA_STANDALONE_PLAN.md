# Aurora Standalone AI Light Show System - Comprehensive Plan

## 🎯 Project Overview

Create a **standalone Python/AI application** that performs intelligent sound-to-light synchronization with zero Home Assistant dependency (except optional initial device discovery). This will be a production-ready light show system with:

- ✨ Multiple intelligent light modes and effects
- 🎵 Real-time sound-to-light synchronization
- 🤖 AI-driven parameter optimization
- 🎨 Professional light animation system
- 📱 Web UI for control and visualization
- 🔌 Direct device protocol support (no HA relay needed)

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Aurora Standalone - AI Light Show System            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Layer 1: Audio Analysis & Intelligence             │   │
│  │ ├─ Real-time FFT analysis (numpy/scipy)           │   │
│  │ ├─ BPM detection & beat tracking                   │   │
│  │ ├─ Frequency band extraction (bass/mid/treble)    │   │
│  │ ├─ Mood/genre classification (ML)                 │   │
│  │ ├─ Spectral analysis for color mapping            │   │
│  │ └─ Amplitude envelope tracking                     │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Layer 2: Device Management & Discovery             │   │
│  │ ├─ Home Assistant optional integration             │   │
│  │ ├─ Direct Zigbee device support (ZHA/Z2M)        │   │
│  │ ├─ LIFX direct API (UDP/LIFX protocol)            │   │
│  │ ├─ Phillips Hue direct API (REST/CoAP)            │   │
│  │ ├─ Generic MQTT protocol support                  │   │
│  │ ├─ Device profiling & capability detection        │   │
│  │ ├─ Latency measurement & compensation             │   │
│  │ └─ Device profile database (SQLite)               │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Layer 3: Rendering Engine                          │   │
│  │ ├─ Timeline pre-rendering                          │   │
│  │ ├─ Audio-to-light mapping algorithms               │   │
│  │ ├─ Device-specific effect generation               │   │
│  │ ├─ Synchronization calculation                     │   │
│  │ ├─ Color palette selection                         │   │
│  │ └─ Timeline compression & optimization             │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Layer 4: Playback & Execution                      │   │
│  │ ├─ High-precision command timing                   │   │
│  │ ├─ Multi-device parallel execution                 │   │
│  │ ├─ Command batching & optimization                 │   │
│  │ ├─ Live mode (real-time mic input)                │   │
│  │ ├─ Pre-rendered mode (timeline playback)           │   │
│  │ └─ Error recovery & retry logic                    │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Layer 5: Intelligent Light Modes                   │   │
│  │ ├─ Rhythm Sync (beats → brightness pulses)        │   │
│  │ ├─ Spectrum Analyzer (freq → color gradient)       │   │
│  │ ├─ Mood-Based Colors (genre/energy → palette)     │   │
│  │ ├─ Energy Reactive (amplitude → brightness)        │   │
│  │ ├─ Gradient Flow (smooth color transitions)        │   │
│  │ ├─ Strobe Effects (tempo-locked)                   │   │
│  │ ├─ Wave Effects (directional patterns)             │   │
│  │ └─ Custom Pattern Editor (UI-driven)               │   │
│  └────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Layer 6: Web Interface & Control                   │   │
│  │ ├─ React/Vue frontend                              │   │
│  │ ├─ Real-time visualization                         │   │
│  │ ├─ Audio file management                           │   │
│  │ ├─ Timeline library                                │   │
│  │ ├─ Device control panel                            │   │
│  │ ├─ Effect customization                            │   │
│  │ └─ Live preview/demo modes                         │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Supporting Services                                │   │
│  │ ├─ FastAPI REST backend                            │   │
│  │ ├─ WebSocket for real-time updates                 │   │
│  │ ├─ SQLite database (profiles, timelines, settings) │   │
│  │ └─ File storage (audio files, rendered timelines)  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Tech Stack Recommendations

### Core Audio Processing
| Component | Technology | Reason |
|-----------|-----------|--------|
| **FFT Analysis** | `librosa` / `scipy.signal` | Industry standard, accurate, fast |
| **Real-time Audio** | `sounddevice` + `numpy` | Low-latency capture |
| **BPM Detection** | `librosa` (tempogram) | Most accurate beat tracking |
| **Beat Detection** | Custom onset detection | More reliable than libs |
| **Audio Formats** | `pydub` / `librosa` | MP3, OGG, FLAC, WAV support |

### Device Communication
| Protocol | Speed | Use Case | Implementation |
|----------|-------|----------|-----------------|
| **LIFX UDP** | ~5-10ms | LIFX-only setups | `ailifx` or custom |
| **Zigbee (direct)** | ~50-100ms | Home Assistant devices | `zigpy` / `z2m` API |
| **Phillips Hue CoAP** | ~30-50ms | Hue bridges | Direct bridge API |
| **MQTT** | ~100-200ms | Tasmota/ESPHome | `paho-mqtt` |
| **Home Assistant REST** | ~100-500ms | HA fallback | `httpx` async |
| **WebSocket** | ~50-100ms | Real-time sync | `websockets` |

**Recommendation**: Support LIFX (fastest) + Zigbee direct (most common) + MQTT (most flexible) as priority 1.

### Rendering & Effects
| Component | Technology | Reason |
|-----------|-----------|--------|
| **Color Science** | `colorspacious` / `colormath` | Accurate RGB/HSV/LAB conversion |
| **Pattern Generation** | `numpy` | Fast mathematical effects |
| **Timing Precision** | `asyncio` + `time.monotonic()` | Microsecond accuracy |
| **Timeline Storage** | JSON + `msgpack` | Compact efficient format |

### AI & Machine Learning
| Task | Technology | Notes |
|------|-----------|-------|
| **Genre Classification** | `librosa` + pre-trained models | Music mood/genre |
| **Color Palettes** | Pre-trained color schemes | Genre-based palettes |
| **Pattern Learning** | Rules-based (Phase 1) | ML later (Phase 2) |
| **Parameter Optimization** | Genetic algorithms / PSO | Fine-tune light mappings |

### Backend Framework
| Component | Technology | Reason |
|-----------|-----------|--------|
| **Web Framework** | `FastAPI` | Async, modern, WebSocket native |
| **Database** | `SQLite` + `SQLAlchemy` | Lightweight, portable |
| **Async Runtime** | `asyncio` (built-in) | Native Python, battle-tested |
| **CORS/Security** | FastAPI middleware | Built-in solutions |

### Frontend UI
| Component | Technology | Reason |
|-----------|-----------|--------|
| **Framework** | React or Vue | Reuse Aurora-UI experience |
| **Real-time** | WebSocket + React hooks | Live sync, low latency |
| **Visualization** | `Wavesurfer.js` / `Canvas API` | Waveform + spectrum display |
| **Styling** | Tailwind CSS | Consistent, fast |

---

## ⚡ Communication Protocol Strategy

### Why Not Home Assistant for Standalone?
- HA adds 100-500ms latency (REST API overhead)
- HA rate-limits commands (~60/sec)
- Network dependency (WiFi reliability)
- HA must be running (not always available)

### Best Approach for Real-Time Sync
```
┌──────────────┐        ┌─────────────┐       ┌──────────────┐
│   Aurora     │        │   Network   │       │ Smart Lights │
│  Standalone  │───────▶│ (direct or  │──────▶│ (multiple    │
│              │        │  local LAN) │       │  protocols)  │
└──────────────┘        └─────────────┘       └──────────────┘
      ↑                                              ↑
   Renders                                    Fast Response
   Timeline                                   5-100ms
   Calculates
   Timing
```

### Protocol Priority & Latency
1. **LIFX UDP** - 5-10ms (fastest, local only)
2. **Zigbee Direct** (via Z2M) - 50-100ms
3. **CoAP** (Hue bridge) - 30-50ms
4. **WebSocket** - 50-100ms
5. **MQTT** - 100-200ms
6. **REST/HTTP** - 100-500ms (use only as fallback)

### Recommended Setup
- **Priority 1**: Direct device APIs (LIFX, Hue bridge)
- **Priority 2**: Zigbee2MQTT for generic Zigbee devices
- **Priority 3**: MQTT for ESPHome/Tasmota devices
- **Optional**: Home Assistant for discovery only (device list scan)

---

## 📁 Project Structure

```
aurora/
├── README.md                          # Project overview
├── requirements.txt                   # Python dependencies
├── setup.py                          # Package setup
├── config/
│   ├── default_config.yaml           # Default settings
│   ├── device_profiles.json          # Device capabilities
│   └── color_schemes.json            # Mood-based palettes
├── src/
│   ├── aurora/
│   │   ├── __init__.py
│   │   ├── main.py                   # Entry point
│   │   ├── config.py                 # Configuration management
│   │   │
│   │   ├── audio/
│   │   │   ├── analyzer.py           # FFT, BPM, beat detection
│   │   │   ├── capture.py            # Live mic & file input
│   │   │   ├── features.py           # Audio feature extraction
│   │   │   └── utils.py              # Audio utilities
│   │   │
│   │   ├── devices/
│   │   │   ├── manager.py            # Device manager (unified API)
│   │   │   ├── scanner.py            # Device discovery
│   │   │   ├── profiler.py           # Latency testing
│   │   │   ├── protocols/
│   │   │   │   ├── lifx.py           # LIFX UDP protocol
│   │   │   │   ├── zigbee.py         # Zigbee direct support
│   │   │   │   ├── hue.py            # Philips Hue REST/CoAP
│   │   │   │   ├── mqtt.py           # MQTT protocol
│   │   │   │   └── homeassistant.py  # HA REST API
│   │   │   └── models.py             # Device models
│   │   │
│   │   ├── rendering/
│   │   │   ├── timeline.py           # Timeline generation
│   │   │   ├── mapper.py             # Audio-to-light mapping
│   │   │   ├── synchronizer.py       # Latency compensation
│   │   │   ├── effects/
│   │   │   │   ├── rhythm_sync.py
│   │   │   │   ├── spectrum.py
│   │   │   │   ├── mood_colors.py
│   │   │   │   ├── energy_reactive.py
│   │   │   │   ├── gradients.py
│   │   │   │   ├── strobe.py
│   │   │   │   └── waves.py
│   │   │   └── color_lib.py          # Color science
│   │   │
│   │   ├── execution/
│   │   │   ├── executor.py           # Timeline playback
│   │   │   ├── command_queue.py      # Command scheduling
│   │   │   ├── timing.py             # Precise timing control
│   │   │   └── player.py             # Audio playback sync
│   │   │
│   │   ├── ai/
│   │   │   ├── mood_classifier.py    # Genre/mood detection
│   │   │   ├── optimizer.py          # Parameter optimization
│   │   │   └── pattern_learner.py    # Effect learning
│   │   │
│   │   ├── database/
│   │   │   ├── models.py             # SQLAlchemy models
│   │   │   ├── repository.py         # Data access layer
│   │   │   └── migrations/
│   │   │
│   │   ├── api/
│   │   │   ├── server.py             # FastAPI app
│   │   │   ├── routes/
│   │   │   │   ├── audio.py          # Audio endpoints
│   │   │   │   ├── devices.py        # Device endpoints
│   │   │   │   ├── playback.py       # Playback control
│   │   │   │   ├── effects.py        # Effect management
│   │   │   │   └── timelines.py      # Timeline library
│   │   │   └── websocket.py          # WebSocket handlers
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.py
│   │   │   ├── timing.py
│   │   │   ├── validators.py
│   │   │   └── converters.py
│   │   │
│   │   └── constants.py
│   │
│   └── ui/                           # React/Vue frontend
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   └── utils/
│       ├── package.json
│       └── vite.config.ts
│
├── tests/
│   ├── test_audio.py
│   ├── test_devices.py
│   ├── test_rendering.py
│   └── test_effects.py
├── docs/
│   ├── INSTALLATION.md
│   ├── CONFIGURATION.md
│   ├── PROTOCOLS.md
│   ├── EFFECTS.md
│   └── API.md
├── examples/
│   ├── basic_sync.py
│   ├── device_discovery.py
│   └── custom_effect.py
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

---

## 🎨 Light Modes & Effects (Priority 1)

### Must-Have Modes
1. **Rhythm Sync** - Beats → Brightness pulses (universal effect)
2. **Spectrum Analyzer** - Frequency bands → Color gradients
3. **Mood-Based Colors** - Genre/energy → Dynamic palette
4. **Energy Reactive** - Amplitude envelope → Brightness/saturation
5. **Gradient Flow** - Smooth color transitions following music
6. **Beat-Locked Strobe** - Synchronized strobe patterns
7. **Wave Effects** - Spatial patterns across grouped lights

### Advanced Modes (Phase 2)
- Harmonic color mapping
- Synchronized movement/directions
- Multi-zone coordination
- Custom pattern editor
- AI-suggested effects

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [x] Create standalone repo structure
- [ ] Core audio analysis (FFT, BPM, beat detection)
- [ ] Device manager with LIFX support
- [ ] Basic timeline rendering
- [ ] FastAPI server skeleton

**Deliverable**: CLI tool that renders audio → timeline

### Phase 2: Device Support (Week 3)
- [ ] Zigbee direct protocol support
- [ ] Phillips Hue bridge integration
- [ ] MQTT device support
- [ ] Device profiling & latency measurement
- [ ] Timeline executor with precise timing

**Deliverable**: Command-line playback of light shows

### Phase 3: Web UI (Week 4)
- [ ] React/Vue frontend setup
- [ ] Audio file upload & visualization
- [ ] Device discovery & management UI
- [ ] Playback controls
- [ ] Effect library browser

**Deliverable**: Full web UI for non-technical users

### Phase 4: Advanced Features (Week 5+)
- [ ] AI mood/genre detection
- [ ] Real-time microphone input
- [ ] Live mode (sub-50ms latency)
- [ ] Custom pattern editor
- [ ] Timeline library & templates
- [ ] Performance optimization

**Deliverable**: Production-ready AI light show system

---

## 🔌 Device Discovery Strategy

### Initial Discovery (One-time setup)
```
User Options:
1. Home Assistant API (auto-discover all lights)
2. Manual device entry (IP addresses, IDs)
3. Network scan (LIFX/Hue broadcast discovery)
4. Zigbee2MQTT API (if available)
```

### Device Profile Storage
```json
{
  "device_id": "light.bedroom_bulb",
  "name": "Bedroom Bulb",
  "type": "LIFX",
  "ip_address": "192.168.1.100",
  "capabilities": ["color", "brightness", "transition"],
  "latency_ms": 15,
  "transition_time_min": 100,
  "transition_time_max": 2000,
  "color_space": "RGB",
  "last_profile_date": "2024-11-10"
}
```

---

## ⚙️ Technical Requirements

### Python Dependencies
```
numpy>=1.24.0              # Numerical computing
scipy>=1.10.0              # Signal processing (FFT)
librosa>=0.10.0            # Audio feature extraction
sounddevice>=0.4.5         # Real-time audio I/O
pydub>=0.25.1              # Audio format conversion
fastapi>=0.104.0           # Web framework
uvicorn>=0.24.0            # ASGI server
sqlalchemy>=2.0.0          # ORM
pydantic>=2.0.0            # Data validation
websockets>=12.0           # WebSocket support
httpx>=0.25.0              # Async HTTP
paho-mqtt>=1.6.1           # MQTT client
aiohttp>=3.9.0             # Async HTTP for LIFX
colorspacious>=1.1.1       # Color science
```

### Performance Targets
- **Timeline pre-rendering**: 2-10x real-time (1min audio in 6-60s)
- **Command latency**: < 100ms total (device send + response)
- **UI responsiveness**: < 200ms reaction time
- **Live mode**: < 50ms audio capture to light response

### Storage Requirements
- Device profiles: ~5KB per device (1000 devices = 5MB)
- Timeline database: ~1MB per 1hr of music
- Audio cache: As-needed per file

---

## 🔒 Security & Deployment

### Deployment Options
1. **Docker Compose** - Full stack (Python backend + React UI)
2. **Systemd Service** - Linux native
3. **PyInstaller Bundle** - Standalone executable
4. **Cloud Ready** - AWS/DigitalOcean compatible

### Security Considerations
- Local network only (no internet required)
- Optional authentication for UI
- Token-based device access
- Encrypted credential storage
- No third-party tracking

---

## 📈 Success Metrics

✅ Phase 1 Complete:
- Renders audio to pre-timed light commands
- Supports ≥2 device types (LIFX + Zigbee)
- Web UI operational
- <100ms command latency achieved

✅ Phase 2 Complete:
- All 7 light modes working
- Real-time visualization
- Device discovery optimized
- Live mode achieves <50ms latency

✅ Phase 3 Complete:
- AI mood detection integrated
- Performance benchmarked (1000+ devices)
- User testing completed
- Documentation complete

---

## 🎯 Next Steps

1. **Create aurora repo** at `~/Git/aurora`
2. **Extract core modules** from homeassistant-mcp
3. **Refactor for standalone** (remove HA dependencies)
4. **Implement Phase 1** systems
5. **Research & integrate** fastest device protocols
6. **Optimize timing** for sub-100ms latency

---

## 📚 References & Research

### Web Search Results Summary
- **WebSocket vs REST**: WebSocket 10-100x lower latency for real-time apps
- **Beat Detection**: Onset-based algorithms most reliable (librosa recommended)
- **Light Protocols**: LIFX UDP fastest (5-10ms), Zigbee 50-100ms, MQTT 100-200ms
- **Python Audio**: librosa (FFT), sounddevice (real-time capture) industry standard

### Key Insights
✨ **Direct device protocols > Home Assistant relay** for performance
✨ **Pre-rendering > live processing** for perfect sync
✨ **WebSocket > REST** for real-time UI updates
✨ **Async Python** (asyncio) critical for multi-device coordination
✨ **Device profiling** essential for latency compensation

---

## ✅ Approval Checklist

- [ ] Review architecture & tech stack
- [ ] Approve timeline (5-6 weeks estimated)
- [ ] Confirm device protocol priorities
- [ ] Discuss deployment preferences
- [ ] Budget for research time (~20% of schedule)

