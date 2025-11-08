#!/bin/bash
set -e

echo "=========================================="
echo "🚀 GitHub Pages Deployment v1.2.0"
echo "=========================================="

# Step 1: Save current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $CURRENT_BRANCH"

# Step 2: Checkout gh-pages
echo "📄 Checking out gh-pages branch..."
git fetch origin gh-pages
git checkout gh-pages

# Step 3: Create releases directory if needed
echo "📁 Preparing site/_releases/ directory..."
mkdir -p site/_releases

# Step 4: Copy release documentation
echo "📋 Copying release documentation..."
cp RELEASE_v1.2.0.md site/_releases/v1.2.0.md
cp CHANGELOG.md site/_releases/changelog.md
cp PERFORMANCE_ANALYSIS.md site/_releases/performance-1.2.0.md

# Step 5: Create or update releases index
echo "📑 Creating releases index..."
cat > site/_releases/index.md << 'EOF'
# Releases

## v1.2.0 (Latest)

**Release Date**: November 7, 2025  
**Status**: ✅ Production Ready

### Key Improvements
- 3 critical bug fixes (WebSocket, SSE, Aurora)
- 3 performance optimizations (84.2%-335x improvements)
- 42+ new unit tests (all passing)
- 4 integration tests (all passing)

### Quick Links
- [Release Notes](v1.2.0.md)
- [Performance Report](performance-1.2.0.md)
- [Changelog](changelog.md)
- [GitHub Release](https://github.com/jango-blockchained/homeassistant-mcp/releases/tag/v1.2.0)

### Downloads
- **Docker**: `docker pull jango-blockchained/homeassistant-mcp:1.2.0`
- **NPM**: `npm install @jango-blockchained/homeassistant-mcp@1.2.0`
- **Source**: [GitHub](https://github.com/jango-blockchained/homeassistant-mcp/releases/tag/v1.2.0)

---

## Previous Releases

See [GitHub Releases](https://github.com/jango-blockchained/homeassistant-mcp/releases) for all versions.
EOF

# Step 6: Add and commit
echo "📝 Committing changes..."
git add site/_releases/
git commit -m "v1.2.0: Release documentation and GitHub Pages update" || echo "✅ No changes to commit"

# Step 7: Push to GitHub
echo "🚀 Pushing to GitHub Pages..."
git push origin gh-pages

# Step 8: Return to original branch
echo "↩️  Returning to $CURRENT_BRANCH branch..."
git checkout $CURRENT_BRANCH

echo ""
echo "=========================================="
echo "✅ GitHub Pages deployment complete!"
echo "=========================================="
echo ""
echo "📱 Release is now live at:"
echo "   https://jango-blockchained.github.io/homeassistant-mcp/releases/"
echo ""
echo "📄 Release documentation:"
echo "   - Release Notes: /releases/v1.2.0.md"
echo "   - Performance: /releases/performance-1.2.0.md"
echo "   - Changelog: /releases/changelog.md"
echo ""
