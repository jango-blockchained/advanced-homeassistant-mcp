# Aurora Web Player

## Overview

The Aurora Web Player provides a browser-based interface for creating synchronized audio-reactive light shows for Home Assistant.

**Key Features:**
- 🎵 Multiple audio input formats (WAV, MP3, FLAC, OGG, YouTube, Spotify, URLs)
- 💡 Device selection and profiling
- 🎨 Pre-analysis and pre-rendering (no live mode needed)
- ▶️ Simple play/pause/stop controls
- 📊 Real-time playback monitoring
- 💾 Save and load timelines
- 🎯 **Device latency compensation** - Commands sent early to arrive on-beat

## Quick Start

### 1. Start the Server

```bash
# Make sure Home Assistant credentials are set
export HASS_HOST=http://homeassistant.local:8123
export HASS_TOKEN=your_long_lived_access_token

# Start the MCP server with web UI enabled
bun run src/index.ts
```

The server starts on `http://localhost:3000` by default.

### 2. Open the Web UI

Navigate to: **http://localhost:3000/aurora-player.html**

### 3. Create a Light Show

1. **Select Audio File**
   - Drag & drop audio file, or
   - Click to browse local files, or
   - Enter file path directly
   
   Supported formats: WAV, MP3, FLAC, OGG, M4A, AAC

2. **Select Devices**
   - Click "Scan Devices" to discover lights
   - Click devices to select/deselect
   - Selected devices show green border

3. **Configure Settings**
   - **Intensity**: Effect strength (0.0 - 1.0)
   - **Color Mapping**: How audio maps to colors
     - `frequency`: Bass=Red, Mid=Green, Treble=Blue
     - `mood`: Based on overall energy/mood
     - `custom`: User-defined mapping
   - **Brightness Mapping**: How audio maps to brightness
     - `amplitude`: Direct volume mapping
     - `energy`: Overall energy level
     - `beats`: Pulse on detected beats
   - **Beat Sync**: Emphasize detected beats
   - **Smooth Transitions**: Gradual color/brightness changes

4. **Render Timeline**
   - Click "Analyze & Render Timeline"
   - Audio is analyzed for:
     - BPM and beat detection
     - Frequency analysis (bass/mid/treble)
     - Energy levels
     - Mood detection
   - Timeline is generated with device-specific latency compensation
   - Timeline is saved to database

5. **Playback**
   - Click ▶️ **Play** to start
   - Audio plays on the server's audio output
   - Lights synchronize to audio
   - Monitor status:
     - Playback position
     - Commands queued/executed/failed
     - Current state
   - Use ⏸️ **Pause** / ▶️ **Resume** / ⏹️ **Stop** as needed

## Latency Compensation

Aurora automatically compensates for device response delays:

1. **Device Profiling** (optional):
   ```bash
   # Profile specific device to measure actual latency
   curl -X POST http://localhost:3000/aurora/profile \
     -H "Content-Type: application/json" \
     -d '{"entityId": "light.wohnzimmer_spotlampe", "iterations": 5}'
   ```

2. **Compensation Applied**:
   - If device has 150ms latency, commands are sent 0.15s **earlier**
   - Visual changes happen **on-time** with audio
   - Each device can have different compensation

3. **Default Values**:
   - If not profiled: 100ms assumed
   - Can be adjusted per-device in database

## Audio Input Sources

### Local Files
```javascript
// In browser: drag & drop or file picker
// Or enter path directly: /home/user/music/song.wav
```

### URLs
```javascript
// Direct audio file URLs
https://example.com/audio/song.mp3
```

### YouTube
```javascript
// Requires yt-dlp installed: pip install yt-dlp
// Enter video URL in input field
https://youtube.com/watch?v=VIDEO_ID
```

### Spotify
```javascript
// Requires spotdl installed: pip install spotdl
// Enter track URI
spotify:track:TRACK_ID
```

### Upload
```javascript
// Drag & drop any supported audio file
// Automatically converts to WAV if needed
```

## API Endpoints

### GET /aurora/devices
List available light devices from Home Assistant.

**Response:**
```json
{
  "devices": [
    {
      "entityId": "light.living_room",
      "name": "Living Room",
      "state": "on"
    }
  ]
}
```

### POST /aurora/analyze
Analyze audio file for features.

**Request:**
```json
{
  "audioFile": "/path/to/audio.wav",
  "sampleRate": 44100,
  "fftSize": 2048
}
```

**Response:**
```json
{
  "features": {
    "bpm": 128,
    "beats": [0, 0.46, 0.93, ...],
    "frequencyData": [...],
    "energy": 0.75,
    "duration": 180.5
  }
}
```

### POST /aurora/render
Render timeline from audio and devices.

**Request:**
```json
{
  "audioFile": "/path/to/audio.wav",
  "devices": ["light.living_room", "light.bedroom"],
  "settings": {
    "intensity": 0.7,
    "colorMapping": "frequency",
    "brightnessMapping": "amplitude",
    "beatSync": true,
    "smoothTransitions": true
  },
  "name": "My Light Show"
}
```

**Response:**
```json
{
  "timeline": {
    "id": "timeline-1234567890",
    "name": "My Light Show",
    "duration": 180.5,
    "tracks": [...]
  }
}
```

