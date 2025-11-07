# Getting Started with Home Assistant MCP

This guide will help you get started with the Home Assistant MCP server.

## Overview

The Home Assistant MCP server enables AI assistants like Claude, GPT-4, and Cursor to seamlessly interact with Home Assistant. Control your lights, climate, automations, and more through natural language commands.

## Prerequisites

- **Bun** (v1.0.26+) - [Download here](https://bun.sh)
- **Home Assistant** instance running and accessible
- **Long-lived access token** from Home Assistant

## Quick Start

Get up and running in minutes:

```bash
# Clone and install
git clone https://github.com/jango-blockchained/advanced-homeassistant-mcp.git
cd advanced-homeassistant-mcp
bun install

# Configure environment
cp .env.example .env
# Edit .env with your Home Assistant details

# Start the server
bun run start:stdio
```

That's it! Your AI assistant can now control your smart home. 🤖✨

## Next Steps

- Review the [Quick Start Scenarios](QUICK_START_SCENARIOS.md) for usage examples
- Explore the [Complete Tools Reference](TOOLS_REFERENCE.md) for available commands
- Check out [Smart Features](SMART_FEATURES.md) for advanced functionality
- Read the [Configuration Guide](CONFIGURATION.md) for customization options

## Need Help?

- Check the [FAQ](FAQ.md) for common questions
- Review the [Troubleshooting Guide](TROUBLESHOOTING.md) for solutions
- See the [Installation Guide](INSTALLATION.md) for detailed setup instructions
