# Docker Deployment Guide

This project now uses a **separate container architecture** with two independent services:

## Services

### 1. **MCP Server** (homeassistant-mcp)
- **Port**: 7123 (HTTP/JSON-RPC)
- **Dockerfile**: `Dockerfile`
- **Purpose**: Model Context Protocol server for AI/Claude integration via Smithery
- **Entry Point**: `node dist/http-server.js` (FastMCP with HTTP transport)
- **Features**:
  - Light, climate, automation, scene, notification controls
  - Home Assistant API integration
  - RESTful endpoints with Swagger documentation

### 2. **Aurora Server** (aurora-server)
- **Port**: 3000 (Web UI + REST API)
- **Dockerfile**: `Dockerfile.aurora`
- **Purpose**: Sound-to-light synchronization service with web UI
- **Entry Point**: `node dist/aurora-server.js` (Bun web server)
- **Features**:
  - Audio analysis (frequency, beats, mood detection)
  - Light timeline rendering synchronized to audio
  - Web UI for timeline management
  - Audio device profiling
  - Real-time playback control

## Deployment

### Production Deployment

```bash
# Build and start both services
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f

# Access services
# - MCP Server: http://localhost:7123/health
# - Aurora UI: http://localhost:3000
```

### Development Deployment

```bash
# Start with hot-reload
docker-compose -f docker-compose.dev.yml up

# Watch logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Using Package Scripts

```bash
# Production deployment
npm run docker:build
npm run docker:up

# Development deployment
npm run docker:dev

# View logs
npm run docker:logs

# Shutdown
npm run docker:down
```

## Environment Variables

Create `.env` file in project root:

```bash
# Home Assistant Configuration
HASS_HOST=http://homeassistant.local:8123
HASS_TOKEN=your_long_lived_access_token

# MCP Server
PORT=7123
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info

# Aurora Server
AURORA_PORT=3000

# Optional
DEBUG=false
```

## Service Dependencies

- **MCP Server** depends on **Aurora Server** (for future integration)
- Both services share the same Home Assistant instance
- Both services share logs volume for centralized logging

## Container Networking

Both containers are connected via `homeassistant-mcp-network` bridge network, allowing them to communicate via service names:
- MCP Server: `http://homeassistant-mcp:7123`
- Aurora Server: `http://aurora-server:3000`

## Building Individual Services

### Build only MCP Server
```bash
docker build -f Dockerfile -t homeassistant-mcp:latest .
```

### Build only Aurora Server
```bash
docker build -f Dockerfile.aurora -t aurora-server:latest .
```

### Using npm scripts
```bash
npm run build:all    # Build MCP server
npm run build:aurora # Build Aurora server
```

## Local Development Without Docker

### MCP Server
```bash
npm run build:all
npm run start:http
```

### Aurora Server
```bash
npm run start:aurora
# or with hot-reload
npm run dev:aurora
```

## Health Checks

### MCP Server
```bash
curl http://localhost:7123/health
curl http://localhost:7123/.well-known/mcp-config
```

### Aurora Server
```bash
curl http://localhost:3000/health
# Browse: http://localhost:3000
```

## Troubleshooting

### Port Conflicts
If ports are already in use, override them:

```bash
PORT=7124 AURORA_PORT=3001 docker-compose up
```

### Audio Device Access (Aurora)
The Aurora container needs access to host audio devices:
```bash
# Ensure /dev/snd is accessible
ls -la /dev/snd/
```

### Rebuild Without Cache
```bash
docker-compose build --no-cache
```

### View Container Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f homeassistant-mcp
docker-compose logs -f aurora-server

# Last 100 lines
docker-compose logs --tail=100 homeassistant-mcp
```

## Testing Smithery Deployment

For testing the MCP server deployment on Smithery:

```bash
npm run smithery:dev           # Run locally on port 7123
npm run smithery:playground    # Open playground with CLI
```

Visit: https://server.smithery.ai/@jango-blockchained/advanced-homeassistant-mcp/mcp
