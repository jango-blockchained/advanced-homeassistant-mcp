# Installation Guide

This guide covers all installation methods for the Home Assistant MCP server.

## Prerequisites

- **Bun** (v1.0.26+) - [Download here](https://bun.sh)
- **Home Assistant** instance running and accessible
- **Long-lived access token** from Home Assistant

## Installation Options

### Option 1: Smithery.ai (Recommended)

[Smithery](https://smithery.ai) is a registry for MCP servers that makes installation incredibly easy:

```bash
# Install to Claude Desktop
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude

# Install to Cursor
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client cursor

# Install to VS Code
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client vscode
```

See [Smithery Deployment Guide](SMITHERY_DEPLOYMENT.md) for more details.

### Option 2: NPX (Quick)

```bash
npx @jango-blockchained/homeassistant-mcp
```

### Option 3: Local Installation

```bash
# Clone the repository
git clone https://github.com/jango-blockchained/advanced-homeassistant-mcp.git
cd advanced-homeassistant-mcp

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your Home Assistant details

# Start the server
bun run start:stdio
```

### Option 4: Docker

```bash
# Pull the image
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest

# Run the container
docker run -d \
  --name homeassistant-mcp \
  -e HA_URL=http://your-ha-instance:8123 \
  -e HA_TOKEN=your-token-here \
  -p 3000:3000 \
  ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
```

## Next Steps

After installation:

1. Review the [Configuration Guide](CONFIGURATION.md) to customize settings
2. Check the [Getting Started Guide](GETTING_STARTED.md) for quick setup
3. Explore [Quick Start Scenarios](QUICK_START_SCENARIOS.md) for usage examples
