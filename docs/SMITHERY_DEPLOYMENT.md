# Smithery Deployment Guide

## Overview

This guide explains how to deploy the Home Assistant MCP Server on Smithery.ai and troubleshoot common issues.

## Understanding `.well-known/mcp-config`

The `.well-known/mcp-config` endpoint is part of the MCP Discovery Protocol, allowing Smithery and other MCP clients to discover and configure your MCP server.

### What We've Implemented

1. **Static Configuration File**: `public/.well-known/mcp-config`
2. **Express Route**: Serves the configuration at `/.well-known/mcp-config`
3. **Configuration Schema**: Defines required/optional parameters for your MCP

## Deployment Options

### Option 1: Smithery-Hosted Deployment (Recommended)

When you publish your MCP on Smithery using the `container` runtime, Smithery handles hosting for you.

**Configuration File**: `smithery.yaml`

```yaml
runtime: "container"
build:
  dockerfile: "Dockerfile"
  dockerBuildPath: "."
```

**Steps**:
1. Ensure your repository is public or Smithery has access
2. Run: `npx @smithery/cli publish`
3. Smithery will build and deploy your container
4. The `.well-known/mcp-config` endpoint will be accessible via Smithery's infrastructure

### Option 2: External/Self-Hosted MCP

If you're hosting the MCP server yourself and just listing it on Smithery:

**Requirements**:
1. Deploy your server to a public URL (e.g., `https://your-domain.com`)
2. Ensure `https://your-domain.com/.well-known/mcp-config` is accessible
3. Register as an "External MCP" on Smithery

**Test Your Endpoint**:
```bash
curl https://your-domain.com/.well-known/mcp-config
```

Should return:
```json
{
  "schemaVersion": "1.0",
  "name": "Home Assistant MCP Server",
  "version": "1.1.0",
  ...
}
```

## Common Issues & Solutions

### Issue: "Failed to fetch .well-known/mcp-config"

**Possible Causes**:

1. **Server Not Running**
   ```bash
   # Start the server
   bun run src/index.ts
   
   # Test the endpoint
   curl http://localhost:4000/.well-known/mcp-config
   ```

2. **Wrong Port**
   - Default port: 4000 (for src/index.ts)
   - HTTP server port: 7123 (for src/http-server.ts)
   - Check your PORT environment variable

3. **CORS Issues**
   - The endpoint includes CORS headers
   - Verify with: `curl -H "Origin: https://smithery.ai" -v http://localhost:4000/.well-known/mcp-config`

4. **Smithery Configuration Mismatch**
   - Ensure `smithery.yaml` points to the correct entry point
   - For Smithery: Use `src/http-server.ts` (port 7123)
   - For general use: Use `src/index.ts` (port 4000)

### Issue: Configuration Schema Not Recognized

**Solution**: Verify the schema matches JSON Schema draft-07:
```json
{
  "configuration": {
    "type": "object",
    "required": ["hassToken"],
    "properties": {
      "hassToken": {
        "type": "string",
        "title": "Home Assistant Token",
        "description": "...",
        "sensitive": true
      }
    }
  }
}
```

## Testing Locally

### Test with the Main Server (Express)
```bash
# Terminal 1: Start the server
bun run src/index.ts

# Terminal 2: Test the endpoint
curl http://localhost:4000/.well-known/mcp-config | jq
```

### Test with FastMCP HTTP Server (Smithery Mode)
```bash
# Terminal 1: Start the FastMCP server
bun run src/http-server.ts

# Terminal 2: Test (Note: FastMCP doesn't serve .well-known by default)
curl http://localhost:7123/mcp
```

**Note**: The FastMCP server (`src/http-server.ts`) is designed for MCP protocol communication and doesn't serve the `.well-known` endpoint. Smithery handles discovery differently for container-based deployments.

## Smithery CLI Commands

```bash
# Install Smithery CLI
npm install -g @smithery/cli

# Build for Smithery
npm run smithery:build

# Test locally with Smithery
npm run smithery:dev

# Publish to Smithery
npx @smithery/cli publish
```

## Container Runtime vs Direct Runtime

### Container Runtime (Current Configuration)
- Smithery builds and deploys your Docker container
- Configuration comes from `smithery.yaml`
- Discovery handled by Smithery's infrastructure
- **You don't need to expose `.well-known` yourself**

### Direct Runtime (TypeScript/Python)
- Smithery CLI builds your code
- You must expose `.well-known/mcp-config`
- Requires the endpoint to be implemented in your HTTP server

## Environment Variables for Smithery

When deploying on Smithery, these environment variables are set from user configuration:

```bash
HASS_TOKEN=<user-provided>
HASS_HOST=<user-provided or default>
HASS_SOCKET_URL=<user-provided or default>
PORT=<smithery-assigned>
DEBUG=<user-provided or false>
NODE_ENV=production
```

## Verification Checklist

Before publishing to Smithery:

- [ ] `smithery.yaml` is properly configured
- [ ] Docker image builds successfully: `docker build -t test-mcp .`
- [ ] Server starts in container: `docker run -p 7123:7123 test-mcp`
- [ ] MCP endpoint responds: `curl http://localhost:7123/mcp`
- [ ] `.well-known/mcp-config` is in `public/` directory
- [ ] Express server serves the discovery endpoint (for non-container deployments)
- [ ] All required environment variables are documented in `smithery.yaml`

## Additional Resources

- [Smithery Documentation](https://smithery.ai/docs)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP Discovery RFC](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/1147)
- [Smithery Session Config](https://smithery.ai/docs/build/session-config)

## Support

If you continue to have issues:

1. Check Smithery build logs
2. Verify your `smithery.yaml` configuration
3. Test locally with Docker
4. Review Smithery's deployment documentation for container-based MCPs

For container-based deployments (which is what we're using), Smithery handles the discovery protocol internally. The `.well-known/mcp-config` file we created serves as documentation and for potential future external hosting scenarios.
