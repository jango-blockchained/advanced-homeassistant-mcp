# Quick Release Guide

This is a quick reference for creating releases. For detailed information, see [AUTOMATED_RELEASES.md](AUTOMATED_RELEASES.md).

## Create a New Release (3 steps)

### 1. Go to Actions Tab
Navigate to: `https://github.com/jango-blockchained/advanced-homeassistant-mcp/actions`

### 2. Run the Workflow
- Click on **"Version Bump and Release"** workflow
- Click **"Run workflow"** button (green button on the right)
- Select version bump type:
  - **patch** → Bug fixes (1.0.7 → 1.0.8)
  - **minor** → New features (1.0.7 → 1.1.0)  
  - **major** → Breaking changes (1.0.7 → 2.0.0)

### 3. Wait for Completion
The workflow will automatically:
- ✅ Update package.json
- ✅ Create git tag (e.g., v1.0.8)
- ✅ Create GitHub release with changelog
- ✅ Publish to npm
- ✅ Build and push Docker image

## Installation After Release

Users can install via:

```bash
# npm
npm install -g @jango-blockchained/homeassistant-mcp

# npx (no install)
npx @jango-blockchained/homeassistant-mcp

# Docker
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
```

## First-Time Setup

**Required:** NPM_TOKEN secret must be configured for npm publishing.

See [SETUP_RELEASES.md](SETUP_RELEASES.md) for instructions.

## Troubleshooting

If a release fails:
1. Check the Actions tab for error logs
2. Verify NPM_TOKEN secret is set correctly
3. Ensure package.json version is valid
4. See [SETUP_RELEASES.md](SETUP_RELEASES.md#troubleshooting)

## Manual Release (Emergency Only)

If automation is broken:

```bash
# Update version
npm version patch

# Build
bun run build:all

# Publish
npm publish

# Push
git push --follow-tags
```
