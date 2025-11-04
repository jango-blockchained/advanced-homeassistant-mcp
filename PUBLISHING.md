# Publishing to npm

> **Note**: This repository now uses **automated releases**. See [AUTOMATED_RELEASES.md](docs/AUTOMATED_RELEASES.md) for the recommended workflow.

This document outlines the manual steps to publish the Home Assistant MCP server to npm. For most cases, you should use the automated release workflow instead.

## Quick Start (Automated - Recommended)

Use the GitHub Actions workflow:
1. Go to **Actions** → **Version Bump and Release**
2. Click **Run workflow** and select version bump type
3. The system automatically publishes to GitHub, npm, and Docker

## Manual Publishing (Advanced Users Only)

Only use this if the automated workflow is unavailable or you need manual control.

### Prerequisites

1. You need an npm account. Create one at [npmjs.com](https://www.npmjs.com/signup) if you don't have one.
2. You need to be logged in to npm on your local machine:
   ```bash
   npm login
   ```
3. You need to have all the necessary dependencies installed:
   ```bash
   npm install
   ```

### Before Publishing

1. Make sure all tests pass:
   ```bash
   npm test
   ```

2. Build all the necessary files:
   ```bash
   npm run build        # Build for Bun
   npm run build:node   # Build for Node.js
   npm run build:stdio  # Build the stdio server
   ```

3. Update the version number in `package.json` following [semantic versioning](https://semver.org/):
   - MAJOR version for incompatible API changes
   - MINOR version for new functionality in a backward-compatible manner
   - PATCH version for backward-compatible bug fixes

4. Update the CHANGELOG.md file with the changes in the new version.

## Publishing

1. Publish to npm:
   ```bash
   npm publish
   ```

   If you want to publish a beta version:
   ```bash
   npm publish --tag beta
   ```

2. Verify the package is published:
   ```bash
   npm view homeassistant-mcp
   ```

## After Publishing

1. Create a git tag for the version:
   ```bash
   git tag -a v1.0.0 -m "Version 1.0.0"
   git push origin v1.0.0
   ```

2. Create a GitHub release with the same version number and include the changelog.

## Testing the Published Package

To test the published package:

```bash
# Install globally
npm install -g homeassistant-mcp

# Run the MCP server
homeassistant-mcp

# Or use npx without installing
npx homeassistant-mcp
```

## Unpublishing

If you need to unpublish a version (only possible within 72 hours of publishing):

```bash
npm unpublish homeassistant-mcp@1.0.0
```

## Publishing a New Version

1. Update the version in package.json
2. Update CHANGELOG.md
3. Build all files
4. Run tests
5. Publish to npm
6. Create a git tag
7. Create a GitHub release 