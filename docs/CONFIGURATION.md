# Configuration Guide

This guide explains how to configure the Home Assistant MCP server.

## Environment Variables

Create a `.env` file in the project root with the following variables:

### Required Settings

```bash
# Home Assistant Configuration
HA_URL=http://your-ha-instance:8123
HA_TOKEN=your-long-lived-access-token
```

### Optional Settings

```bash
# Server Configuration
PORT=3000                    # HTTP server port (default: 3000)
DEBUG=false                  # Enable debug logging (default: false)

# Security Settings
RATE_LIMIT_ENABLED=true      # Enable rate limiting (default: true)
RATE_LIMIT_MAX=100          # Max requests per window (default: 100)
RATE_LIMIT_WINDOW=60000     # Time window in ms (default: 60000)

# Transport Settings
TRANSPORT=stdio             # Options: stdio, http, websocket (default: stdio)
```

## Configuration File

For advanced configuration, you can use a configuration file (optional):

```json
{
  "homeAssistant": {
    "url": "http://your-ha-instance:8123",
    "token": "your-long-lived-access-token"
  },
  "server": {
    "port": 3000,
    "debug": false
  },
  "security": {
    "rateLimiting": {
      "enabled": true,
      "max": 100,
      "window": 60000
    }
  }
}
```

## Getting a Long-Lived Access Token

1. Log into your Home Assistant instance
2. Click on your profile (bottom left)
3. Scroll down to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Give it a descriptive name (e.g., "MCP Server")
6. Copy the token and add it to your `.env` file

## Next Steps

- Review the [Getting Started Guide](GETTING_STARTED.md) for quick setup
- See the [Security Guide](SECURITY.md) for security best practices
- Explore [Quick Start Scenarios](QUICK_START_SCENARIOS.md) for usage examples
