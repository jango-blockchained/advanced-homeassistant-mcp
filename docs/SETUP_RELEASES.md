# Setting Up Automated Releases

This guide walks you through setting up the required secrets for automated releases.

## Required: NPM_TOKEN

To publish packages to npm automatically, you need to create an NPM access token and add it to GitHub secrets.

### Step 1: Create NPM Access Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Click on your profile picture → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** (for use in CI/CD)
5. Give it a name like "GitHub Actions - advanced-homeassistant-mcp"
6. Click **Generate Token**
7. **Copy the token immediately** - you won't be able to see it again!

### Step 2: Add Token to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste the token you copied from npm
6. Click **Add secret**

### Step 3: Verify Setup

1. Go to **Actions** tab
2. Click **Version Bump and Release**
3. Click **Run workflow**
4. Select `patch` and run
5. Monitor the workflow execution

If everything is set up correctly:
- ✅ The workflow creates a new version tag
- ✅ GitHub release is created
- ✅ Package is published to npm
- ✅ Docker image is pushed to GitHub Container Registry

## Optional: GitHub Container Registry

No additional setup is needed for Docker image publishing! GitHub automatically provides a `GITHUB_TOKEN` with permissions to push to GitHub Container Registry (ghcr.io).

The Docker images will be available at:
```
ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
ghcr.io/jango-blockchained/advanced-homeassistant-mcp:1.0.8
```

## Troubleshooting

### NPM Publish Fails

**Error**: `403 Forbidden`
- Check that `NPM_TOKEN` is correctly set in GitHub secrets
- Ensure the npm token has "Automation" permission
- Verify you have publish rights to the `@jango-blockchained` scope

**Error**: `401 Unauthorized`
- The token may have expired or been revoked
- Create a new token and update the GitHub secret

**Error**: `You must verify your email`
- Log in to npm and verify your email address

### Docker Push Fails

**Error**: `denied: permission_denied`
- Check that the workflow has `packages: write` permission (already configured)
- Ensure the repository allows GitHub Actions to create packages

**Error**: `manifest invalid`
- Check that the Dockerfile is valid
- Try building locally: `docker build -t test .`

### Version Mismatch

**Error**: `Package version does not match tag version`
- This happens when you manually create a tag without updating package.json
- Use the "Version Bump and Release" workflow to avoid this
- Or manually ensure package.json version matches your tag (without the 'v' prefix)

## Testing Before Production

1. Create a test release to verify everything works:
   ```bash
   # In your local repository
   npm version patch
   git push origin main --follow-tags
   ```

2. Monitor the Actions tab to see if all jobs complete successfully

3. Check:
   - GitHub Releases page for the new release
   - npm registry: https://www.npmjs.com/package/@jango-blockchained/homeassistant-mcp
   - GitHub Container Registry: https://github.com/jango-blockchained/advanced-homeassistant-mcp/pkgs/container/advanced-homeassistant-mcp

## Security Best Practices

1. **Never commit tokens** to the repository
2. **Use automation tokens** (not personal access tokens) for CI/CD
3. **Rotate tokens regularly** (every 90 days recommended)
4. **Limit token scope** to only what's needed
5. **Monitor usage** in npm and GitHub audit logs

## Manual Release Override

If you need to publish manually (e.g., emergency hotfix):

```bash
# Update version
npm version patch

# Build
bun run build:all

# Publish to npm
npm publish

# Create git tag and push
git push origin main --follow-tags
```

For Docker:
```bash
# Build
docker build -t ghcr.io/jango-blockchained/advanced-homeassistant-mcp:v1.0.8 .

# Login (secure method)
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin

# Push
docker push ghcr.io/jango-blockchained/advanced-homeassistant-mcp:v1.0.8
```

## Support

If you encounter issues:
1. Check workflow logs in the Actions tab
2. Review this guide
3. Check npm and GitHub status pages
4. Open an issue in the repository
