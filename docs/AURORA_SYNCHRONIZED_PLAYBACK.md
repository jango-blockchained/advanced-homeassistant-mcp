# Aurora Synchronized Playback

## Overview

Aurora now supports **automatic music synchronization** with your Home Assistant media players. The system coordinates both audio playback and light effects to create a fully synchronized audiovisual experience.

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Aurora Play Timeline                      │
│                                                              │
│  1. Start Media Player ──────────► [Home Assistant]         │
│     - Call media_player.play_media                          │
│     - Set audio URL/file                                    │
│     - Seek to start position (if needed)                    │
│                                                              │
│  2. Start Light Timeline ────────► [Timeline Executor]      │
│     - Initialize internal timer                             │
│     - Queue all light commands                              │
│     - Start playback loop (100ms ticks)                     │
│                                                              │
│  3. Synchronized Execution                                  │
│     ┌───────────────────────────────────────────┐          │
│     │ Audio: ████████████████████░░░░░░         │          │
│     │ Lights: ████████████████████░░░░░░        │          │
│     │         ^                                  │          │
│     │         └─ Synchronized start time        │          │
│     └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Timing Precision

1. **Music Start**: Media player starts first (usually ~50-200ms latency)
2. **Light Sync**: Timeline executor uses internal timer synchronized to the same start point
3. **Command Execution**: Lights update based on pre-rendered timeline with device-specific latency compensation
4. **100ms Lookahead**: Executor checks every 100ms for commands that need execution

## Usage

### Basic Synchronized Playback

```typescript
// 1. Render a timeline from audio
const timeline = await aurora_render_timeline({
  audio_file: "/config/media/song.wav",
  devices: ["light.living_room", "light.bedroom"],
  intensity: 0.7,
  beat_sync: true
});

// 2. Play with synchronized audio
const result = await aurora_play_timeline({
  timeline_id: timeline.timeline.id,
  media_player: "media_player.spotify",
  audio_url: "http://homeassistant.local:8123/local/media/song.mp3"
});

// Response:
{
  success: true,
  status: "playing",
  timeline: {
    id: "timeline_xyz",
    name: "song",
    duration: 245.5
  },
  audio: {
    started: true,
    media_player: "media_player.spotify",
    message: "Audio playback synchronized with light timeline"
  }
}
```

### Playback Control (Both Audio and Lights)

```typescript
// Pause everything
await aurora_control_playback({
  action: "pause",
  media_player: "media_player.spotify"
});

// Resume everything
await aurora_control_playback({
  action: "resume",
  media_player: "media_player.spotify"
});

// Seek to 60 seconds on both
await aurora_control_playback({
  action: "seek",
  position: 60,
  media_player: "media_player.spotify"
});

// Stop everything
await aurora_control_playback({
  action: "stop",
  media_player: "media_player.spotify"
});
```

### Without Media Player (Lights Only)

You can still use Aurora without a media player if you want to control music manually:

```typescript
// Just lights, you handle music separately
await aurora_play_timeline({
  timeline_id: "timeline_xyz"
});
```

## Audio File Locations

### Local Files
```typescript
audio_url: "http://homeassistant.local:8123/local/media/song.mp3"
```
Files should be placed in `/config/www/media/` (accessible via `/local/media/`)

### Network URLs
```typescript
audio_url: "http://example.com/music/song.mp3"
```

### Streaming Services
If your media player supports it:
```typescript
audio_url: "spotify:track:xxxxxxxxxxxxx"
```

## Synchronization Quality

### Factors Affecting Sync

1. **Media Player Latency** (50-200ms typical)
   - Network streaming: Higher latency
   - Local files: Lower latency
   - Bluetooth: Variable latency (100-300ms)

2. **Light Device Latency** (measured by profiling)
   - Zigbee: 13-50ms (fastest)
   - WiFi: 100-300ms (variable)
   - Z-Wave: 50-150ms (medium)

3. **Network Conditions**
   - Local network: Best performance
   - Remote access: Additional latency

### Optimization Tips

1. **Profile Your Devices First**
   ```typescript
   await aurora_profile_device({
     entity_id: "light.living_room",
     iterations: 5
   });
   ```

2. **Use Local Audio Files** - Reduces streaming latency

3. **Prefer Wired/Zigbee Lights** - More consistent latency

4. **Test Start Offset** - If audio consistently leads/lags, adjust start_position:
   ```typescript
   // If music starts 0.2s before lights
   await aurora_play_timeline({
     timeline_id: "xyz",
     start_position: 0.2, // Delay lights by 200ms
     media_player: "media_player.spotify",
     audio_url: "..."
   });
   ```

## Technical Details

### Timeline Executor

The executor maintains precise timing through:

```typescript
// Internal timer tracks position
this.startTime = Date.now() - (startPosition * 1000);

// Every 100ms, check for commands
const currentTime = (Date.now() - this.startTime) / 1000;

// Execute commands within lookahead window (100ms)
if (cmd.scheduledTime <= (currentTime + 0.1)) {
  executeCommand(cmd);
}
```

### Media Player Integration

```typescript
// Start music
await hassApi.callService('media_player', 'play_media', {
  entity_id: 'media_player.spotify',
  media_content_id: audioUrl,
  media_content_type: 'music',
});

// If starting from middle of song
if (startPosition > 0) {
  await hassApi.callService('media_player', 'media_seek', {
    entity_id: 'media_player.spotify',
    seek_position: startPosition,
  });
}

// 100ms delay to ensure media player is starting
await delay(100);

// Start light timeline with same reference time
executor.play(timeline, startPosition);
```

## Troubleshooting

### Music Starts But Lights Don't

- Check that the timeline was successfully rendered
- Verify devices are available and responding
- Check Aurora status: `aurora_get_status()`

### Lights Are Out of Sync with Music

1. **Check Device Profiles**: Run profiling to measure actual latency
2. **Test Network**: High ping times indicate network issues
3. **Adjust Start Position**: Add small offset if consistent lag

### Media Player Errors

- Verify entity_id is correct: `media_player.{name}`
- Check audio URL is accessible from Home Assistant
- Test media player manually first
- Review Home Assistant logs for media player errors

## Future Enhancements

- [ ] Automatic latency calibration using microphone
- [ ] Drift correction during long playback
- [ ] Multi-room audio sync support
- [ ] Visual feedback of sync quality
- [ ] Automatic start position adjustment based on historical performance

## Examples

### Complete Workflow

```typescript
// 1. Scan for devices
const scan = await aurora_scan_devices({ area: "living_room" });

// 2. Profile key devices  
for (const device of scan.devices.slice(0, 3)) {
  await aurora_profile_device({
    entity_id: device.entityId,
    iterations: 3
  });
}

// 3. Render timeline
const timeline = await aurora_render_timeline({
  audio_file: "/config/media/song.wav",
  devices: scan.devices.map(d => d.entityId),
  intensity: 0.8,
  beat_sync: true,
  smooth_transitions: true,
  timeline_name: "Living Room Party"
});

// 4. Start synchronized playback
const playback = await aurora_play_timeline({
  timeline_id: timeline.timeline.id,
  media_player: "media_player.living_room_speaker",
  audio_url: "http://homeassistant.local:8123/local/media/song.mp3"
});

// 5. Control as needed
// await aurora_control_playback({ action: "pause", media_player: "..." });
```

## See Also

- [Aurora Architecture](AURORA_ARCHITECTURE.md)
- [Aurora Concept](AURORA_CONCEPT.md)
- [Aurora Sound Sources](AURORA_SOUND_SOURCES.md)
