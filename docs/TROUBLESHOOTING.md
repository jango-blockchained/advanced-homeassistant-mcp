# 🔧 Troubleshooting Guide

Comprehensive troubleshooting guide for Home Assistant MCP server. Find solutions to common issues and learn how to diagnose problems.

## 📋 Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Connection Problems](#connection-problems)
- [Authentication Errors](#authentication-errors)
- [Command Failures](#command-failures)
- [Performance Issues](#performance-issues)
- [AI Assistant Integration](#ai-assistant-integration)
- [Docker Issues](#docker-issues)
- [Advanced Debugging](#advanced-debugging)

---

## Quick Diagnostics

### Health Check Checklist

Run through this checklist to identify issues:

- [ ] **Home Assistant is running and accessible**
  ```bash
  curl http://192.168.1.100:8123/api/
  ```
  
- [ ] **Access token is valid**
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" http://192.168.1.100:8123/api/
  ```
  
- [ ] **MCP server is installed**
  ```bash
  homeassistant-mcp --version
  # or
  npx @jango-blockchained/homeassistant-mcp --version
  ```
  
- [ ] **Environment variables are set**
  ```bash
  echo $HOME_ASSISTANT_URL
  echo $HOME_ASSISTANT_TOKEN
  ```
  
- [ ] **AI assistant recognizes MCP server**
  - Check MCP server status in your AI assistant
  - Look for 🔌 icon or MCP indicator

### Common Error Messages

| Error | Quick Fix |
|-------|-----------|
| `Cannot connect to Home Assistant` | Check URL and network connectivity |
| `401 Unauthorized` | Verify access token |
| `Entity not found` | Check entity ID spelling |
| `Command not found` | Reinstall or check PATH |
| `MCP server not detected` | Restart AI assistant |

---

## Installation Issues

### Problem: `command not found: bun`

**Symptoms:**
```bash
$ bun --version
bash: bun: command not found
```

**Solution:**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.bun/bin:$PATH"

# Reload shell
source ~/.bashrc  # or source ~/.zshrc

# Verify
bun --version
```

### Problem: `command not found: npx`

**Symptoms:**
```bash
$ npx --version
bash: npx: command not found
```

**Solution:**
```bash
# Install Node.js (includes npx)
# macOS
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# Download from https://nodejs.org/

# Verify
npx --version
```

### Problem: `EACCES: permission denied`

**Symptoms:**
```bash
npm install -g @jango-blockchained/homeassistant-mcp
# Error: EACCES: permission denied
```

**Solution 1 - Fix npm permissions (Recommended):**
```bash
# Create directory for global packages
mkdir ~/.npm-global

# Configure npm to use new directory
npm config set prefix '~/.npm-global'

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH=~/.npm-global/bin:$PATH

# Reload and retry
source ~/.bashrc
npm install -g @jango-blockchained/homeassistant-mcp
```

**Solution 2 - Use sudo (Not recommended):**
```bash
sudo npm install -g @jango-blockchained/homeassistant-mcp
```

**Solution 3 - Use Bunx (No global install needed):**
```bash
bunx github:jango-blockchained/advanced-homeassistant-mcp
```

### Problem: Docker image pull failed

**Symptoms:**
```bash
$ docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest
Error: pull access denied
```

**Solution:**
```bash
# Image is public, no authentication needed
# If issue persists, try:

# Clear Docker cache
docker system prune -a

# Pull again
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest

# Or use full image URL
docker pull ghcr.io/jango-blockchained/advanced-homeassistant-mcp:1.1.0
```

### Problem: Build fails from source

**Symptoms:**
```bash
$ bun run build:all
# Various TypeScript or build errors
```

**Solution:**
```bash
# Clean and rebuild
bun run clean
rm -rf node_modules bun.lock
bun install
bun run build:all

# If still failing, check Node/Bun version
bun --version  # Should be >= 1.0.26

# Update Bun
bun upgrade
```

---

## Connection Problems

### Problem: Cannot connect to Home Assistant

**Symptoms:**
```
Error: Cannot connect to Home Assistant at http://192.168.1.100:8123
Connection refused or timed out
```

**Diagnosis:**
```bash
# 1. Check if Home Assistant is running
curl http://192.168.1.100:8123/api/

# 2. Check from MCP server host
# (run on the same machine as MCP server)
ping 192.168.1.100
telnet 192.168.1.100 8123

# 3. Check firewall
sudo ufw status  # Linux
# or check Windows Firewall settings
```

**Solutions:**

**Solution 1 - Correct URL:**
```env
# Wrong
HOME_ASSISTANT_URL=192.168.1.100:8123

# Correct
HOME_ASSISTANT_URL=http://192.168.1.100:8123
```

**Solution 2 - Use correct hostname:**
```env
# Try different addressing methods
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_URL=http://hostname:8123
```

**Solution 3 - Check Docker networking:**
```bash
# If both in Docker, use Docker network
docker network create homeassistant
docker run --network=homeassistant ...

# Or use host.docker.internal (macOS/Windows)
HOME_ASSISTANT_URL=http://host.docker.internal:8123
```

**Solution 4 - Firewall rules:**
```bash
# Allow port 8123
sudo ufw allow 8123  # Linux
# Or configure Windows Firewall
```

### Problem: SSL/HTTPS connection errors

**Symptoms:**
```
Error: unable to verify the first certificate
Error: self signed certificate
```

**Solutions:**

**Solution 1 - Use HTTP if on local network:**
```env
HOME_ASSISTANT_URL=http://192.168.1.100:8123
```

**Solution 2 - Disable SSL verification (development only):**
```env
NODE_TLS_REJECT_UNAUTHORIZED=0  # ⚠️ Not for production!
```

**Solution 3 - Add certificate to trust store:**
```bash
# Linux
sudo cp cert.pem /usr/local/share/ca-certificates/homeassistant.crt
sudo update-ca-certificates

# macOS
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.pem
```

**Solution 4 - Use Nabu Casa URL:**
```env
HOME_ASSISTANT_URL=https://abcdef12345.ui.nabu.casa
```

### Problem: Intermittent disconnections

**Symptoms:**
- Connection works sometimes, fails others
- "Connection timeout" errors
- Slow responses

**Solutions:**

**Solution 1 - Increase timeout:**
```env
REQUEST_TIMEOUT=60  # Increase from default 30
CONNECTION_TIMEOUT=10  # Seconds
```

**Solution 2 - Check network stability:**
```bash
# Ping test
ping -c 100 192.168.1.100

# Look for packet loss or high latency
```

**Solution 3 - Reduce load:**
```env
CONNECTION_POOL_SIZE=5  # Reduce concurrent connections
CACHE_ENABLED=true      # Enable caching
CACHE_TTL=60           # Cache for 1 minute
```

---

## Authentication Errors

### Problem: 401 Unauthorized

**Symptoms:**
```
Error: 401 Unauthorized
Invalid authentication
```

**Solutions:**

**Solution 1 - Verify token:**
```bash
# Test token directly
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://192.168.1.100:8123/api/ | jq

# Should return: {"message": "API running."}
```

**Solution 2 - Create new token:**
1. Home Assistant → Profile
2. Long-Lived Access Tokens → Create Token
3. Copy new token
4. Update .env file
5. Restart MCP server

**Solution 3 - Check token format:**
```env
# Wrong - extra quotes
HOME_ASSISTANT_TOKEN="eyJ0eXAiOiJKV1Qi..."

# Wrong - extra Bearer
HOME_ASSISTANT_TOKEN=Bearer eyJ0eXAiOiJKV1Qi...

# Correct
HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1Qi...
```

**Solution 4 - Ensure token hasn't expired:**
- Long-lived tokens don't expire by default
- But can be revoked in Home Assistant
- Check Profile → Long-Lived Access Tokens

### Problem: Token works in curl but not in MCP

**Diagnosis:**
```bash
# Test with exact same environment variables
source .env
echo "URL: $HOME_ASSISTANT_URL"
echo "Token: ${HOME_ASSISTANT_TOKEN:0:20}..."  # First 20 chars

curl -H "Authorization: Bearer $HOME_ASSISTANT_TOKEN" \
  "$HOME_ASSISTANT_URL/api/"
```

**Solutions:**

**Solution 1 - Check .env is loaded:**
```bash
# Verify environment variables are loaded
homeassistant-mcp --show-config
```

**Solution 2 - Use explicit environment file:**
```bash
# Specify env file
homeassistant-mcp --env-file /path/to/.env
```

**Solution 3 - Check for special characters:**
```env
# Token might contain characters that need escaping
# Use single quotes or escape special chars
HOME_ASSISTANT_TOKEN='eyJ0eXAiOiJKV1Qi...$pecial'
```

---

## Command Failures

### Problem: "Entity not found"

**Symptoms:**
```
Error: Entity light.living_room not found
```

**Solutions:**

**Solution 1 - List available entities:**
```
Ask AI: "List all lights"
# or
"Show me all my devices"
```

**Solution 2 - Check entity ID:**
```bash
# Via Home Assistant API
curl -H "Authorization: Bearer TOKEN" \
  http://192.168.1.100:8123/api/states | jq '.[].entity_id'

# Look for correct entity ID format:
# light.living_room  ✓
# lights.living_room ✗
# light_living_room  ✗
```

**Solution 3 - Entity might be unavailable:**
```
Ask AI: "Find unavailable entities"
# or
"Check device health"
```

### Problem: Command executes but nothing happens

**Symptoms:**
- Command returns success
- But device doesn't respond

**Diagnosis:**
```
# Check current state
Ask AI: "What's the state of light.living_room?"

# Check if device is available
Ask AI: "Is light.living_room available?"
```

**Solutions:**

**Solution 1 - Device might be offline:**
- Check device power
- Check network connection
- Check Home Assistant device status

**Solution 2 - Check Home Assistant automation:**
- Device might have automation override
- Check Home Assistant logs

**Solution 3 - Test directly in Home Assistant:**
- Open Home Assistant UI
- Try controlling device manually
- Check for errors

### Problem: "Permission denied" or "Forbidden"

**Symptoms:**
```
Error: 403 Forbidden
Access denied for this operation
```

**Solutions:**

**Solution 1 - Check token permissions:**
- Create new token with full permissions
- Ensure token is from admin user

**Solution 2 - Check Home Assistant user:**
- Token must be from user with appropriate permissions
- Check User settings in Home Assistant

---

## Performance Issues

### Problem: Slow response times

**Symptoms:**
- Commands take >10 seconds
- Timeouts occur frequently

**Solutions:**

**Solution 1 - Enable caching:**
```env
CACHE_ENABLED=true
CACHE_TTL=60
CACHE_MAX_SIZE=100
```

**Solution 2 - Increase timeout:**
```env
REQUEST_TIMEOUT=60
```

**Solution 3 - Check network latency:**
```bash
ping -c 10 192.168.1.100
# Look for high latency (>100ms)
```

**Solution 4 - Optimize connection pool:**
```env
CONNECTION_POOL_SIZE=10
CONNECTION_KEEP_ALIVE=true
```

### Problem: High memory usage

**Symptoms:**
```bash
$ docker stats  # or top/htop
# Shows high memory usage
```

**Solutions:**

**Solution 1 - Limit cache size:**
```env
CACHE_MAX_SIZE=50  # Reduce from 100MB
```

**Solution 2 - Disable unnecessary features:**
```env
EVENT_STREAMING_ENABLED=false
HISTORY_CACHE_ENABLED=false
```

**Solution 3 - Set memory limit (Docker):**
```bash
docker run --memory=512m ...
```

---

## AI Assistant Integration

### Problem: MCP server not detected

**Symptoms:**
- AI assistant doesn't show MCP server
- No 🔌 icon or MCP indicator

**Solutions:**

**Solution 1 - Restart AI assistant:**
- Completely quit and restart
- Not just close window
- Clear cache if option available

**Solution 2 - Check configuration file:**

**Claude Desktop:**
```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows
type %APPDATA%\Claude\claude_desktop_config.json

# Linux
cat ~/.config/Claude/claude_desktop_config.json
```

**Solution 3 - Verify JSON syntax:**
```bash
# Use JSON validator
cat claude_desktop_config.json | jq
# Should show no errors
```

**Solution 4 - Check file permissions:**
```bash
# Config file should be readable
ls -l claude_desktop_config.json
chmod 644 claude_desktop_config.json
```

### Problem: "Server failed to start"

**Symptoms:**
```
MCP Server Error: Failed to start homeassistant-mcp
```

**Solutions:**

**Solution 1 - Check server manually:**
```bash
# Run server directly to see errors
npx @jango-blockchained/homeassistant-mcp
# or
homeassistant-mcp
```

**Solution 2 - Check logs:**

**Claude Desktop logs:**
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows
type %APPDATA%\Claude\Logs\mcp*.log
```

**Solution 3 - Simplify configuration:**
```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "npx",
      "args": ["@jango-blockchained/homeassistant-mcp@latest"],
      "env": {
        "HOME_ASSISTANT_URL": "http://192.168.1.100:8123",
        "HOME_ASSISTANT_TOKEN": "your_token"
      }
    }
  }
}
```

---

## Docker Issues

### Problem: Container exits immediately

**Symptoms:**
```bash
$ docker ps -a
# Shows container with status "Exited (1)"
```

**Solutions:**

**Solution 1 - Check logs:**
```bash
docker logs homeassistant-mcp
# Look for error messages
```

**Solution 2 - Verify environment variables:**
```bash
docker inspect homeassistant-mcp | jq '.[].Config.Env'
```

**Solution 3 - Run interactively:**
```bash
docker run -it --rm \
  -e HOME_ASSISTANT_URL=http://192.168.1.100:8123 \
  -e HOME_ASSISTANT_TOKEN=your_token \
  ghcr.io/jango-blockchained/advanced-homeassistant-mcp:latest \
  /bin/sh

# Then manually run server to see errors
```

### Problem: Cannot access from host

**Symptoms:**
- Container running
- Can't access from host machine

**Solutions:**

**Solution 1 - Check port mapping:**
```bash
docker ps
# Look for port mapping (0.0.0.0:4000->4000/tcp)

# If missing, recreate with port mapping
docker run -p 4000:4000 ...
```

**Solution 2 - Test from inside container:**
```bash
docker exec homeassistant-mcp curl localhost:4000/api/health
```

**Solution 3 - Check firewall:**
```bash
# Test connectivity
curl localhost:4000/api/health
curl 127.0.0.1:4000/api/health
curl host-ip:4000/api/health
```

---

## Advanced Debugging

### Enable Debug Logging

```env
# .env file
DEBUG=true
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

Or temporarily:
```bash
DEBUG=true LOG_LEVEL=debug homeassistant-mcp
```

### Capture Network Traffic

```bash
# Monitor HTTP requests
tcpdump -i any -A 'port 8123'

# Or use mitmproxy
mitmproxy --mode reverse:http://192.168.1.100:8123
```

### Check Server Status

```bash
# If HTTP mode is enabled
curl http://localhost:4000/api/health

# Expected response:
{
  "status": "ok",
  "version": "1.1.0",
  "homeAssistant": {
    "connected": true,
    "version": "2024.1.0"
  }
}
```

### Test Home Assistant API Directly

```bash
# Test authentication
curl -H "Authorization: Bearer $HA_TOKEN" \
  $HA_URL/api/ | jq

# List all entities
curl -H "Authorization: Bearer $HA_TOKEN" \
  $HA_URL/api/states | jq '.[].entity_id'

# Get specific entity
curl -H "Authorization: Bearer $HA_TOKEN" \
  $HA_URL/api/states/light.living_room | jq

# Call service
curl -X POST \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}' \
  $HA_URL/api/services/light/turn_on | jq
```

### Debugging with Node Inspector

```bash
# Start with inspector
node --inspect dist/index.js

# Or with Bun
bun --inspect src/index.ts

# Connect with Chrome DevTools
# chrome://inspect
```

### Common Log Messages

| Log Message | Meaning | Action |
|------------|---------|---------|
| `Connected to Home Assistant` | ✅ Connection successful | None needed |
| `Failed to connect` | ❌ Connection failed | Check URL/network |
| `Invalid token` | ❌ Auth failed | Check token |
| `Rate limit exceeded` | ⚠️ Too many requests | Wait or adjust limits |
| `Entity not found` | ⚠️ Bad entity ID | Check spelling |

---

## Getting Additional Help

### Collect Information

Before requesting help, gather:

1. **Version information:**
   ```bash
   homeassistant-mcp --version
   bun --version  # or node --version
   ```

2. **Configuration (sanitized):**
   ```bash
   # Remove sensitive data!
   cat .env | grep -v TOKEN
   ```

3. **Logs:**
   ```bash
   tail -100 logs/homeassistant-mcp.log
   ```

4. **Error message:**
   - Full error text
   - Stack trace if available

5. **System information:**
   ```bash
   uname -a  # Linux/macOS
   # or systeminfo on Windows
   ```

### Where to Get Help

- 💬 [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions) - Ask questions
- 🐛 [Issue Tracker](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues) - Report bugs
- 📖 [Documentation](index.md) - Browse all docs
- 🏠 [Home Assistant Community](https://community.home-assistant.io/) - HA-specific help

### Issue Template

When reporting issues:

```markdown
**Describe the bug**
A clear description of what's wrong.

**To Reproduce**
Steps to reproduce:
1. Do this
2. Then this
3. Error occurs

**Expected behavior**
What should happen instead.

**Environment**
- OS: [e.g., macOS 14.0]
- MCP Version: [e.g., 1.1.0]
- Runtime: [e.g., Bun 1.0.26]
- HA Version: [e.g., 2024.1.0]

**Logs**
```
Paste relevant logs here
```

**Configuration**
```env
# Sanitized config (remove tokens!)
HOME_ASSISTANT_URL=http://...
```
```

---

**Still stuck?** Don't hesitate to ask for help in [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)!
