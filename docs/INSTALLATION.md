# 📥 Installation Guide

Complete installation guide for Home Assistant MCP server covering all installation methods and platforms.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [AI Assistant Configuration](#ai-assistant-configuration)
- [Platform-Specific Guides](#platform-specific-guides)
- [Verification](#verification)
- [Upgrading](#upgrading)

---

## Prerequisites

### System Requirements

**Minimum:**
- 512 MB RAM
- 100 MB disk space
- Network access to Home Assistant instance

**Recommended:**
- 1 GB RAM
- 500 MB disk space (for logs and cache)
- Low-latency network to Home Assistant

### Required Software

1. **Home Assistant**
   - Version: 2023.1 or newer
   - Must be accessible via HTTP/HTTPS
   - Long-lived access token configured

2. **Runtime** (choose one):
   - [Bun](https://bun.sh) v1.0.26+ (Recommended)
   - [Node.js](https://nodejs.org/) v18.0.0+
   - [Docker](https://www.docker.com/) v20.10+

3. **AI Assistant** (choose one):
   - Claude Desktop
   - Cursor IDE
   - VS Code with MCP extension

### Home Assistant Token

Create a long-lived access token:

1. Open Home Assistant web interface
2. Click your profile (bottom left corner)
3. Scroll to **Long-Lived Access Tokens**
4. Click **Create Token**
5. Name: `MCP Server` (or your preference)
6. Click **OK** and copy the token immediately

> **Security Note**: Store your token securely. Never commit it to version control.

---

## Installation Methods

### Method 1: Smithery (Easiest) ⭐

**Best for**: Beginners, quick setup, GUI configuration

[Smithery](https://smithery.ai) is a registry for MCP servers with one-click installation.

#### Installation Steps

**For Claude Desktop:**
```bash
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude
```

**For Cursor:**
```bash
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client cursor
```

**For VS Code:**
```bash
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client vscode
```

#### Interactive Configuration

You'll be prompted for:

1. **Home Assistant URL**
   ```
   Example: http://192.168.1.100:8123
   Or: https://homeassistant.local:8123
   ```

2. **Access Token**
   ```
   Paste your long-lived access token
   (characters will be hidden for security)
   ```

3. **Optional Settings**
   - Port (default: 3000)
   - Debug mode (default: false)
   - Log level (default: info)

#### Post-Installation

1. **Restart your AI assistant**
   - Claude Desktop: Quit and reopen
   - Cursor: Restart the application
   - VS Code: Reload window

2. **Verify installation**
   - Look for MCP server indicator in your AI assistant
   - Try: "Show me all my smart home devices"

For detailed deployment options, see [SMITHERY_DEPLOYMENT.md](SMITHERY_DEPLOYMENT.md).

---

### Method 2: NPX (Quick Start)

**Best for**: Testing, temporary usage, no installation needed

Run directly without global installation:

```bash
npx @jango-blockchained/homeassistant-mcp@latest
```

#### Environment Configuration

Create a `.env` file in your working directory:

```env
# Required
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...

# Optional
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
DEBUG=false

# Security (optional)
JWT_SECRET=your-secret-key-here
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

#### Running

```bash
# Default mode (stdio)
npx @jango-blockchained/homeassistant-mcp@latest

# HTTP server mode
npx @jango-blockchained/homeassistant-mcp@latest --http

# With custom port
PORT=4000 npx @jango-blockchained/homeassistant-mcp@latest
```

---

### Method 3: Bunx (GitHub Direct)

**Best for**: Latest development version, no npm login required

Run directly from GitHub repository:

```bash
bunx github:jango-blockchained/advanced-homeassistant-mcp
```

#### First-time Setup

1. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Configure environment**:
   Create `.env` file as shown in Method 2

3. **Run**:
   ```bash
   bunx github:jango-blockchained/advanced-homeassistant-mcp
   ```

#### Alternative Git Installation

```bash
# Install from Git URL
bun add git+https://github.com/jango-blockchained/advanced-homeassistant-mcp.git

# Run
homeassistant-mcp
```

---

### Method 4: Docker (Containerized)

**Best for**: Production, isolated environments, multiple instances

#### Quick Start

```bash
# Pull latest image
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest

# Run container
docker run -d \
  --name homeassistant-mcp \
  --restart unless-stopped \
  -e HOME_ASSISTANT_URL=http://192.168.1.100:8123 \
  -e HOME_ASSISTANT_TOKEN=your_token_here \
  -p 4000:4000 \
  ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  homeassistant-mcp:
    image: ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
    container_name: homeassistant-mcp
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - HOME_ASSISTANT_URL=http://192.168.1.100:8123
      - HOME_ASSISTANT_TOKEN=${HA_TOKEN}
      - PORT=4000
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
    networks:
      - homeassistant

networks:
  homeassistant:
    driver: bridge
```

Create `.env` file:
```env
HA_TOKEN=your_long_lived_access_token
```

Start the service:
```bash
docker-compose up -d
```

#### Available Tags

- `latest` - Latest stable release
- `1.1.0` - Specific version
- `dev` - Latest development build

#### Docker Options

**Persistent logs:**
```bash
docker run -d \
  -v $(pwd)/logs:/app/logs \
  ...
```

**Custom configuration:**
```bash
docker run -d \
  -v $(pwd)/.env:/app/.env \
  ...
```

**Network mode (same as Home Assistant):**
```bash
docker run -d \
  --network=host \
  ...
```

For detailed Docker deployment, see [DOCKER_GUIDE.md](DOCKER_GUIDE.md).

---

### Method 5: Global NPM

**Best for**: System-wide availability, permanent installation

```bash
# Install globally
npm install -g @jango-blockchained/homeassistant-mcp

# Or with Bun
bun add -g @jango-blockchained/homeassistant-mcp
```

#### Configuration

Create global config at `~/.homeassistant-mcp/.env`:

```env
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=your_token_here
```

#### Running

```bash
# Run from anywhere
homeassistant-mcp

# Or with custom config
homeassistant-mcp --config /path/to/.env
```

---

### Method 6: From Source (Development)

**Best for**: Developers, contributors, customization

#### Clone and Build

```bash
# Clone repository
git clone https://github.com/jango-blockchained/advanced-homeassistant-mcp.git
cd advanced-homeassistant-mcp

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build
bun run build:all

# Run
bun run start:stdio
```

#### Development Mode

```bash
# Watch mode (auto-rebuild)
bun run dev

# HTTP server mode
bun run start:http

# Run tests
bun test

# Run with coverage
bun run test:coverage
```

#### Build Targets

```bash
# Build for Bun runtime (fastest)
bun run build

# Build all targets (Bun + Node.js)
bun run build:all

# Build stdio server only
bun run build:stdio

# Build for Node.js
bun run build:node
```

---

## AI Assistant Configuration

### Claude Desktop

**Configuration file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Add MCP server:**
```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "npx",
      "args": [
        "@jango-blockchained/homeassistant-mcp@latest"
      ],
      "env": {
        "HOME_ASSISTANT_URL": "http://192.168.1.100:8123",
        "HOME_ASSISTANT_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Alternative with Bunx:**
```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "bunx",
      "args": [
        "github:jango-blockchained/advanced-homeassistant-mcp"
      ],
      "env": {
        "HOME_ASSISTANT_URL": "http://192.168.1.100:8123",
        "HOME_ASSISTANT_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Cursor

**Configuration file:**
- All platforms: `.cursor/config/config.json` in your workspace

**Add MCP server:**
```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "npx",
      "args": ["@jango-blockchained/homeassistant-mcp@latest"],
      "env": {
        "HOME_ASSISTANT_URL": "http://192.168.1.100:8123",
        "HOME_ASSISTANT_TOKEN": "your_token_here"
      }
    }
  }
}
```

### VS Code

**Option 1: Using MCP Extension**

1. Install the MCP extension from marketplace
2. Open Command Palette (`Ctrl/Cmd + Shift + P`)
3. Run: `MCP: Add Server`
4. Follow the prompts

**Option 2: Manual Configuration**

Edit `.vscode/settings.json`:
```json
{
  "mcp.servers": {
    "homeassistant-mcp": {
      "command": "npx",
      "args": ["@jango-blockchained/homeassistant-mcp@latest"],
      "env": {
        "HOME_ASSISTANT_URL": "http://192.168.1.100:8123",
        "HOME_ASSISTANT_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

## Platform-Specific Guides

### macOS

**Prerequisites:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Bun
curl -fsSL https://bun.sh/install | bash
```

**Quick setup:**
```bash
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude
```

### Windows

**Prerequisites:**
```powershell
# Install Bun (PowerShell as Administrator)
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Quick setup:**
```powershell
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude
```

### Linux

**Prerequisites:**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Or use package manager
# Debian/Ubuntu
sudo apt update && sudo apt install -y curl unzip

# Fedora
sudo dnf install -y curl unzip
```

**Quick setup:**
```bash
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude
```

### Raspberry Pi

**For ARM devices:**

```bash
# Install Node.js (Bun may not support all ARM versions)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Install via NPM
npm install -g @jango-blockchained/homeassistant-mcp

# Configure
mkdir -p ~/.homeassistant-mcp
nano ~/.homeassistant-mcp/.env
```

---

## Verification

### Test Installation

```bash
# Check if command is available
homeassistant-mcp --version

# Or for NPX
npx @jango-blockchained/homeassistant-mcp --version
```

### Verify AI Assistant Connection

1. **Open your AI assistant** (Claude, Cursor, VS Code)

2. **Check MCP server status:**
   - Claude: Look for 🔌 icon in bottom-right
   - Cursor: Check MCP servers in settings
   - VS Code: Check MCP extension status

3. **Test basic command:**
   ```
   "List all my smart home devices"
   ```

Expected response should show your Home Assistant devices.

### Health Check

If using HTTP mode:

```bash
# Check server health
curl http://localhost:4000/api/health

# Expected response:
{
  "status": "ok",
  "version": "1.1.0",
  "homeAssistant": {
    "connected": true,
    "version": "2024.1.0"
  }
}
```

---

## Upgrading

### Smithery Installation

```bash
# Upgrade to latest
npx @smithery/cli update @jango-blockchained/homeassistant-mcp
```

### NPX/Global Installation

```bash
# NPX automatically uses latest
npx @jango-blockchained/homeassistant-mcp@latest

# Global upgrade
npm update -g @jango-blockchained/homeassistant-mcp

# Or with Bun
bun update -g @jango-blockchained/homeassistant-mcp
```

### Docker

```bash
# Pull latest image
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest

# Recreate container
docker-compose down
docker-compose up -d
```

### From Source

```bash
cd advanced-homeassistant-mcp

# Pull latest changes
git pull origin main

# Reinstall dependencies
bun install

# Rebuild
bun run build:all
```

---

## Troubleshooting

### Installation Issues

**Problem**: `command not found: bun`
```bash
# Solution: Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH
export PATH="$HOME/.bun/bin:$PATH"
```

**Problem**: `EACCES: permission denied`
```bash
# Solution: Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
```

**Problem**: `Docker image pull failed`
```bash
# Solution: Check Docker login
docker login ghcr.io

# Or pull without auth
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
```

### Connection Issues

**Problem**: "Cannot connect to Home Assistant"

1. Check Home Assistant is accessible:
   ```bash
   curl http://192.168.1.100:8123/api/
   ```

2. Verify token is valid:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://192.168.1.100:8123/api/
   ```

3. Check network connectivity

**Problem**: "MCP server not detected"

1. Restart AI assistant completely
2. Check configuration file is correct
3. Verify server is running
4. Check logs for errors

For more troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Next Steps

After successful installation:

1. **[Getting Started Guide](GETTING_STARTED.md)** - First steps and basic usage
2. **[Configuration Guide](CONFIGURATION.md)** - Fine-tune your setup
3. **[Tools Reference](TOOLS_REFERENCE.md)** - Available commands
4. **[Examples](EXAMPLES.md)** - Real-world usage examples

---

## Support

- 💬 [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)
- 🐛 [Issue Tracker](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues)
- 📖 [Documentation](index.md)

---

**Installation complete!** Start controlling your smart home with AI. 🎉
