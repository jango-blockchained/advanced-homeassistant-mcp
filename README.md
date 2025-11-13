# 🏠 Home Assistant MCP

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@jango-blockchained/homeassistant-mcp.svg)](https://www.npmjs.com/package/@jango-blockchained/homeassistant-mcp)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-blue.svg)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/pkgs/container/advanced-homeassistant-mcp)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0.26-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.0.0-blue.svg)](https://www.typescriptlang.org)
[![smithery badge](https://smithery.ai/badge/@jango-blockchained/homeassitant-mcp)](https://smithery.ai/server/@jango-blockchained/homeassitant-mcp)

> **Bridge the gap between AI assistants and your smart home** 🚀

A powerful, secure, and extensible Model Context Protocol (MCP) server that enables AI assistants like Claude, GPT, and Cursor to seamlessly interact with Home Assistant. Control your lights, climate, automations, and more through natural language commands.

---

## ✨ Feature Overview

### 🤖 AI-Powered Smart Home Control

- **Natural Language Processing**: Turn "dim the living room lights to 50%" into actual device commands
- **Multi-Assistant Support**: Works with Claude, GPT-4, Cursor, and other MCP-compatible assistants
- **Intelligent Context**: Remembers device states, relationships, and user preferences
- **Smithery Integration**: One-click installation and deployment via [Smithery.ai](https://smithery.ai)

### 🛡️ Enterprise-Grade Security

- **Rate Limiting**: Protects against abuse with configurable request limits
- **Input Sanitization**: Prevents XSS and injection attacks
- **JWT Authentication**: Secure token-based access control
- **Security Headers**: Comprehensive protection against web vulnerabilities

### ⚡ High-Performance Architecture

- **Bun Runtime**: 4x faster than Node.js with built-in TypeScript support
- **Streaming Responses**: Real-time updates for long-running operations
- **Modular Design**: Clean separation of concerns with extensible plugin system
- **Multiple Transports**: HTTP REST API, WebSocket, and Standard I/O support

### 🏠 Comprehensive Device Control

- **Lighting Control**: Brightness, color temperature, RGB colors, and effects
- **Climate Management**: Thermostats, HVAC modes, fan control, and scheduling
- **Automation & Scenes**: Trigger automations, activate scenes, and manage routines
- **Device Discovery**: Intelligent device listing with filtering and search
- **Notification System**: Send alerts through Home Assistant's notification channels
- **Smart Maintenance**: Find orphaned devices, analyze usage patterns, energy monitoring
- **Intelligent Scenarios**: Auto-detect and manage nobody-home, window/heating conflicts, energy waste

---

## 🚀 Quick Start

Get up and running in minutes:

```bash
# Clone and install
git clone https://github.com/jango-blockchained/homeassistant-mcp.git
cd homeassistant-mcp
bun install

# Configure environment
cp .env.example .env
# Edit .env with your Home Assistant details

# Start the server
bun run start:stdio
```

That's it! Your AI assistant can now control your smart home. 🤖✨

---

## 📦 Installation

### Prerequisites

- 🚀 [Bun](https://bun.sh) (v1.0.26+) - *Recommended*
- 🏠 [Home Assistant](https://www.home-assistant.io/) instance

### Option 1: Smithery.ai (Recommended for Quick Setup)

[Smithery](https://smithery.ai) is a registry for MCP servers that makes installation incredibly easy:

```bash
# Install to Claude Desktop
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude

# Install to Cursor
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client cursor

# Install to VS Code
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client vscode
```

You'll be prompted to configure:
- Home Assistant URL
- Long-lived access token
- Optional settings (port, debug mode)

See [SMITHERY_DEPLOYMENT.md](docs/SMITHERY_DEPLOYMENT.md) for detailed deployment guide.

### Option 2: NPX (Quick Start)

```bash
npx @jango-blockchained/homeassistant-mcp@latest
```

### Option 3: Bunx with GitHub (No NPM Login Required)

If you can't login to npm, use Bunx to run directly from GitHub:

```bash
# Install Bun first if you don't have it
curl -fsSL https://bun.sh/install | bash

# Then run from GitHub
bunx github:jango-blockchained/homeassistant-mcp
```

Alternatively, install directly from Git:

```bash
bun add git+https://github.com/jango-blockchained/homeassistant-mcp.git
homeassistant-mcp
```

### Option 4: Docker (Containerized)

Run the MCP server in a Docker container:

```bash
# Pull the latest image
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest

# Run with environment variables
docker run -d \
  -e HOME_ASSISTANT_URL=http://your-ha-instance:8123 \
  -e HOME_ASSISTANT_TOKEN=your_long_lived_access_token \
  -p 4000:4000 \
  --name homeassistant-mcp \
  ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest

# Or use docker-compose (see docker/ directory for examples)
```

**Available Docker tags:**
- `latest` - Latest stable release
- `1.0.x` - Specific version
- `dev` - Latest development build from main branch

### Option 5: Local Installation

```bash
# Install globally
bun add -g @jango-blockchained/homeassistant-mcp

# Or locally
bun add homeassistant-mcp

# Run
homeassistant-mcp
```

### Option 6: From Source (Most Flexible)

```bash
git clone https://github.com/jango-blockchained/homeassistant-mcp.git
cd homeassistant-mcp
bun install
bun run build
bun run start:stdio
```

---

## 🛠️ Usage

### AI Assistant Integration

#### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "bunx",
      "args": ["github:jango-blockchained/homeassistant-mcp"]
    }
  }
}
```

Or use npx:

```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "npx",
      "args": ["@jango-blockchained/homeassistant-mcp@latest"]
    }
  }
}
```

#### VS Code + Claude Extension

The `.vscode/settings.json` is pre-configured for immediate use.

#### Cursor

Add to `.cursor/config/config.json`:

```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "bunx",
      "args": ["github:jango-blockchained/homeassistant-mcp"]
    }
  }
}
```

Or with npx:

```json

