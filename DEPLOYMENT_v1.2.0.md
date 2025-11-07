# Release v1.2.0 - Deployment Instructions

## 🚀 Production Deployment

This document contains all instructions for deploying v1.2.0 to production.

### Artifacts Available

#### Build Artifacts (in `dist/`)
- `index.js` (4.61 MB) - Bun runtime entry point
- `stdio-server.js` (3.42 MB) - Node.js STDIO transport
- `http-server.js` (3.41 MB) - Node.js HTTP transport

#### Docker Image
- **Tag**: `jango-blockchained/homeassistant-mcp:1.2.0`
- **Latest**: `jango-blockchained/homeassistant-mcp:latest`
- **Size**: 5.11 GB
- **Status**: Built and ready for push

#### Documentation
- `RELEASE_v1.2.0.md` - Complete release notes
- `CHANGELOG.md` - Detailed change log
- `PERFORMANCE_ANALYSIS.md` - Benchmark results
- GitHub Pages deployment to `site/_releases/`

---

## 📋 Deployment Checklist

### Step 1: Git Operations
```bash
# Verify tag exists
git tag -l | grep v1.2.0

# View recent commits
git log --oneline -5

# Push tag to GitHub
git push origin v1.2.0

# Push release branch
git push origin aurora
```

### Step 2: Docker Deployment
```bash
# Login to Docker Hub
docker login

# Push image to registry
docker push jango-blockchained/homeassistant-mcp:1.2.0
docker push jango-blockchained/homeassistant-mcp:latest

# Verify image
docker images jango-blockchained/homeassistant-mcp --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### Step 3: GitHub Release
Create a GitHub Release with:
- **Tag**: v1.2.0
- **Title**: Release v1.2.0 - Performance Optimizations
- **Body**: (see RELEASE_v1.2.0.md)
- **Attach**: Release notes as artifact

### Step 4: GitHub Pages
```bash
# Push docs to GitHub Pages
git add site/
git commit -m "docs: v1.2.0 release documentation"
git push origin main docs/
```

### Step 5: NPM Registry
```bash
# Ensure credentials are configured
npm whoami

# Publish to NPM
npm publish

# Verify publication
npm info @jango-blockchained/homeassistant-mcp@1.2.0
```

---

## 🐳 Docker Deployment Options

### Run as HTTP Server
```bash
docker run -d \
  --name homeassistant-mcp \
  -p 7123:7123 \
  -e HA_URL=http://home-assistant:8123 \
  -e HA_TOKEN=your_token_here \
  jango-blockchained/homeassistant-mcp:1.2.0
```

### Run as STDIO Server
```bash
docker run -it \
  --rm \
  jango-blockchained/homeassistant-mcp:1.2.0 \
  /app/bin/stdio-server.js
```

### Run with Docker Compose
```yaml
version: '3'
services:
  homeassistant-mcp:
    image: jango-blockchained/homeassistant-mcp:1.2.0
    ports:
      - "7123:7123"
    environment:
      HA_URL: http://home-assistant:8123
      HA_TOKEN: ${HA_TOKEN}
    restart: always
```

---

## 📊 Post-Deployment Monitoring

### Health Checks

```bash
# HTTP Server Health
curl -s http://localhost:7123/health | jq .

# Check logs
docker logs -f homeassistant-mcp

# Monitor performance
docker stats homeassistant-mcp
```

### Key Metrics to Monitor

1. **SSE Broadcast Latency**
   - Target: <10ms for 1000 clients
   - Command: Monitor via application metrics

2. **Audio Analysis Time**
   - Target: <1 second for 10-minute files
   - Expected: 6.3x faster than v1.1.0

3. **Memory Usage**
   - Target: Stable over 24+ hours
   - Expected: 93% reduction for long timelines

4. **Error Rate**
   - Target: <0.1%
   - Monitor: Application logs

5. **Cache Hit Rate**
   - Target: >70%
   - Expected: 50%+ improvement over baseline

### Alert Thresholds

- SSE latency > 50ms → Alert
- Memory growth > 10MB/hour → Alert
- Error rate > 1% → Alert
- CPU usage > 80% → Warning

---

## 🔄 Rollback Plan

If issues occur, rollback to v1.1.0:

```bash
# Docker rollback
docker pull jango-blockchained/homeassistant-mcp:1.1.0
docker stop homeassistant-mcp
docker run -d \
  --name homeassistant-mcp \
  -p 7123:7123 \
  jango-blockchained/homeassistant-mcp:1.1.0

# NPM rollback
npm install @jango-blockchained/homeassistant-mcp@1.1.0

# Git rollback
git checkout v1.1.0
```

---

## 📚 Documentation

- **Full Release Notes**: See `RELEASE_v1.2.0.md`
- **Performance Report**: See `PERFORMANCE_ANALYSIS.md`
- **Changelog**: See `CHANGELOG.md`
- **GitHub Pages**: https://jango-blockchained.github.io/homeassistant-mcp/releases/

---

## ✨ What's New in v1.2.0

### Bug Fixes
- ✅ WebSocket subscription memory leak prevention
- ✅ SSE client lifecycle cleanup
- ✅ Aurora timeline memory optimization

### Performance
- ⚡ 84.2% faster FFT analysis (6.3x speedup)
- ⚡ 99.7% faster SSE broadcasting (335x improvement)
- ⚡ 50%+ cache hit rate improvement

### Testing
- 📊 42+ new unit tests
- 📊 4 integration tests (all passing)
- 📊 Comprehensive performance benchmarks

---

## 🎯 Success Criteria

All of the following must be true:

- ✅ Docker image builds successfully (5.11 GB)
- ✅ GitHub release created with proper tags
- ✅ NPM package published
- ✅ GitHub Pages documentation live
- ✅ All tests passing (42+ unit, 4 integration)
- ✅ Performance benchmarks verified
- ✅ No breaking changes
- ✅ Backward compatible

---

## 📞 Support

For deployment issues:
1. Check the rollback plan above
2. Review logs: `docker logs homeassistant-mcp`
3. Check metrics: `docker stats homeassistant-mcp`
4. Report issues: GitHub Issues tracker

---

**Release Version**: 1.2.0  
**Release Date**: November 7, 2025  
**Status**: ✅ Ready for Production Deployment
