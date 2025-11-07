# 🎯 Getting Started with Home Assistant MCP

Welcome to Home Assistant MCP! This guide will help you get up and running with AI-powered smart home control in just a few minutes.

## 📋 Table of Contents

- [What is Home Assistant MCP?](#what-is-home-assistant-mcp)
- [Prerequisites](#prerequisites)
- [Quick Installation](#quick-installation)
- [First Steps](#first-steps)
- [Basic Usage](#basic-usage)
- [Next Steps](#next-steps)

---

## What is Home Assistant MCP?

Home Assistant MCP (Model Context Protocol) server enables AI assistants like Claude, GPT-4, and Cursor to control your smart home through natural language. Simply tell your AI assistant what you want, and it will:

- ✅ Turn lights on/off and adjust brightness
- ✅ Control thermostats and climate devices
- ✅ Manage media players and entertainment
- ✅ Trigger automations and scenes
- ✅ Monitor your home's status
- ✅ Analyze energy usage and optimize efficiency

**Example conversation:**
```
You: "Turn on the living room lights and set them to 50% brightness"
AI: *Executes command through Home Assistant MCP*
AI: "Done! The living room lights are now on at 50% brightness."
```

---

## Prerequisites

Before you begin, make sure you have:

### 1. 🏠 Home Assistant Instance

You need a running Home Assistant instance:
- **Home Assistant OS**: Install from [home-assistant.io](https://www.home-assistant.io/installation/)
- **Home Assistant Container**: Docker-based installation
- **Home Assistant Core**: Python-based installation
- **Home Assistant Supervised**: For advanced users

**Minimum Version**: Home Assistant 2023.1 or newer

### 2. 🔑 Long-Lived Access Token

Create a token for secure API access:

1. Open Home Assistant
2. Click your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Give it a name (e.g., "MCP Server")
6. Copy and save the token securely

> **⚠️ Important**: Keep your token secure! It provides full access to your Home Assistant instance.

### 3. 🚀 Runtime Environment

Choose one of the following:

- **Option A**: [Bun](https://bun.sh) v1.0.26+ (Recommended - fastest)
- **Option B**: [Node.js](https://nodejs.org/) v18.0.0+
- **Option C**: [Docker](https://www.docker.com/)

**Why Bun?** It's 4x faster than Node.js and has built-in TypeScript support.

### 4. 🤖 AI Assistant (MCP Client)

Install one of these AI assistants:
- **Claude Desktop**: [Download here](https://claude.ai/download)
- **Cursor**: [Download here](https://cursor.sh/)
- **VS Code + Claude Extension**: Available in VS Code marketplace

---

## Quick Installation

### Method 1: Smithery (Easiest - Recommended for Beginners)

[Smithery](https://smithery.ai) provides one-click installation:

```bash
# For Claude Desktop
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude

# For Cursor
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client cursor

# For VS Code
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client vscode
```

**What happens:**
1. You'll be prompted for your Home Assistant URL (e.g., `http://192.168.1.100:8123`)
2. Paste your long-lived access token
3. Configure optional settings
4. Installation completes automatically

**Restart your AI assistant** and you're ready to go!

### Method 2: NPX (Quick Start)

Run directly without installation:

```bash
npx @jango-blockchained/homeassistant-mcp@latest
```

**First-time setup:**
1. Create a `.env` file in your project directory
2. Add your credentials:
   ```env
   HOME_ASSISTANT_URL=http://192.168.1.100:8123
   HOME_ASSISTANT_TOKEN=your_long_lived_token_here
   ```

### Method 3: Docker (Containerized)

For isolated, containerized deployment:

```bash
# Pull the image
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest

# Run the container
docker run -d \
  --name homeassistant-mcp \
  -e HOME_ASSISTANT_URL=http://192.168.1.100:8123 \
  -e HOME_ASSISTANT_TOKEN=your_token_here \
  -p 4000:4000 \
  ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
```

### Method 4: From Source (For Developers)

Clone and build from source:

```bash
# Clone the repository
git clone https://github.com/jango-blockchained/advanced-homeassistant-mcp.git
cd advanced-homeassistant-mcp

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build the project
bun run build:all

# Start the server
bun run start:stdio
```

---

## First Steps

### 1. Verify Installation

After installation, verify the MCP server is available:

**For Claude Desktop:**
1. Open Claude Desktop
2. Look for the 🔌 icon (bottom right)
3. You should see "homeassistant-mcp" listed

**For Cursor:**
1. Open Cursor
2. Press `Cmd/Ctrl + Shift + P`
3. Type "MCP" and check available servers

**For VS Code:**
1. Open VS Code
2. Check the MCP extension status bar

### 2. Test Basic Commands

Try these simple commands with your AI assistant:

**List your devices:**
```
"Show me all my smart home devices"
```

**Control a light:**
```
"Turn on the bedroom light"
"Set the living room lights to 30%"
```

**Check status:**
```
"What's the temperature in the living room?"
"Which lights are currently on?"
```

### 3. Explore Capabilities

Ask your AI assistant:
```
"What can you do with my smart home?"
"Show me examples of home automation commands"
"Help me understand the available features"
```

---

## Basic Usage

### Controlling Lights

```
💬 "Turn off all bedroom lights"
💬 "Set the kitchen lights to warm white at 70% brightness"
💬 "Make the living room lights blue"
💬 "Dim all lights to 20%"
```

### Managing Climate

```
💬 "Set the thermostat to 72°F"
💬 "Turn on heating in the bedroom"
💬 "What's the current temperature in the living room?"
💬 "Set all thermostats to eco mode"
```

### Media Control

```
💬 "Play music on the living room speaker"
💬 "Pause all media players"
💬 "Set the TV volume to 50%"
💬 "Switch to HDMI 2 on the bedroom TV"
```

### Automation & Scenes

```
💬 "Activate the movie night scene"
💬 "Trigger my morning routine"
💬 "Show me all my automations"
💬 "Create a bedtime scene"
```

### Smart Features

```
💬 "Check my home's health status"
💬 "Find devices that are offline"
💬 "Show me my energy usage"
💬 "Are there any issues I should know about?"
```

---

## Understanding Responses

### Success Response Example

```
✅ Successfully turned on light.living_room
   Brightness: 128 (50%)
   Color temperature: 370 (warm white)
   State: on
```

### Error Response Example

```
❌ Error: Entity light.nonexistent not found
   Suggestion: Run "list all lights" to see available lights
```

### Information Response Example

```
📊 Living Room Status:
   • Temperature: 72°F
   • Humidity: 45%
   • Lights: 2 on, 3 off
   • Media: Currently playing
```

---

## Common Patterns

### Morning Routine

```
💬 "Good morning! Can you:
   - Turn on the bedroom lights to 50%
   - Set the thermostat to 72°F
   - Start my morning playlist
   - Open the living room blinds"
```

### Leaving Home

```
💬 "I'm leaving home. Please:
   - Turn off all lights
   - Set thermostats to eco mode
   - Lock all doors
   - Activate the security alarm"
```

### Energy Saving

```
💬 "Help me save energy:
   - Find lights that are on but not needed
   - Check for heating conflicts with open windows
   - Show devices consuming the most power
   - Suggest optimizations"
```

---

## Troubleshooting Quick Tips

### Issue: AI assistant can't see the MCP server

**Solution:**
1. Restart your AI assistant (Claude, Cursor, etc.)
2. Check that the server is running
3. Verify the configuration file is correct

### Issue: Commands fail with "unauthorized" error

**Solution:**
1. Verify your Home Assistant token is valid
2. Check that the token hasn't expired
3. Ensure the token has proper permissions

### Issue: Devices not found

**Solution:**
1. Verify devices are available in Home Assistant
2. Check device entity IDs: `"List all my lights"`
3. Ensure Home Assistant is accessible from the MCP server

### Issue: Slow responses

**Solution:**
1. Check your network connection to Home Assistant
2. Verify Home Assistant is responsive
3. Consider running the MCP server closer to Home Assistant

For more detailed troubleshooting, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

---

## Next Steps

Now that you're up and running, explore these resources:

### 📚 For Users

1. **[Quick Start Scenarios](QUICK_START_SCENARIOS.md)** - Real-world usage examples
2. **[Tools Reference](TOOLS_REFERENCE.md)** - Complete list of available commands
3. **[Smart Features](SMART_FEATURES.md)** - Advanced maintenance and automation
4. **[Configuration Guide](CONFIGURATION.md)** - Fine-tune your setup

### 🔧 For Developers

1. **[Architecture Guide](ARCHITECTURE.md)** - System design and internals
2. **[API Reference](API_REFERENCE.md)** - Programmatic access
3. **[Development Guide](DEVELOPMENT.md)** - Contributing and extending
4. **[Testing Guide](TESTING.md)** - Testing your changes

### 🎓 Advanced Topics

1. **[Docker Deployment](DOCKER_GUIDE.md)** - Production deployment
2. **[Security Best Practices](SECURITY.md)** - Securing your setup
3. **[Performance Tuning](PERFORMANCE.md)** - Optimization tips
4. **[FAQ](FAQ.md)** - Frequently asked questions

---

## Need Help?

- 💬 [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions) - Ask questions
- 🐛 [Issue Tracker](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues) - Report bugs
- 📖 [Documentation](index.md) - Browse all docs
- 🏠 [Home Assistant Community](https://community.home-assistant.io/) - General HA help

---

**Ready to transform your smart home?** Start experimenting with commands and see what your AI assistant can do! 🚀
