# Troubleshooting Guide

Common issues and solutions for the Home Assistant MCP server.

## Connection Issues

### Cannot Connect to Home Assistant

**Symptoms:**
- Connection timeout errors
- "Failed to connect" messages

**Solutions:**
1. Verify your Home Assistant URL is correct and accessible
2. Check that Home Assistant is running
3. Ensure firewall rules allow connections
4. Try accessing the URL in a web browser

### Authentication Failures

**Symptoms:**
- 401 Unauthorized errors
- "Invalid token" messages

**Solutions:**
1. Verify your long-lived access token is correct
2. Check that the token hasn't expired or been revoked
3. Create a new long-lived access token in Home Assistant
4. Ensure the token has the necessary permissions

## Server Issues

### Server Won't Start

**Symptoms:**
- Port already in use errors
- Module not found errors

**Solutions:**
1. Check if another process is using the configured port
2. Run `bun install` to ensure all dependencies are installed
3. Verify Bun version is 1.0.26 or higher: `bun --version`
4. Check for syntax errors in your `.env` file

### MCP Client Can't Detect Server

**Symptoms:**
- Server not appearing in Claude Desktop/Cursor
- "Server not found" errors

**Solutions:**
1. Verify the server is running in stdio mode
2. Check MCP client configuration file
3. Restart the MCP client application
4. Review server logs for startup errors

## Performance Issues

### Slow Response Times

**Solutions:**
1. Check network latency to Home Assistant
2. Verify Home Assistant isn't overloaded
3. Enable caching if available
4. Check debug logs for bottlenecks

### High Memory Usage

**Solutions:**
1. Restart the server periodically
2. Check for memory leaks in logs
3. Reduce concurrent requests
4. Update to latest version

## Common Errors

### SSL/HTTPS Errors

If you're using HTTPS for Home Assistant:
1. Ensure your certificate is valid
2. Try using `rejectUnauthorized: false` for self-signed certificates (not recommended for production)
3. Install the certificate authority on your system

### Rate Limiting

If you're hitting rate limits:
1. Increase `RATE_LIMIT_MAX` in your configuration
2. Increase `RATE_LIMIT_WINDOW` to allow more time
3. Reduce the frequency of requests

## Getting More Help

If you're still experiencing issues:

1. Check the [FAQ](FAQ.md) for common questions
2. Review the [Configuration Guide](CONFIGURATION.md) for setup details
3. Enable debug mode: `DEBUG=true` in your `.env` file
4. Check server logs for detailed error messages
5. Open an issue on [GitHub](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues)
