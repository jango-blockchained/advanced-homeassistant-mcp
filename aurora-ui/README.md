# Aurora UI - React Frontend

Modern, urban-techno themed React UI for Aurora sound-to-light engine.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icons
- **Zustand** - State management
- **Framer Motion** - Animations

## Design Features

- 🌑 **Dark Minimal Theme** - Black background with neon accents
- 🎨 **Neon Colors** - Cyan, purple, pink, green highlights
- 🔲 **Grid Pattern** - Cyberpunk aesthetic
- ⚡ **Scan Lines** - Retro CRT effect
- 🎯 **Huge Fonts** - Bold, impactful typography
- 🌈 **Glowing Effects** - Text and border glow animations
- 🎭 **Urban/Techno Vibe** - Extroverted, energetic design

## Development

```bash
# Install dependencies
cd aurora-ui
bun install

# Start dev server (port 3001)
bun run dev

# Build for production
bun run build
```

## Project Structure

```
aurora-ui/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn components
│   │   ├── Header.tsx
│   │   ├── AudioInput.tsx
│   │   ├── DeviceGrid.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── PlaybackControls.tsx
│   │   ├── TimelineLibrary.tsx
│   │   └── StatusBar.tsx
│   ├── lib/
│   │   ├── api.ts        # Aurora API client
│   │   ├── store.ts      # Zustand state management
│   │   └── utils.ts      # Helper functions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Features

### Audio Input
- Drag & drop audio files
- URL input
- YouTube integration (requires yt-dlp)
- Spotify integration (requires spotdl)
- Supported formats: WAV, MP3, FLAC, OGG, M4A

### Device Control
- Auto-discover Home Assistant lights
- Visual device grid with animations
- Area-based quick selection
- Real-time device status
- Multi-select with visual feedback

### Settings
- Intensity slider (0-100%)
- Color mapping modes (frequency/mood/custom)
- Beat synchronization toggle
- Smooth transitions toggle

### Playback
- Render timeline with progress tracking
- Play/pause/resume/stop controls
- Real-time playback progress
- Timeline visualization

### Timeline Library
- Save rendered timelines
- Play saved shows
- Delete unwanted timelines
- Timeline metadata display

## API Integration

The UI communicates with the Aurora backend via REST API:

- `GET /aurora/devices` - List devices
- `POST /aurora/analyze` - Analyze audio
- `POST /aurora/render` - Render timeline
- `POST /aurora/play` - Start playback
- `POST /aurora/pause` - Pause playback
- `POST /aurora/resume` - Resume playback
- `POST /aurora/stop` - Stop playback
- `GET /aurora/status` - Get playback status
- `GET /aurora/timelines` - List timelines
- `DELETE /aurora/timelines/:id` - Delete timeline

## Customization

### Colors

Edit `tailwind.config.js` to customize neon colors:

```js
neon: {
  blue: "#00f0ff",
  purple: "#b24bf3",
  pink: "#ff006e",
  green: "#39ff14",
}
```

### Theme

Edit `src/index.css` for dark theme tokens:

```css
:root {
  --background: 240 10% 3.9%;
  --primary: 186 100% 50%;
  /* ... */
}
```

## Building for Production

Build outputs to `../public/dist/` for serving by aurora-server:

```bash
bun run build
```

The aurora-server will serve the built React app from this directory.
