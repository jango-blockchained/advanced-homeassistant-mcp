# 🎵 Aurora Sound Sources Guide

## Overview

Aurora supports multiple sound input sources for creating synchronized light shows. This guide explains available options and how to use them.

---

## ✅ Currently Available

### 1. File Input (Supported)

Load pre-recorded audio files for analysis and timeline generation.

#### Supported Formats

**WAV (Fully Supported)**
- 8-bit and 16-bit PCM
- Mono or Stereo
- Any sample rate (auto-resampled to 44100 Hz)

```typescript
// MCP Command
"Analyze the audio file at /home/user/music/song.wav"

// Direct API
{
  "tool": "aurora_analyze_audio",
  "arguments": {
    "audio_file": "/home/user/music/song.wav",
    "sample_rate": 44100,
    "fft_size": 2048
  }
}
```

**Other Formats (Coming Soon)**
- MP3 - Requires decoder library
- OGG - Requires decoder library
- FLAC - Requires decoder library
- AAC - Requires decoder library

---

## 🔜 Planned Features

### 2. Microphone Input (Phase 3)

Live audio capture from system microphone for real-time light shows.

#### Future Implementation

```typescript
// Planned API
{
  "tool": "aurora_capture_live",
  "arguments": {
    "source": "microphone",
    "device_id": "default",  // or specific mic ID
    "duration": 10,          // seconds to capture
    "sample_rate": 44100
  }
}
```

**Use Cases:**
- Live DJ performances
- Karaoke nights
- Real-time ambient lighting
- Party mode

**Libraries to integrate:**
- `node-microphone` - Cross-platform mic access
- `sox` - Audio processing toolkit
- `portaudio` - Low-latency audio I/O

### 3. Streaming Audio (Phase 3)

Capture audio from system output or streaming services.

#### Planned Sources

**System Audio Loopback**
```typescript
{
  "tool": "aurora_capture_live",
  "arguments": {
    "source": "system_audio",
    "device": "default_output"
  }
}
```

**Network Streams**
```typescript
{
  "tool": "aurora_stream_audio",
  "arguments": {
    "url": "http://stream.example.com/audio",
    "format": "mp3"
  }
}
```

**Use Cases:**
- Sync to Spotify/YouTube
- Radio streams
- Home theater audio
- Gaming audio

### 4. Home Assistant Media Players (Phase 4)

Integrate with Home Assistant media players for automatic sync.

```typescript
{
  "tool": "aurora_sync_media_player",
  "arguments": {
    "entity_id": "media_player.living_room",
    "auto_detect": true
  }
}
```

**Features:**
- Automatic playback detection
- Sync to current playing media
- Volume-reactive lighting
- Genre-based color schemes

---

## 🎯 Current Workflow

### Step-by-Step: File-Based Sound-to-Light

1. **Prepare Audio File**
   ```bash
   # Convert MP3 to WAV if needed
   ffmpeg -i song.mp3 -ar 44100 -ac 1 song.wav
   ```

2. **Scan Devices**
   ```
   "Scan my Home Assistant for Aurora-compatible lights"
   ```

3. **Profile Devices** (optional but recommended)
   ```
   "Profile light.living_room for Aurora synchronization"
   "Profile light.bedroom for Aurora synchronization"
   ```

4. **Analyze Audio**
   ```
   "Analyze the audio file at /home/user/music/song.wav"
   ```

5. **Render Timeline**
   ```
   "Create an Aurora light show for this song with intensity 0.8"
   ```

6. **Play Timeline**
   ```
   "Play the Aurora timeline"
   ```

7. **Control Playback**
   ```
   "Pause the light show"
   "Resume playback"
   "Seek to 30 seconds"
   "Stop Aurora"
   ```

---

## 🔧 Adding New Sound Sources

### Option 1: Add Microphone Support

1. **Install Audio Library**
   ```bash
   bun add node-mic
   ```

2. **Extend AudioCapture Class**
   ```typescript
   // src/aurora/audio/capture.ts
   
   import mic from 'node-mic';
   
   async captureFromMicrophone(
     durationSeconds: number,
     deviceId?: string
   ): Promise<AudioBuffer> {
     return new Promise((resolve, reject) => {
       const micInstance = mic({
         rate: this.sampleRate,
         channels: this.channels,
         device: deviceId,
       });
       
       const micInputStream = micInstance.getAudioStream();
       const chunks: Buffer[] = [];
       
       micInputStream.on('data', (chunk: Buffer) => {
         chunks.push(chunk);
       });
       
       setTimeout(() => {
         micInstance.stop();
         const audioData = Buffer.concat(chunks);
         resolve(this.bufferToAudioBuffer(audioData));
       }, durationSeconds * 1000);
       
       micInstance.start();
     });
   }
   ```

