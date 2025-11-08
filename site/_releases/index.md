---
title: Releases
layout: page
---

# Release History

## [v1.2.0](v1.2.0.md) - November 7, 2025

**Status**: ✅ Production Ready

### Key Achievements

#### 🐛 Critical Bug Fixes
- **WebSocket Subscription Cleanup**: Eliminates memory leaks in long-running servers
- **SSE Client Lifecycle**: Prevents unbounded Map growth with 1000+ concurrent clients
- **Aurora Timeline Memory**: Reduces memory from 100MB to 7MB using sliding window

#### ⚡ P1 Performance Optimizations
- **FFT Hamming Window**: 84.2% faster (6.3x speedup) - 10min audio analysis: 5s → <1s
- **SSE Broadcasting**: 99.7% faster (335x improvement) - 1000 clients: 1.6s → 5ms
- **Cache Invalidation**: 50%+ improvement in cache hit rate (20% → 70% expected)

#### 📊 Quality Metrics
- **Test Coverage**: 42+ new unit tests across 5 test files
- **Integration Tests**: 4/4 passing (stability, load, animations, resilience)
- **Performance**: All targets exceeded (6.3x FFT, 335x SSE, 93% Memory)

### Downloads

```bash
# Docker
docker pull jango-blockchained/homeassistant-mcp:1.2.0

# NPM
npm install @jango-blockchained/homeassistant-mcp@1.2.0
```

### Documentation
- [Full Release Notes](v1.2.0.md)
- [Performance Report](performance-1.2.0.md)
- [Changelog](changelog.md)

---

## v1.1.0 - Previous Release

[Earlier releases...]

---

**Latest Version**: 1.2.0  
**Release Date**: November 7, 2025  
**Status**: ✅ Production Ready

For more information, see the [GitHub repository](https://github.com/jango-blockchained/homeassistant-mcp).
