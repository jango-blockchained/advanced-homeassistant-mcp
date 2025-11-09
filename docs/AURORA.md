# Aurora Animation System

Aurora is a powerful animation and visualization system for the Home Assistant MCP server. It provides endless animation support, microphone/screen input processing, and a beautiful web-based interface for creating and controlling animations.

## Features

### 🎨 Animation Modes
- **Once**: Play animation a single time
- **Repeat**: Play animation a specified number of times
- **Endless**: Play animation continuously (loop forever)

### 🎤 Input Sources
- **Microphone**: Real-time audio input for reactive visualizations
- **Screen**: Screen capture for screen-based animations
- **Camera**: Camera input for video-based animations
- **None**: No input (pure animation)

### 📊 Buffer Modes
- **Live**: Real-time processing with minimal latency
- **Buffered**: Smoother playback with buffering

### 🎯 Session Management
- Create, start, stop, pause, and resume animation sessions
- Track multiple concurrent sessions
- Get real-time session state and statistics

## MCP Tools

Aurora provides 9 comprehensive MCP tools:

1. **aurora_get_instructions**: Get usage instructions and guidelines (MUST be called first)
2. **aurora_create_session**: Create a new animation session
3. **aurora_start_session**: Start a session that was created with autoStart=false
4. **aurora_stop_session**: Stop an active session and free resources
5. **aurora_pause_session**: Pause a session (maintains state)
6. **aurora_resume_session**: Resume a paused session
7. **aurora_get_session_state**: Get current state of a session
8. **aurora_list_sessions**: List all active sessions
9. **aurora_stop_all_sessions**: Stop all active sessions

## Usage Examples

### Getting Instructions (Required First Step)

```typescript
// Always call this first to understand Aurora's capabilities and guidelines
const instructions = await callTool('aurora_get_instructions', {});
```

### Creating a Simple Endless Animation

```typescript
const result = await callTool('aurora_create_session', {
    sessionId: 'my-animation',
    animation: {
        name: 'pulse',
        duration: 2000,
        mode: 'endless',
        easing: 'ease-in-out',
        autoStart: true
    }
});
```

### Creating a Repeated Animation

```typescript
const result = await callTool('aurora_create_session', {
    sessionId: 'fade-animation',
    animation: {
        name: 'fade',
        duration: 1000,
        mode: 'repeat',
        repeatCount: 5,
        easing: 'ease-out'
    }
});
```

### Creating a Microphone-Reactive Animation

```typescript
const result = await callTool('aurora_create_session', {
    sessionId: 'audio-visualizer',
    animation: {
        name: 'visualizer',
        duration: 100,
        mode: 'endless',
        autoStart: true
    },
    input: {
        source: 'microphone',
        bufferMode: 'live',
        sampleRate: 44100
    }
});
```

### Controlling Sessions

```typescript
// Start a session
await callTool('aurora_start_session', { sessionId: 'my-animation' });

// Pause a session
await callTool('aurora_pause_session', { sessionId: 'my-animation' });

// Resume a session
await callTool('aurora_resume_session', { sessionId: 'my-animation' });

// Stop a session
await callTool('aurora_stop_session', { sessionId: 'my-animation' });

// Get session state
const state = await callTool('aurora_get_session_state', { sessionId: 'my-animation' });

// List all sessions
const sessions = await callTool('aurora_list_sessions', {});

// Stop all sessions
await callTool('aurora_stop_all_sessions', {});
```

## Web Interface

Aurora includes a beautiful web-based interface for creating and controlling animations visually.

### Accessing the Web Interface

Navigate to: `http://localhost:3000/aurora`

### Features
- Interactive animation canvas with real-time visualization
- Form-based session creation
- Session control buttons (start, stop, pause, resume)
- Real-time session list with live updates
- Instructions viewer
- Visual toggles (stats, waveform, particles)

## API Endpoints

Aurora exposes REST API endpoints for programmatic control:

- `GET /api/aurora` - Get system information
- `POST /api/aurora/instructions` - Get instructions
- `POST /api/aurora/create` - Create session
- `POST /api/aurora/start` - Start session
- `POST /api/aurora/stop` - Stop session
- `POST /api/aurora/pause` - Pause session
- `POST /api/aurora/resume` - Resume session
- `POST /api/aurora/state` - Get session state
- `POST /api/aurora/list` - List sessions
- `POST /api/aurora/stopAll` - Stop all sessions

## Configuration Options

### Animation Configuration

```typescript
interface AnimationConfig {
    name: string;              // Name of the animation
    duration: number;          // Duration in milliseconds
    mode: 'once' | 'repeat' | 'endless';
    repeatCount?: number;      // Required if mode is 'repeat'
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    autoStart?: boolean;       // Start immediately (default: false)
}
```

### Input Configuration

```typescript
interface InputConfig {
    source: 'microphone' | 'screen' | 'camera' | 'none';
    bufferMode: 'live' | 'buffered';
    bufferSize?: number;       // Buffer size in ms (for buffered mode)
    sampleRate?: number;       // Sample rate for audio input
    frameRate?: number;        // Frame rate for screen capture
}
```

## Best Practices

1. **Always call `aurora_get_instructions` first** to understand usage guidelines
2. **Use 'endless' mode sparingly** - prefer 'repeat' with a reasonable count for better resource management
3. **Test with 'once' mode first** before enabling 'endless' or high repeat counts
4. **Monitor resources** when using input sources with high buffer rates
5. **Stop sessions when done** to free resources (especially important for endless animations)
6. **Inform users about privacy** when accessing microphone or screen

## Security & Privacy

- **Microphone input** requires user permission and secure context (HTTPS in production)
- **Screen capture** requires appropriate browser permissions
- **Privacy indicators** should be shown when input sources are active
- **User awareness** is essential for endless animations and input sources

## Architecture

Aurora is built with a modular architecture:

- **Engine** (`engine.ts`): Core animation loop and frame generation
- **Manager** (`manager.ts`): Session lifecycle management
- **Instructions** (`instructions.ts`): Guidelines and validation
- **Tools** (`tool.ts`): MCP tool definitions
- **Routes** (`aurora.routes.ts`): REST API endpoints
- **Frontend** (`public/aurora/`): Web interface

## Troubleshooting

### Animation not starting
- Check that the session was created successfully
- Verify `autoStart` is set to `true` or call `aurora_start_session`
- Check browser console for errors

### Input not working
- Ensure browser permissions are granted
- Check that the input source is supported by your browser
- Verify secure context (HTTPS) for microphone access

### Performance issues
- Reduce animation duration for smoother playback
- Use 'buffered' mode instead of 'live' for input processing
- Limit the number of concurrent sessions

## License

MIT License - Same as the parent Home Assistant MCP project
