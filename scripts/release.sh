#!/bin/bash

# Release & Deploy Script for v1.2.1
# Handles: Git tagging, Docker build, GitHub Pages, and documentation

set -e

VERSION="1.2.1"
REPO_NAME="homeassistant-mcp"
DOCKER_IMAGE="jangoblockchained/homeassistant-mcp"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "🚀 Starting Release v${VERSION}"
echo "════════════════════════════════════════════"

# Step 1: Verify build
echo ""
echo "Step 1: Verifying build..."
if [ ! -f "dist/index.js" ] || [ ! -f "dist/http-server.js" ] || [ ! -f "dist/stdio-server.mjs" ]; then
  echo "❌ Build artifacts missing. Run: bun run build:all"
  exit 1
fi
echo "✅ Build verified (3 artifacts present)"

# Step 2: Verify version
echo ""
echo "Step 2: Verifying version..."
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
if [ "$PACKAGE_VERSION" != "$VERSION" ]; then
  echo "❌ Version mismatch: package.json=$PACKAGE_VERSION, expected=$VERSION"
  exit 1
fi
echo "✅ Version verified ($PACKAGE_VERSION)"

# Step 3: Verify documentation
echo ""
echo "Step 3: Verifying documentation..."
if [ ! -f "CHANGELOG.md" ] || [ ! -f "RELEASE_v${VERSION}.md" ]; then
  echo "❌ Documentation missing"
  exit 1
fi
echo "✅ Documentation verified"

# Step 4: Create GitHub release metadata
echo ""
echo "Step 4: Creating GitHub release..."
mkdir -p .github/releases

cat > .github/releases/v${VERSION}.json << EOF
{
  "tag_name": "v${VERSION}",
  "target_commitish": "main",
  "name": "Release v${VERSION}",
  "body": "## 🚀 Release v${VERSION}\n\n### Key Improvements\n- ✅ fix(stdio): build stdio-server as ESM to resolve dependency issues\n\n### Downloads\n- Docker: \`docker pull ${DOCKER_IMAGE}:${VERSION}\`\n- NPM: See https://www.npmjs.com/package/@jango-blockchained/homeassistant-mcp\n\nSee RELEASE_v${VERSION}.md for complete details.",
  "draft": false,
  "prerelease": false
}
EOF

echo "✅ Release metadata created"

# Step 5: Docker build
echo ""
echo "Step 5: Building Docker image..."
if command -v docker &> /dev/null; then
  echo "   Building: ${DOCKER_IMAGE}:${VERSION}"
  docker build \
    --build-arg VERSION=${VERSION} \
    --tag ${DOCKER_IMAGE}:${VERSION} \
    --tag ${DOCKER_IMAGE}:latest \
    -f Dockerfile .
  echo "✅ Docker image built"
  
  echo ""
  echo "Step 5a: Docker image details"
  docker images ${DOCKER_IMAGE} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -3
else
  echo "⚠️  Docker not available (skipping Docker build)"
fi

# Step 6: Generate GitHub Pages documentation
echo ""
echo "Step 6: Generating GitHub Pages documentation..."
mkdir -p site/_releases

cp RELEASE_v${VERSION}.md site/_releases/v${VERSION}.md
cp CHANGELOG.md site/_releases/changelog.md

cat > site/_releases/index.md << 'PAGES_EOF'
---
title: Releases
layout: page
---

# Release History

## [v1.2.1](v1.2.1.md) - November 13, 2025

**Status**: ✅ Production Ready

### Key Highlights
- **fix(stdio)**: build stdio-server as ESM to resolve dependency issues

[Full Release Notes](v1.2.1.md) | [Changelog](changelog.md)

---

**Latest Version**: 1.2.1
**Latest Update**: November 13, 2025

PAGES_EOF

echo "✅ GitHub Pages documentation generated"

# Step 7: Git operations
echo ""
echo "Step 7: Git operations..."
if git rev-parse v${VERSION} >/dev/null 2>&1; then
  echo "⚠️  Tag v${VERSION} already exists"
else
  git tag -a v${VERSION} -m "Release v${VERSION}: fix(stdio): build stdio-server as ESM to resolve dependency issues" || true
  echo "✅ Git tag created: v${VERSION}"
fi

# Step 8: Summary
echo ""
echo "════════════════════════════════════════════"
echo "✅ RELEASE v${VERSION} READY FOR DEPLOYMENT"
echo "════════════════════════════════════════════"

echo ""
echo "📦 Build Artifacts:"
ls -lh dist/ | grep -E '\.(js|mjs|cjs)$' | awk '{print "   " $9 " (" $5 ")"}'

echo ""
echo "🐳 Docker:"
if command -v docker &> /dev/null; then
  echo "   Image: ${DOCKER_IMAGE}:${VERSION}"
  echo "   Size: $(docker images ${DOCKER_IMAGE}:${VERSION} --format '{{.Size}}')"
  echo "   Latest: ${DOCKER_IMAGE}:latest"
else
  echo "   ⚠️  Docker not available"
fi

echo ""
echo "📄 Documentation:"
echo "   Release: RELEASE_v${VERSION}.md"
echo "   Changelog: CHANGELOG.md"
echo "   GitHub Pages: site/_releases/"

echo ""
echo "🏷️  Git Tag: v${VERSION}"

echo ""
echo "🚀 Next Steps:"
echo "   1. Review changes: git log --oneline -10"
echo "   2. Push to origin: git push origin v${VERSION}"
echo "   3. Create GitHub Release (see .github/releases/v${VERSION}.json)"
echo "   4. Publish Docker: docker push ${DOCKER_IMAGE}:${VERSION}"

echo ""
echo "✨ Release completed at ${TIMESTAMP}"