3. **Add MCP Tool**
   ```typescript
   // src/tools/aurora/capture-live.tool.ts
   
   export const auroraCaptureLiveTool: Tool = {
     name: "aurora_capture_live",
     description: "Capture live audio from microphone",
     parameters: z.object({
       duration: z.number().default(10),
       device_id: z.string().optional(),
     }),
     execute: async (args) => {
       const manager = await getAuroraManager();
       const audioBuffer = await manager.captureFromMicrophone(
         args.duration,
         args.device_id
       );
       return { success: true, audioBuffer };
     }
   };
   ```

### Option 2: Add Streaming Support

1. **Install Streaming Library**
   ```bash
   bun add node-stream-audio
   ```

2. **Create Stream Handler**
   ```typescript
   // src/aurora/audio/stream.ts
   
   export class AudioStream {
     async captureFromURL(url: string): Promise<AudioBuffer> {
       // Implement HTTP stream capture
     }
     
     async captureSystemAudio(): Promise<AudioBuffer> {
       // Implement system audio loopback
     }
   }
   ```

### Option 3: Add Format Support

1. **Install Decoder**
   ```bash
   bun add @discordjs/opus  # For OGG
   bun add node-lame        # For MP3
   ```

2. **Extend Decode Methods**
   ```typescript
   // src/aurora/audio/capture.ts
   
   private async decodeMp3(buffer: Buffer): Promise<AudioBuffer> {
     const lame = require('node-lame').Lame;
     const decoder = new lame({ output: 'buffer' });
     const decoded = await decoder.decode(buffer);
     return this.bufferToAudioBuffer(decoded);
   }
   ```

---

## 📋 Sound Source Checklist

### For File-Based (Current)
- ✅ WAV file in correct format
- ✅ File path accessible to server
- ✅ Sufficient disk space for timeline storage

### For Live Mode (Future)
- ⏳ Microphone permissions granted
- ⏳ Audio input device selected
- ⏳ Low-latency audio drivers
- ⏳ Sufficient CPU for real-time processing

### For Streaming (Future)
- ⏳ Network connectivity
- ⏳ Stream URL accessible
- ⏳ Format decoder available
- ⏳ Buffering strategy configured

---

## 🎛️ Audio Quality Settings

### Recommended Settings by Use Case

**Studio Quality** (Pre-rendered timelines)
```typescript
{
  sample_rate: 44100,
  fft_size: 4096,
  hop_size: 512,
  bit_depth: 16
}
```

**Live Performance** (Low latency)
```typescript
{
  sample_rate: 44100,
  fft_size: 1024,
  hop_size: 256,
  bit_depth: 16
}
```

**Ambient Lighting** (CPU efficient)
```typescript
{
  sample_rate: 22050,
  fft_size: 512,
  hop_size: 128,
  bit_depth: 8
}
```

---

## 🐛 Troubleshooting

### "Unsupported audio format"
- ✅ Convert to WAV: `ffmpeg -i input.mp3 output.wav`
- ✅ Check file extension matches actual format
- ✅ Verify file is not corrupted

### "Failed to load audio file"
- ✅ Check file path is absolute
- ✅ Verify file permissions
- ✅ Ensure file exists and is readable

### "Audio analysis takes too long"
- ✅ Reduce FFT size (2048 → 1024)
- ✅ Increase hop size (512 → 1024)
- ✅ Use mono instead of stereo

### "Microphone not working" (Future)
- ⏳ Check system permissions
- ⏳ Test with `arecord -l` (Linux) or similar
- ⏳ Verify device ID is correct
- ⏳ Check for exclusive device access

---

## 📚 Related Documentation

- [Aurora Architecture](./AURORA_ARCHITECTURE.md)
- [Aurora Concept](./AURORA_CONCEPT.md)
- [Aurora Phase 2 Complete](./AURORA_PHASE2_COMPLETE.md)
- [Main README](../README.md)

---

**Last Updated**: November 6, 2025
