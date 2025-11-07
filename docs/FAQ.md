# Frequently Asked Questions

Common questions and answers about the Home Assistant MCP server.

## General Questions

### What is the Home Assistant MCP server?

The Home Assistant MCP server is a Model Context Protocol (MCP) server that enables AI assistants like Claude, GPT-4, and Cursor to interact with Home Assistant. It allows natural language control of your smart home devices.

### Which AI assistants are supported?

The server works with any MCP-compatible assistant, including:
- Claude Desktop
- Cursor IDE
- VS Code with Claude extension
- GPT-4 with MCP support
- Other MCP-compatible clients

### Do I need coding experience?

No! The server is designed to work with natural language. Just install it and start talking to your AI assistant about your smart home.

## Installation & Setup

### What are the system requirements?

- Bun runtime (v1.0.26 or higher)
- A running Home Assistant instance
- Long-lived access token from Home Assistant
- Network access between the server and Home Assistant

### How do I get a long-lived access token?

1. Log into Home Assistant
2. Click on your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Name it and copy the token

### Can I run this in Docker?

Yes! Docker images are available at `ghcr.io/jango-blockchained/advanced-homeassistant-mcp`. See the [Installation Guide](INSTALLATION.md) for details.

## Usage Questions

### What can I control with natural language?

You can control:
- Lights (on/off, brightness, color)
- Climate (temperature, mode)
- Media players
- Covers (blinds, garage doors)
- Locks
- Fans
- Vacuums
- Automations and scenes
- And much more!

See the [Tools Reference](TOOLS_REFERENCE.md) for a complete list.

### Can I create automations?

Yes! You can list, trigger, enable/disable automations, and even create new ones. See the [Smart Features](SMART_FEATURES.md) guide for examples.

### Does it work with my existing Home Assistant setup?

Yes! The server works with any standard Home Assistant installation. It uses the official Home Assistant API.

## Security Questions

### Is it secure?

Yes! The server includes:
- Rate limiting to prevent abuse
- Input sanitization to prevent injection attacks
- Secure token-based authentication
- Optional HTTPS support

See the [Security Guide](SECURITY.md) for more details.

### Should I use HTTPS?

If your Home Assistant instance uses HTTPS, you should configure the MCP server to use HTTPS as well. This ensures encrypted communication.

### Can I restrict what the AI can control?

The server respects Home Assistant's permissions. If your access token doesn't have permission to control certain devices, the AI won't be able to either.

## Troubleshooting

### The server won't connect to Home Assistant

Check:
1. Home Assistant URL is correct and accessible
2. Long-lived access token is valid
3. Firewall allows connections
4. Home Assistant is running

See the [Troubleshooting Guide](TROUBLESHOOTING.md) for more help.

### My AI assistant can't see the server

Ensure:
1. The server is running in stdio mode
2. The MCP client configuration is correct
3. You've restarted the AI assistant application

### Performance is slow

Try:
1. Checking network latency to Home Assistant
2. Reducing concurrent requests
3. Enabling debug mode to identify bottlenecks

## Getting Help

Still have questions?

- Check the [Getting Started Guide](GETTING_STARTED.md)
- Review the [Troubleshooting Guide](TROUBLESHOOTING.md)
- Open an issue on [GitHub](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues)
