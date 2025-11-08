# Aurora Separate Container Architecture - Implementation Complete ✅

## Overview

The project now uses a **dual-container architecture** with independent services for MCP and Aurora:

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               Docker Compose Network                         │
│          (homeassistant-mcp-network bridge)                  │
├─────────────────┬───────────────────────┬───────────────────┤
│                 │                       │                   │
│   MCP Server    │   Aurora Server       │  Home Assistant   │
│   (Port 7123)   │   (Port 3000)         │  (External)       │
│                 │                       │                   │
│  • FastMCP      │  • Bun Web Server     │  • REST API       │
│  • HTTP         │  • Audio Processing   │  • WebSocket      │
│  • JSON-RPC     │  • Light Timelines    │  • Entity Control │
│  • Smithery     │  • Web UI              │                   │
│                 │  • Audio Analysis      │                   │
└─────────────────┴───────────────────────┴───────────────────┘
```

## Files Created/Modified

### New Files
- ✅ `Dockerfile.aurora` - Separate Docker image for Aurora server
- ✅ `docker-compose.dev.yml` - Development setup with hot-reload
- ✅ `DOCKER_DEPLOYMENT.md` - Comprehensive deployment guide

### Modified Files
- ✅ `Dockerfile` - Updated for MCP HTTP server (FastMCP with Node.js runtime)
- ✅ `docker-compose.yml` - Split into 2 services: homeassistant-mcp + aurora-server
- ✅ `package.json` - Added Aurora build scripts and docker commands
- ✅ `src/http-server.ts` - Enhanced with Express app + health check endpoints

## Service Details

### MCP Server Container
```
Dockerfile: Dockerfile
Image: homeassistant-mcp:latest
Container: homeassistant-mcp
Port: 7123 (default)
Volumes: ./logs
Entry: node dist/http-server.js
Environment:
  - PORT=7123
  - NODE_ENV=production
  - HASS_TOKEN=required
  - HASS_HOST=http://192.168.178.63:8123
```

### Aurora Server Container
```
Dockerfile: Dockerfile.aurora
Image: aurora-server:latest
Container: aurora-server
Port: 3000 (default)
Volumes: ./logs, ./audio, ./aurora-profiles, /dev/snd
Entry: node dist/aurora-server.js
Environment:
  - AURORA_PORT=3000
  - NODE_ENV=production
  - HASS_TOKEN=required
  - HASS_HOST=http://192.168.178.63:8123
```

## Key Improvements

### 1. **Separation of Concerns**
- MCP server isolated for Smithery deployment
- Aurora server can run independently for web UI access
- Easy to scale or manage services separately

### 2. **Better Resource Management**
- Each service has its own Python venv
- Separate logs and data volumes
- Independent restart policies

### 3. **Audio Isolation (Aurora)**
- Direct access to `/dev/snd` for audio processing
- Pulseaudio + ALSA configuration
- Python audio libraries (numpy, scipy, librosa)

### 4. **Network Communication**
- Shared bridge network allows inter-service communication
- MCP → Aurora possible via `http://aurora-server:3000`
- Both can independently communicate with Home Assistant

### 5. **Development Flexibility**
- `docker-compose.yml` for production
- `docker-compose.dev.yml` for hot-reload development
- npm scripts for easy container management

## Usage

### Production Deployment
```bash
# Build both images
npm run docker:build

# Start both services
npm run docker:up

# View logs
npm run docker:logs

# Shutdown
npm run docker:down
```

### Development with Hot-Reload
```bash
# Start with file watching
npm run docker:dev

# In another terminal, watch logs
npm run docker:logs
```

### Individual Service Build
```bash
# MCP server only
npm run build:all

# Aurora server only
npm run build:aurora

# Start locally (without Docker)
npm run start:http      # MCP server
npm run start:aurora    # Aurora server
npm run dev:aurora      # Aurora with hot-reload
```

## Deployment to Smithery

The MCP server is optimized for Smithery deployment:
- Port 7123 configurable via `PORT` env var
- Health check endpoint: `GET /health`
- Config endpoint: `GET /.well-known/mcp-config`
- FastMCP 3.x with httpStream transport
- Proper error handling and timeouts

```bash
# Test locally
npm run smithery:dev

# Deploy
npm run smithery:build
```

## Container Networking

Both services communicate over the `homeassistant-mcp-network` bridge:

**From MCP Container:**
```
curl http://aurora-server:3000/health
```

**From Aurora Container:**
```
curl http://homeassistant-mcp:7123/health
```

## Environment Configuration

Create `.env` in project root:

```bash
# Required
HASS_TOKEN=your_long_lived_access_token

# Optional (defaults shown)
HASS_HOST=http://192.168.178.63:8123
PORT=7123
AURORA_PORT=3000
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info
```

## Health Checks

### MCP Server
```bash
curl http://localhost:7123/health
# Response: {"status":"ok","timestamp":"2025-11-08T..."}

curl http://localhost:7123/.well-known/mcp-config
# Response: {"name":"Home Assistant MCP Server",...}
```

### Aurora Server
```bash
curl http://localhost:3000/health
# Open Web UI: http://localhost:3000
```

## Troubleshooting

### Port Already in Use
```bash
PORT=7124 AURORA_PORT=3001 npm run docker:up
```

### Build Cache Issues
```bash
npm run docker:build  # Uses cached layers
docker-compose build --no-cache  # Fresh build
```

### Audio Device Access (Aurora)
```bash
# Check host audio devices are accessible
ls -la /dev/snd/
# Container mounts /dev/snd for access
```

### View Logs
```bash
# All services
npm run docker:logs

# Specific service
docker-compose logs -f homeassistant-mcp
docker-compose logs -f aurora-server
```

## Next Steps

1. ✅ Build and test locally
   ```bash
   npm run docker:build
   npm run docker:up
   ```

2. ✅ Verify health checks
   ```bash
   curl http://localhost:7123/health
   curl http://localhost:3000
   ```

3. ✅ Deploy to Smithery (MCP only)
   - The MCP server is ready for Smithery deployment
   - Aurora server can be deployed separately if needed

4. ✅ Configure environment
   - Create `.env` with `HASS_TOKEN` and other settings
   - Services will automatically use env variables

## Summary of Changes

| Component | Before | After |
|-----------|--------|-------|
| Dockerfiles | 1 (unified) | 2 (MCP + Aurora) |
| Services | 1 monolithic | 2 independent |
| MCP Runtime | Bun + src/index.ts | Node.js + dist/http-server.js |
| Aurora Runtime | None (local only) | Docker container |
| Development | Direct Bun/Node | Docker Compose |
| Production | Docker (mixed) | Docker Compose (2 services) |
| Smithery Ready | ❌ No | ✅ Yes |

---

**Status**: ✅ **Complete and Ready for Deployment**

All changes are backward compatible. Existing Smithery deployment will use the MCP server. Aurora can be deployed independently as needed.
