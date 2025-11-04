# Automated Release Process

This repository uses automated workflows to release new versions to GitHub, npm, and Docker. This document explains how the automated release system works and how to create new releases.

## Overview

The automated release system consists of three main workflows:

1. **Release Workflow** (`release.yml`) - Automatically publishes releases when a version tag is pushed
2. **Version Bump Workflow** (`version-bump.yml`) - Helps create new version tags through GitHub UI
3. **Development Docker Build** (`docker-build-push.yml`) - Builds development images on main branch

## Quick Start: Creating a New Release

### Option 1: Using GitHub Actions UI (Recommended)

1. Go to **Actions** tab in the GitHub repository
2. Click on **"Version Bump and Release"** workflow
3. Click **"Run workflow"** button
4. Select the version bump type:
   - `patch` - for bug fixes (1.0.0 → 1.0.1)
   - `minor` - for new features (1.0.0 → 1.1.0)
   - `major` - for breaking changes (1.0.0 → 2.0.0)
5. Click **"Run workflow"**

The workflow will:
- ✅ Update `package.json` version
- ✅ Commit the version change
- ✅ Create and push a version tag (e.g., `v1.0.8`)
- ✅ Trigger the release workflow automatically

### Option 2: Manual Tag Creation

If you prefer to create tags manually:

```bash
# Update version in package.json manually
# Then commit the change
git add package.json
git commit -m "chore: bump version to 1.0.8"

# Create and push the tag
git tag -a v1.0.8 -m "Release v1.0.8"
git push origin main
git push origin v1.0.8
```

## What Happens Automatically

When a version tag (e.g., `v1.0.8`) is pushed, the **Release Workflow** automatically:

### 1. Creates GitHub Release
- ✅ Generates changelog from git commits
- ✅ Creates a GitHub release with installation instructions
- ✅ Attaches the tag to the release

### 2. Publishes to npm
- ✅ Builds the package using `bun run build:all`
- ✅ Verifies the package version matches the tag
- ✅ Publishes to npm registry as `@jango-blockchained/homeassistant-mcp`
- ✅ Makes it available via `npm install` and `npx`

### 3. Builds and Publishes Docker Image
- ✅ Builds the Docker image from the Dockerfile
- ✅ Pushes to GitHub Container Registry (ghcr.io)
- ✅ Tags with multiple versions:
  - Full version (e.g., `1.0.8`)
  - Major.Minor version (e.g., `1.0`)
  - Major version (e.g., `1`)
  - `latest` tag (for default branch)

## Installation After Release

Once a release is published, users can install it via:

### npm
```bash
# Install globally
npm install -g @jango-blockchained/homeassistant-mcp

# Or use with npx
npx @jango-blockchained/homeassistant-mcp
```

### Docker
```bash
# Pull specific version
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:1.0.8

# Pull latest version
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest

# Run the container
docker run -p 4000:4000 ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
```

## Development Workflow

### Development Builds
When code is pushed to the `main` branch (without a version tag), the **Development Docker Build** workflow automatically:
- ✅ Builds a development Docker image
- ✅ Tags it as `dev` and `dev-<commit-sha>`
- ✅ Pushes to GitHub Container Registry

This allows testing of the latest `main` branch code without creating an official release:
```bash
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:dev
```

## Required Secrets

To use the automated release system, ensure these secrets are configured in the repository:

### NPM_TOKEN
Required for publishing to npm. To create:
1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to **Account Settings** → **Access Tokens**
3. Click **Generate New Token** → **Automation**
4. Copy the token
5. Add to GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
6. Name: `NPM_TOKEN`, Value: (paste token)

### GITHUB_TOKEN
Automatically provided by GitHub Actions - no setup needed.

## Workflow Files

### `.github/workflows/release.yml`
Main release workflow that:
- Creates GitHub releases
- Publishes to npm
- Builds and pushes Docker images
- Triggered by: Version tags (`v*.*.*`)

### `.github/workflows/version-bump.yml`
Helper workflow to bump versions:
- Updates package.json
- Creates version commits
- Creates and pushes tags
- Triggered by: Manual workflow dispatch

### `.github/workflows/docker-build-push.yml`
Development build workflow:
- Builds Docker images for testing
- Tags as `dev` and `dev-<sha>`
- Triggered by: Pushes to main branch

## Troubleshooting

### Release workflow fails on npm publish
**Problem**: `npm publish` fails with authentication error

**Solution**: 
1. Check that `NPM_TOKEN` secret is properly set
2. Ensure the npm token has "Automation" permissions
3. Verify the package name in `package.json` matches your npm account/org

### Docker build fails
**Problem**: Docker image build or push fails

**Solution**:
1. Check that GitHub Container Registry permissions are enabled
2. Verify Dockerfile is valid and builds locally
3. Ensure all dependencies are available during build

### Version mismatch error
**Problem**: "Package version does not match tag version"

**Solution**:
1. Ensure `package.json` version matches the git tag (without the 'v' prefix)
2. If using manual tagging, update `package.json` before creating the tag
3. Use the "Version Bump" workflow to avoid this issue

### Multiple releases triggered
**Problem**: Both push to main and tag push trigger workflows

**Solution**:
- The workflows are designed to work together:
  - Main pushes → Development Docker builds only
  - Tag pushes → Full release (GitHub, npm, Docker)
- This is intentional and expected behavior

## Best Practices

1. **Always use semantic versioning**: Follow [semver](https://semver.org/) principles
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

2. **Test before releasing**: Ensure all tests pass and the code builds successfully

3. **Write good commit messages**: They become part of the changelog

4. **Use the Version Bump workflow**: It ensures consistency and prevents errors

5. **Review the release**: Check GitHub releases, npm package, and Docker image after publishing

6. **Document breaking changes**: In commit messages and release notes

## Manual Override

If you need to manually publish (e.g., for hotfixes):

### npm
```bash
npm version patch  # or minor, major
npm publish
git push --follow-tags
```

### Docker
```bash
docker build -t ghcr.io/jango-blockchained/advanced-homeassistant-mcp:v1.0.8 .
docker push ghcr.io/jango-blockchained/advanced-homeassistant-mcp:v1.0.8
```

## Support

For issues with the automated release system:
1. Check workflow run logs in the Actions tab
2. Review this documentation
3. Open an issue in the repository