{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "npx",
      "args": ["@jango-blockchained/homeassistant-mcp@latest"]
    }
  }
}
```

### API Usage

Start the HTTP server:

```bash
bun run start -- --http
```

Available endpoints:

- `POST /api/tools/call` - Execute tools
- `GET /api/resources/list` - List resources
- `GET /api/health` - Health check
- `WebSocket /api/ws` - Real-time updates

### Configuration

Create a `.env` file:

```env
# Home Assistant
HASS_HOST=http://your-ha-instance:8123
HASS_TOKEN=your_long_lived_access_token

# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-secret-key
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=50
```

---

## 🏗️ Architecture

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant  │◄──►│   MCP Server    │◄──►│ Home Assistant  │
│  (Claude/GPT)   │    │                 │    │                 │
└─────────────────┘    │ ┌─────────────┐ │    └─────────────────┘
                       │ │  Transport  │ │
                       │ │   Layer     │ │
                       │ └─────────────┘ │
                       │ ┌─────────────┐ │
                       │ │ Middleware  │ │
                       │ │   Layer     │ │
                       │ └─────────────┘ │
                       │ ┌─────────────┐ │
                       │ │   Tools     │ │
                       │ │   Layer     │ │
                       └─────────────────┘
```

### Core Components

- **Transport Layer**: HTTP, WebSocket, Stdio
- **Middleware Layer**: Security, validation, logging
- **Tools Layer**: Device control, automation, notifications
- **Resource Manager**: State management and caching

### Built-in Tools (34 Total)

#### 🎨 Aurora Sound-to-Light (10 tools) ✨ NEW!
- 🎵 **Audio Analysis**: Extract BPM, beats, mood, frequency data
- 🔍 **Device Scanning**: Find Aurora-compatible lights
- 📊 **Device Profiling**: Measure latency & capabilities for sync
- 🎬 **Timeline Rendering**: Generate pre-rendered light shows
- ▶️ **Playback Control**: Play/pause/stop/seek timelines
- 📋 **Timeline Management**: List, export, import timelines
- 📈 **Status Monitoring**: System status and statistics
- 🎯 **Smart Synchronization**: Device-specific timing compensation
- 🌈 **Capability-Aware**: RGB, tunable white, brightness-only support
- 🎶 **Beat Detection**: Lights pulse in sync with music

> 🎨 **Aurora** is a complete sound-to-light synchronization system that transforms your Home Assistant lights into a professional light show synchronized to music!

#### 🏠 Device Control (13 tools)
- 🔦 **Lights Control**: Brightness, color temp, RGB, effects
- 🌡️ **Climate Control**: HVAC modes, temperature, fan control
- 📺 **Media Players**: Playback, volume, sources, sound modes
- 🪟 **Covers**: Blinds, curtains, garage doors, position control
- 🔒 **Locks**: Lock/unlock with code support
- 💨 **Fans**: Speed, oscillation, direction, presets
- 🤖 **Vacuums**: Cleaning, docking, spot clean, fan speed
- 🚨 **Alarm Control**: Arm/disarm modes, security management
- 🎛️ **Generic Control**: Universal device control interface

#### ⚙️ Automation & Scenes (3 tools)
- 🎬 **Scenes**: Activate predefined scenes
- ⚙️ **Automations**: List, toggle, trigger automations
- 🔧 **Automation Config**: Create/update/delete complex automations

