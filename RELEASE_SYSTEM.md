# Automated Release System

## Overview

This repository has a fully automated release system that publishes to:
- 📦 **GitHub Releases** - With auto-generated changelogs
- 📤 **npm** - Package registry at @jango-blockchained/homeassistant-mcp
- 🐳 **Docker** - GitHub Container Registry (ghcr.io)

## What Was Added

### Workflows (`.github/workflows/`)

1. **release.yml** - Main release automation
   - Triggers on version tags (v*.*.*)
   - Creates GitHub releases
   - Publishes to npm
   - Builds and pushes Docker images

2. **version-bump.yml** - Version management
   - Manual workflow dispatch from GitHub UI
   - Bumps version in package.json
   - Creates commits and tags
   - Triggers release workflow

3. **docker-build-push.yml** - Development builds (updated)
   - Builds dev Docker images on main branch pushes
   - No longer creates releases (moved to release.yml)

### Documentation (`docs/`)

- **AUTOMATED_RELEASES.md** - Complete user guide
- **SETUP_RELEASES.md** - Setup instructions with troubleshooting
- **QUICK_RELEASE.md** - Quick reference guide
- Updated **README.md** - Added badges, Docker install, release section
- Updated **PUBLISHING.md** - References automated system

## How It Works

```
Developer Actions:
1. Go to Actions → "Version Bump and Release"
2. Click "Run workflow"
3. Select version bump type (patch/minor/major)

↓

Automated Process:
1. version-bump.yml runs:
   - Updates package.json
   - Commits the change
   - Creates version tag (e.g., v1.0.8)
   - Pushes to main

2. release.yml triggers on tag:
   - Creates GitHub release with changelog
   - Publishes to npm registry
   - Builds Docker image
   - Pushes to ghcr.io with multiple tags

↓

Result:
✅ GitHub release created
✅ npm package available
✅ Docker images available
```

## Setup Required

### NPM_TOKEN Secret

**Must be configured for npm publishing to work.**

1. Create npm automation token at npmjs.com
2. Add to GitHub: Settings → Secrets → Actions → NPM_TOKEN

See `docs/SETUP_RELEASES.md` for detailed instructions.

### Docker Publishing

No setup needed! Uses `GITHUB_TOKEN` (automatically available).

## For Developers

### Creating a Release

**Easy way (recommended):**
1. Actions → "Version Bump and Release"
2. Run workflow with desired bump type
3. Done!

**Manual way:**
```bash
npm version patch  # or minor, major
git push --follow-tags
```

### Testing Without Release

Push to `main` branch → Automatic dev Docker build
- Tagged as `dev` and `dev-<commit-sha>`
- Available at: `ghcr.io/jango-blockchained/advanced-homeassistant-mcp:dev`

### Version Numbers

Follow [Semantic Versioning](https://semver.org/):
- **PATCH** (1.0.7 → 1.0.8) - Bug fixes
- **MINOR** (1.0.7 → 1.1.0) - New features
- **MAJOR** (1.0.7 → 2.0.0) - Breaking changes

## Docker Tags Generated

Each release creates multiple Docker tags:
- `1.0.8` - Exact version
- `1.0` - Major.minor version
- `1` - Major version
- `latest` - Latest stable release

Example:
```bash
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:1.0.8
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:1.0
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:1
```

## Workflow Files Explained

### release.yml (Main Release)

**Triggers:** Push of version tags (v*.*.*)

**Jobs:**
1. `create-release` - Creates GitHub release with changelog
2. `publish-npm` - Builds and publishes to npm
3. `build-docker` - Builds and pushes Docker images

**Dependencies:**
- Needs `NPM_TOKEN` secret
- Uses `GITHUB_TOKEN` (automatic)

### version-bump.yml (Helper)

**Triggers:** Manual workflow dispatch

**Jobs:**
1. `bump-version` - Updates package.json, commits, tags

**Parameters:**
- `version_bump` - patch/minor/major (required)

### docker-build-push.yml (Development)

**Triggers:** 
- Pushes to `main` branch
- Manual workflow dispatch

**Jobs:**
1. `build-and-push-dev` - Builds dev Docker images

**Tags:**
- `dev` - Latest from main
- `dev-<sha>` - Specific commit

## Benefits

1. **Consistency** - Same process every time
2. **Speed** - 5-10 minutes from click to published
3. **Safety** - Version validation, automated testing
4. **Traceability** - Every release tracked in Git and GitHub
5. **Multi-platform** - One click publishes everywhere

## Monitoring

Check workflow status:
- Actions tab → Latest workflow runs
- Each run shows logs for debugging

Verify releases:
- GitHub: Releases page
- npm: https://www.npmjs.com/package/@jango-blockchained/homeassistant-mcp
- Docker: https://github.com/jango-blockchained/advanced-homeassistant-mcp/pkgs/container/advanced-homeassistant-mcp

## Troubleshooting

See `docs/SETUP_RELEASES.md#troubleshooting` for:
- npm authentication errors
- Docker build failures
- Version mismatch issues
- Common problems and solutions

## Future Enhancements

Possible additions:
- [ ] Automated changelog generation from PRs
- [ ] Release notes templates
- [ ] Pre-release/beta support
- [ ] Automated rollback on failures
- [ ] Release approval workflow
- [ ] Slack/Discord notifications

## References

- [Semantic Versioning](https://semver.org/)
- [npm Publishing](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions](https://docs.github.com/en/actions)
