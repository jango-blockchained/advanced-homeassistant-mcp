# Audio URL Streaming and Chunked Analysis

## Overview

The Aurora system now supports downloading and analyzing audio from URLs with progressive, chunk-based FFT analysis. This enables:

- **Streaming large files** without loading entire file into memory
- **Progressive analysis** with real-time beat detection and feature extraction
- **Offset-based analysis** for analyzing portions of audio files
- **Automatic format detection** from URLs
- **500MB file size limit** for safety and performance

## Features

### 1. AudioDownloader Module (`src/aurora/audio/downloader.ts`)

Handles downloading audio from HTTP/HTTPS URLs with progress tracking:

```typescript
const downloader = new AudioDownloader();

// Download entire file with progress callback
const buffer = await downloader.downloadFromUrl(url, (progress) => {
  console.log(`Downloaded: ${progress.percentComplete}%`);
});

// Stream audio chunks for progressive processing
for await (const { chunk, progress } of downloader.streamFromUrl(url)) {
  console.log(`Chunk: ${chunk.length} bytes, Progress: ${progress.percentComplete}%`);
  // Process chunk...
}
```

**Key Features:**
- Automatic content-length detection
- Streaming with progress callbacks
- 500MB file size limit enforcement
- Proper error handling and user-agent headers

### 2. ChunkedAudioAnalyzer Module (`src/aurora/audio/chunked-analyzer.ts`)

Performs progressive FFT analysis on audio chunks with sliding window:

```typescript
const analyzer = new ChunkedAudioAnalyzer(2048, 512, 44100);

// Add chunks progressively
for (const chunk of audioChunks) {
  const result = analyzer.addChunk(chunk);
  console.log(`Beats detected: ${result.partialFeatures.beats?.length}`);
  console.log(`BPM: ${result.partialFeatures.bpm}`);
  console.log(`Progress: ${result.isComplete ? 'Complete' : 'Analyzing...'}`);
}

// Finalize and get complete features
const features = await analyzer.finalize();
```

**Features:**
- **Sliding window FFT** with 50% overlap
- **Hamming window** for spectral leakage reduction
- **Progressive beat detection** with adaptive threshold
- **Real-time mood and BPM** calculation
- **Frequency band analysis** (bass, mid, treble)
- **Time offset support** for analyzing file portions

### 3. Updated AudioCapture Module

Now automatically detects URLs and handles both files and URLs:

```typescript
const capture = new AudioCapture();

// Automatically handles both files and URLs
const audioBuffer = await capture.loadFromFile("https://example.com/song.mp3");
const audioBuffer2 = await capture.loadFromFile("/local/path/song.wav");
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│            AudioCapture.loadFromFile             │
│  (Detects URL vs local file path)               │
└──────┬──────────────────────────────┬────────────┘
       │                              │
       v                              v
┌─────────────────┐           ┌─────────────────┐
│ AudioDownloader │           │   fs.readFile   │
│  (URL streaming)│           │  (Local file)   │
└────────┬────────┘           └────────┬────────┘
         │                             │
         v                             v
    Chunk buffer              Format detection
         │                             │
         └──────────┬──────────────────┘
                    v
        ┌──────────────────────────┐
        │ Format Detector & Decoder│
        │  (WAV, MP3, OGG, FLAC)   │
        └────────┬─────────────────┘
                 v
        ┌──────────────────────────┐
        │   AudioAnalyzer OR       │
        │ ChunkedAudioAnalyzer     │
        │   (FFT Analysis)         │
        └────────┬─────────────────┘
                 v
         AudioFeatures Object
         (BPM, beats, mood, etc)
```

## Usage Examples

### Example 1: Direct URL Analysis

```typescript
const capture = new AudioCapture();
const audioBuffer = await capture.loadFromUrl("https://example.com/song.mp3");
const analyzer = new AudioAnalyzer();
const features = await analyzer.analyze(audioBuffer);

console.log(`BPM: ${features.bpm}`);
console.log(`Mood: ${features.mood}`);
console.log(`Beats: ${features.beats.length}`);
```

### Example 2: Progressive Streaming Analysis

```typescript
const downloader = new AudioDownloader();
const chunkedAnalyzer = new ChunkedAudioAnalyzer();

for await (const { chunk, progress } of downloader.streamFromUrl(url)) {
  const result = chunkedAnalyzer.addChunk(chunk);
  
  console.log(`Downloaded: ${progress.percentComplete}%`);
  console.log(`BPM: ${result.partialFeatures.bpm}`);
  
  if (result.isComplete) break;
}

const features = await chunkedAnalyzer.finalize();
```

### Example 3: Offset-Based Analysis

```typescript
const analyzer = new ChunkedAudioAnalyzer();

// Analyze starting at 30 seconds into the file
const result = analyzer.addChunk(audioChunk, 30.0);
```

## Performance Characteristics

| Operation | Time | Memory |
|-----------|------|--------|
| Download 10MB URL | ~1-2s | Streaming (256KB buffer) |
| FFT analysis (2048 samples) | ~1ms | ~100KB per window |
| Beat detection (30s audio) | ~100ms | ~500KB |
| Complete analysis (5MB file) | ~500ms | ~5MB + streaming overhead |

## Configuration

All modules use sensible defaults but can be customized:

```typescript
// Custom FFT size and hop size
const analyzer = new AudioAnalyzer(4096, 1024, 48000);

// Custom chunk size for streaming
for await (const chunk of downloader.streamFromUrl(url, 512 * 1024)) {
  // 512KB chunks
}

// Custom chunked analyzer parameters
const chunked = new ChunkedAudioAnalyzer(
  2048,  // FFT size
  512,   // Hop size (hop = fftSize / 4 for 75% overlap)
  44100  // Sample rate
);
```

## Error Handling

All modules include comprehensive error handling:

```typescript
try {
  const buffer = await downloader.downloadFromUrl(url);
} catch (error) {
  if (error.message.includes('Audio file too large')) {
    console.error('File exceeds 500MB limit');
  } else if (error.message.includes('HTTP')) {
    console.error('Download failed - HTTP error');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Supported Formats

- **WAV** (PCM, 8/16-bit)
- **MP3** (with FFmpeg fallback)
- **OGG Vorbis** (with Vorbis decoder)
- **FLAC** (with FLAC decoder)

## Limitations & Future Improvements

- Max file size: 500MB (configurable)
- Streaming analysis requires re-buffering for windowing
- Beat detection uses simplified onset detection (can be enhanced)
- No streaming encoding/transcoding (pre-encoded files only)

## Future Enhancements

- [ ] Support for HLS/DASH streaming
- [ ] Automatic transcoding for unsupported formats
- [ ] More sophisticated beat detection (onset detection, tempogram)
- [ ] Real-time spectrum visualization during streaming
- [ ] Cache downloaded files temporarily for reprocessing