### POST /aurora/play
Start playback of a timeline.

**Request:**
```json
{
  "timelineId": "timeline-1234567890",
  "startPosition": 0
}
```

**Response:**
```json
{
  "status": "playing",
  "state": {
    "state": "playing",
    "position": 0,
    "queueStats": {...}
  }
}
```

### POST /aurora/pause
Pause current playback.

### POST /aurora/resume
Resume paused playback.

### POST /aurora/stop
Stop playback completely.

### GET /aurora/status
Get current playback status.

**Response:**
```json
{
  "state": {
    "state": "playing",
    "position": 45.2,
    "queueStats": {
      "queued": 150,
      "executed": 320,
      "failed": 0,
      "avgLatency": 85
    }
  }
}
```

### GET /aurora/timelines
List all saved timelines.

**Response:**
```json
{
  "timelines": [
    {
      "id": "timeline-1234567890",
      "name": "My Light Show",
      "duration": 180.5,
      "deviceCount": 5,
      "commandCount": 1250,
      "createdAt": "2025-11-08T10:30:00Z"
    }
  ]
}
```

### POST /aurora/profile
Profile a device to measure latency.

**Request:**
```json
{
  "entityId": "light.living_room",
  "iterations": 5
}
```

**Response:**
```json
{
  "profile": {
    "entityId": "light.living_room",
    "latencyMs": 147,
    "minTransitionMs": 100,
    "maxTransitionMs": 5000,
    "lastCalibrated": "2025-11-08T10:30:00Z"
  }
}
```

## Dependencies

Required software:

- **Bun**: Runtime (already installed)
- **FFmpeg**: Audio conversion and analysis
  ```bash
  sudo apt-get install ffmpeg
  ```

Optional (for extended input support):

- **yt-dlp**: YouTube audio extraction
  ```bash
  pip install yt-dlp
  ```

- **spotdl**: Spotify track downloads
  ```bash
  pip install spotdl
  ```

## Troubleshooting

### Audio doesn't play
- Check that ffplay is installed: `which ffplay`
- Verify audio file path is correct
- Check server logs for errors

### Lights don't sync properly
- Profile devices to get accurate latency: `POST /aurora/profile`
- Check network connection to Home Assistant
- Verify devices are responding: check HA states

### Timeline rendering fails
- Ensure audio file is accessible
- Check file format is supported
- Verify devices are available in Home Assistant

### Web UI not loading
- Confirm server is running on correct port
- Check browser console for errors
- Verify `/public/aurora-player.html` exists

## Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (Aurora UI)    │
└────────┬────────┘
         │ HTTP REST API
         │
┌────────▼────────────────────────────┐
│      Aurora Web Server              │
│  ┌──────────────────────────────┐   │
│  │  Audio Input Handler         │   │
│  │  - Local files               │   │
│  │  - URLs                      │   │
│  │  - YouTube (yt-dlp)          │   │
│  │  - Spotify (spotdl)          │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│  ┌──────────▼───────────────────┐   │
│  │  Audio Analyzer              │   │
│  │  - FFT analysis              │   │
│  │  - Beat detection            │   │
│  │  - Frequency extraction      │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│  ┌──────────▼───────────────────┐   │
│  │  Timeline Generator          │   │
│  │  - Map audio to colors       │   │
│  │  - Apply latency compensation│   │
│  │  - Generate commands         │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│  ┌──────────▼───────────────────┐   │
│  │  Timeline Executor           │   │
│  │  - Audio playback (ffplay)   │   │
│  │  - Command queue             │   │
│  │  - Precise timing            │   │
│  └──────────┬───────────────────┘   │
└─────────────┼───────────────────────┘
              │ Home Assistant API
              │
     ┌────────▼──────────┐
     │  Home Assistant   │
     │  ┌──────────────┐ │
     │  │ Light Devices│ │
     │  └──────────────┘ │
     └───────────────────┘
```

## Example Workflow

```bash
# 1. Start server
export HASS_HOST=http://homeassistant.local:8123
export HASS_TOKEN=your_token
bun run src/index.ts

# 2. Open browser
xdg-open http://localhost:3000/aurora-player.html

# 3. In browser UI:
#    - Upload audio file or enter path
#    - Select 5 Wohnzimmer lights
#    - Set intensity to 0.8
#    - Enable beat sync
#    - Click "Analyze & Render"
#    - Click "Play"

# 4. Enjoy synchronized light show!
```

## Performance Notes

- **Timeline rendering**: 5-15 seconds for 3-minute song
- **Command rate**: ~20-50 commands/second (safe for HA)
- **Sync accuracy**: ±50-150ms (depends on device latency)
- **Memory usage**: ~50MB for 5-minute timeline
- **Database size**: ~1MB per timeline

## Future Enhancements

- [ ] Real-time audio input (microphone)
- [ ] Advanced color palettes
- [ ] Zone-based control
- [ ] Beat prediction/lookahead
- [ ] MQTT support for faster commands
- [ ] Multi-room coordination
- [ ] Web audio visualization
- [ ] Mobile app

## License

See main project LICENSE file.
