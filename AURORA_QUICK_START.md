# Aurora Quick Start Guide

## 🚀 Starting the Web Server

```bash
# Set Home Assistant credentials
export HASS_HOST=http://homeassistant.local:8123
export HASS_TOKEN=your_long_lived_access_token

# Start the Aurora web server
bun aurora-server.ts
```

Server starts on **http://localhost:3000**

## 🎵 Using the Web UI

1. **Open browser**: http://localhost:3000

2. **Select Audio File**:
   - Drag & drop audio file, OR
   - Click to browse, OR
   - Enter file path: `/home/jango/Musik/Tracks/song.wav`

3. **Select Devices**:
   - Click "Scan Devices" button
   - Click devices to select them (green border = selected)
   - Select multiple lights for synchronized effect

4. **Configure Settings** (optional):
   - Intensity: 0.7 (default)
   - Color Mapping: Frequency (Bass=Red, Mid=Green, Treble=Blue)
   - Brightness Mapping: Amplitude
   - Enable Beat Sync ✓
   - Enable Smooth Transitions ✓

5. **Render Timeline**:
   - Click "🎨 Analyze & Render Timeline"
   - Wait 5-15 seconds for analysis
   - Timeline is saved to database

6. **Play**:
   - Click "▶️ Play"
   - Audio plays on server
   - Lights synchronize to music
   - Monitor status in real-time

## 🎯 Example Workflow

```bash
# Terminal 1: Start server
export HASS_HOST=http://homeassistant.local:8123
export HASS_TOKEN=your_token
bun aurora-server.ts

# Terminal 2 or Browser:
xdg-open http://localhost:3000
```

In browser:
1. Enter: `/home/jango/Musik/Tracks/song.wav`
2. Click "Scan Devices"
3. Select all 5 Wohnzimmer lights
4. Click "Analyze & Render"
5. Click "Play" 🎉

## 📊 What Happens

### Analysis Phase (5-15 seconds)
- Audio file loaded
- FFT analysis extracts frequencies
- Beat detection finds rhythm
- BPM calculated
- Energy levels measured
- Mood detection

### Rendering Phase (2-5 seconds)
- Device profiles loaded (latency compensation)
- Audio features mapped to colors:
  - Bass (20-250Hz) → Red
  - Mid (250-4000Hz) → Green
  - Treble (4000-20000Hz) → Blue
- Audio amplitude mapped to brightness
- Beats synchronized to light pulses
- Commands generated for each device
- Latency compensation applied (sends commands early)
- Timeline saved to database

### Playback Phase
- Audio player starts (ffplay)
- Commands sent at precise times
- Each device receives commands compensated for its latency
- Real-time monitoring:
  - Current position
  - Commands queued/executed/failed
  - Playback state

## 🔧 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
kill $(lsof -t -i :3000)

# Or use different port
AURORA_PORT=3001 bun aurora-server.ts
```

### Browser shows "Unable to connect"
- Verify server is running: `ps aux | grep aurora-server`
- Check URL: `http://localhost:3000` (not https)
- Check firewall settings
- Try: `curl http://localhost:3000`

### Audio file not found
- Use absolute path: `/home/jango/Musik/Tracks/song.wav`
- Check file exists: `ls -lh /path/to/audio.wav`
- Verify format: WAV, MP3, FLAC, OGG supported

### Devices not found
- Check Home Assistant connection
- Verify HASS_TOKEN is correct
- Test: `curl -H "Authorization: Bearer $HASS_TOKEN" $HASS_HOST/api/states`

### Lights don't sync
- Profile devices first: See docs/AURORA_WEB_PLAYER.md
- Check network latency to Home Assistant
- Verify lights are responding in HA

### Audio doesn't play
- Check ffplay is installed: `which ffplay`
- Install FFmpeg: `sudo apt-get install ffmpeg`
- Check audio file is valid: `ffprobe audio.wav`

## 📝 Tips

### Better Sync
1. Profile each device to measure actual latency:
   ```bash
   curl -X POST http://localhost:3000/aurora/profile \
     -H "Content-Type: application/json" \
     -d '{"entityId": "light.wohnzimmer_spotlampe", "iterations": 5}'
   ```

2. Use lights in same room/area for best effect
3. Enable smooth transitions for gradual changes
4. Adjust intensity based on room size

### Performance
- Longer songs take more time to analyze
- More devices = more commands to send
- Network latency affects sync quality
- Local network (LAN) is better than WiFi

### Creative Uses
- **Party mode**: High intensity (0.9), beat sync on
- **Ambient mode**: Low intensity (0.3-0.5), smooth transitions
- **Dramatic mode**: High intensity, beat sync, no smooth transitions
- **Zone effects**: Select lights in different rooms for spatial effects

## 🎨 Advanced

### API Usage
```bash
# Analyze audio
curl -X POST http://localhost:3000/aurora/analyze \
  -H "Content-Type: application/json" \
  -d '{"audioFile": "/path/to/song.wav"}'

# List devices
curl http://localhost:3000/aurora/devices

# Render timeline
curl -X POST http://localhost:3000/aurora/render \
  -H "Content-Type: application/json" \
  -d '{
    "audioFile": "/path/to/song.wav",
    "devices": ["light.room1", "light.room2"],
    "settings": {
      "intensity": 0.8,
      "beatSync": true
    }
  }'

# Start playback
curl -X POST http://localhost:3000/aurora/play \
  -H "Content-Type: application/json" \
  -d '{"timelineId": "timeline-1234567890"}'

# Check status
curl http://localhost:3000/aurora/status
```

### Multiple Audio Sources
```javascript
// YouTube (requires yt-dlp)
// Enter in browser: https://youtube.com/watch?v=VIDEO_ID

// Spotify (requires spotdl)
// Enter in browser: spotify:track:TRACK_ID

// URL
// Enter in browser: https://example.com/audio/song.mp3
```

## 🎉 Enjoy!

Your lights now dance to the music! Experiment with different settings, audio files, and device combinations to create amazing light shows.

---

**Need help?** See full documentation: `docs/AURORA_WEB_PLAYER.md`