#### 🔧 System Management (6 tools)
- 📋 **Device Discovery**: List and filter devices by domain/area
- 📱 **Notifications**: Multi-channel alert system
- 📊 **History**: Query historical state data
- 📦 **Add-on Management**: Install, configure, control add-ons
- 📦 **Package Management**: HACS integration and custom components
- 🔔 **Event Subscription**: Real-time SSE event streaming

#### 🧠 Smart Features (2 tools)
- 🔧 **Maintenance Tool**: Spook-like maintenance features
  - Find orphaned/unavailable devices
  - Analyze light usage patterns by room
  - Monitor energy consumption
  - Device health checks with battery warnings
  - Entity cleanup recommendations
  
- 🧠 **Smart Scenarios**: Intelligent automation detection
  - Nobody home: Auto turn off lights, reduce climate
  - Window/heating conflicts: Auto disable heating
  - Energy saving: Detect daytime lights, standby power
  - Generate automation configs

> 📖 **See [Complete Tools Reference](docs/TOOLS_REFERENCE.md) for detailed documentation**

### MCP Features

- 📝 **Prompts**: Pre-defined prompt templates for common home automation tasks
  - Morning/evening routines
  - Energy saving suggestions
  - Security setup
  - Climate optimization
  - Media control
  - Troubleshooting helpers
  
- 📊 **Resources**: Direct access to Home Assistant states and configurations
  - Device lists by type (lights, climate, sensors, etc.)
  - Area/room configurations
  - Automation and scene listings
  - Dashboard summaries with current home status

- 🛠️ **24 Comprehensive Tools**: Full device control and smart automation
  - See [Complete Tools Reference](docs/TOOLS_REFERENCE.md) for all available tools
  - Device control, automation, system management, and smart features
  - Natural language to Home Assistant API translation

---

## 🎯 Example Commands

Once integrated, your AI assistant can understand commands like:

**Device Control:**
> "Turn off all lights in the bedroom"  
> "Set the thermostat to 72°F"  
> "Play music on the living room speaker"  
> "Open the garage door"  
> "Lock all doors"  
> "Start the robot vacuum"  
> "Set the bedroom fan to 50%"  

**Automation & Scenes:**
> "Activate the movie scene"  
> "Trigger the morning routine automation"  
> "Show me all my automations"  

**Information & Monitoring:**
> "What's the current temperature in the living room?"  
> "Show me all unavailable devices"  
> "Which lights are currently on?"  

**Notifications:**
> "Notify everyone that dinner is ready"  
> "Send an alert to my phone"  

**Smart Maintenance:**
> "Check my Home Assistant health"  
> "Find orphaned or unavailable devices"  
> "Analyze my light usage patterns"  
> "Show me my energy consumption"  
> "Which devices have low battery?"  

**Aurora Sound-to-Light:** ✨ NEW!
> "Analyze this music file and sync my lights"  
> "Scan for lights that can do Aurora effects"  
> "Profile my living room lights for synchronization"  
> "Create a light show for this song"  
> "Play the timeline I just created"  
> "Pause the light show"  
> "Show me Aurora status"  

**Smart Scenarios:**
> "I'm leaving home, activate away mode"  
> "Are any windows open with heating on?"  
> "Check for energy-wasting issues"  
> "Turn off everything, I'm going on vacation"  
> "What can I do to save energy?"  

You can also use prompts for guided assistance:
> "Help me set up a morning routine"  
> "Show me energy saving tips"  
> "How do I control my media players?"

---

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

1. 🍴 Fork the repository
2. 🌿 Create a feature branch
3. 💻 Make your changes
4. 🧪 Add tests if applicable
5. 📝 Update documentation
6. 🔄 Submit a pull request

### Development Setup

```bash
bun install
bun run build
bun test
```

### Code Style

- TypeScript with strict mode
- ESLint for code quality
- Prettier for formatting
- Husky for pre-commit hooks

### Releases

This project uses **automated releases** to GitHub, npm, and Docker. See [AUTOMATED_RELEASES.md](docs/AUTOMATED_RELEASES.md) for details.

**Quick Release:**
1. Go to **Actions** → **Version Bump and Release**
2. Click **Run workflow**
3. Select version bump type (patch/minor/major)
4. The system automatically:
   - 📦 Creates a GitHub release
   - 📤 Publishes to npm
   - 🐳 Builds and pushes Docker image

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with ❤️ using:

- [Bun](https://bun.sh) - The fast JavaScript runtime
- [Home Assistant](https://www.home-assistant.io/) - The open-source home automation platform
- [Model Context Protocol](https://modelcontextprotocol.io/) - The AI integration standard

---

Transform your smart home into an AI-powered experience
