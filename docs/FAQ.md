# ❓ Frequently Asked Questions (FAQ)

Common questions and answers about Home Assistant MCP server.

## 📋 Table of Contents

- [General Questions](#general-questions)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Performance](#performance)
- [Security](#security)
- [Development](#development)

---

## General Questions

### What is Home Assistant MCP?

Home Assistant MCP is a Model Context Protocol (MCP) server that enables AI assistants like Claude, GPT-4, and Cursor to control your Home Assistant smart home through natural language commands.

### What can I do with it?

You can:
- Control lights, climate, media players, and other devices
- Trigger automations and scenes
- Monitor your home's status
- Analyze energy usage
- Get smart home maintenance insights
- Create complex automation workflows

### Which AI assistants are supported?

- ✅ Claude Desktop
- ✅ Cursor IDE
- ✅ VS Code with MCP extension
- ✅ Any MCP-compatible client

### Do I need programming knowledge?

No! Users can interact through natural language with their AI assistant. However, developers can extend the functionality with TypeScript knowledge.

### Is it free?

Yes! Home Assistant MCP is open-source under the MIT license. Free to use, modify, and distribute.

### What's the difference between this and Home Assistant's built-in AI?

Home Assistant has voice assistants and conversation features. This MCP server:
- Works with external AI assistants (Claude, GPT, etc.)
- Provides deeper integration through MCP protocol
- Offers additional smart features (maintenance, scenarios)
- Enables natural language control from your preferred AI

---

## Installation & Setup

### Which installation method should I choose?

**Smithery** (Recommended for beginners):
- Easiest setup
- GUI configuration
- Automatic updates

**NPX** (Quick testing):
- No installation needed
- Run once or temporarily
- Good for trying it out

**Docker** (Production):
- Isolated environment
- Easy updates
- Good for servers

**From Source** (Developers):
- Latest features
- Customization
- Contributing

See [Installation Guide](INSTALLATION.md) for details.

### Do I need Bun or can I use Node.js?

**Bun is recommended** for:
- 4x faster performance
- Built-in TypeScript support
- Better developer experience

**Node.js works fine** for:
- Compatibility
- Standard deployments
- CI/CD pipelines

Both are fully supported!

### Can I run this on a Raspberry Pi?

Yes! Use Node.js method:
```bash
npm install -g @jango-blockchained/homeassistant-mcp
homeassistant-mcp
```

Bun support for ARM is improving but Node.js is more reliable on Pi.

### How do I get a Home Assistant access token?

1. Open Home Assistant
2. Click your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Name it (e.g., "MCP Server")
6. Copy the token immediately

See [Getting Started](GETTING_STARTED.md#2--long-lived-access-token) for details.

### Can I use this with Home Assistant Cloud (Nabu Casa)?

Yes! Use your Nabu Casa URL:
```env
HOME_ASSISTANT_URL=https://abcdef12345.ui.nabu.casa
HOME_ASSISTANT_TOKEN=your_token
```

### Does this work with HTTPS/SSL Home Assistant?

Yes! Just use the `https://` URL:
```env
HOME_ASSISTANT_URL=https://homeassistant.local:8123
```

For self-signed certificates, see [Troubleshooting](TROUBLESHOOTING.md#ssl-https-connection-errors).

---

## Configuration

### Where do I put configuration?

Create a `.env` file in your project directory:
```env
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=your_token
```

See [Configuration Guide](CONFIGURATION.md) for all options.

### Can I use environment variables instead of .env file?

Yes! Export variables in your shell:
```bash
export HOME_ASSISTANT_URL=http://192.168.1.100:8123
export HOME_ASSISTANT_TOKEN=your_token
homeassistant-mcp
```

### How do I change the log level?

```env
LOG_LEVEL=debug  # Options: error, warn, info, debug, trace
```

Or temporarily:
```bash
LOG_LEVEL=debug homeassistant-mcp
```

### Can I disable rate limiting?

For development:
```env
RATE_LIMIT_ENABLED=false
```

For production, adjust limits:
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### How do I enable caching?

```env
CACHE_ENABLED=true
CACHE_TTL=60
CACHE_MAX_SIZE=100
```

See [Performance Guide](PERFORMANCE.md) for optimization tips.

---

## Usage

### How do I control my lights?

Ask your AI assistant:
```
"Turn on the living room lights"
"Set bedroom lights to 50% brightness"
"Make the kitchen lights warm white"
```

### Can I control multiple devices at once?

Yes! Examples:
```
"Turn off all lights in the house"
"Set all thermostats to 72°F"
"Close all blinds"
```

### How do I create automations?

Ask your AI:
```
"Create an automation that turns on lights at sunset"
"Set up a morning routine at 7 AM"
```

The AI will use the automation tools to create it for you.

### Can I trigger existing automations?

Yes:
```
"Trigger my morning routine"
"Run the bedtime automation"
"Activate vacation mode"
```

### How do I activate scenes?

```
"Activate the movie scene"
"Turn on dinner mode"
"Set the house to evening scene"
```

### What's the difference between a scene and an automation?

- **Scene**: Instant state snapshot (lights, climate, etc.)
- **Automation**: Triggered actions with conditions and logic

### How do I check my home's status?

```
"What's the temperature in the living room?"
"Which lights are on?"
"Is my garage door closed?"
"Show me all unavailable devices"
```

### Can I get energy usage information?

Yes! Use smart scenarios:
```
"Analyze my energy consumption"
"Show me my energy usage"
"Which devices use the most power?"
```

### How do I find broken or offline devices?

```
"Check the health of my smart home"
"Find unavailable devices"
"Show me offline sensors"
```

---

## Troubleshooting

### Why can't my AI assistant see the MCP server?

**Try these steps**:
1. Restart your AI assistant completely
2. Check configuration file syntax
3. Verify server is running
4. Check logs for errors

See [Troubleshooting Guide](TROUBLESHOOTING.md#mcp-server-not-detected).

### Why do I get "Cannot connect to Home Assistant"?

**Common causes**:
- Wrong URL (missing `http://`)
- Home Assistant not running
- Network issue
- Firewall blocking

**Solution**:
```bash
# Test connection
curl http://192.168.1.100:8123/api/
```

See [Troubleshooting Guide](TROUBLESHOOTING.md#connection-problems).

### Why do I get "401 Unauthorized"?

**Causes**:
- Invalid token
- Expired token
- Token revoked

**Solution**:
Create a new token and update `.env` file.

See [Troubleshooting Guide](TROUBLESHOOTING.md#authentication-errors).

### Why are responses slow?

**Possible causes**:
- Network latency to Home Assistant
- Cache disabled
- Large entity database

**Solutions**:
```env
# Enable caching
CACHE_ENABLED=true
CACHE_TTL=60

# Increase timeout
REQUEST_TIMEOUT=60
```

See [Performance Guide](PERFORMANCE.md).

### How do I see debug logs?

```env
DEBUG=true
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

Or temporarily:
```bash
DEBUG=true LOG_LEVEL=debug homeassistant-mcp
```

### Where are the logs stored?

Default location: `./logs/homeassistant-mcp.log`

Configure with:
```env
LOG_FILE=/path/to/logfile.log
```

---

## Performance

### How can I make it faster?

1. **Enable caching**:
   ```env
   CACHE_ENABLED=true
   CACHE_TTL=60
   ```

2. **Use Bun runtime**:
   ```bash
   bun run start:stdio
   ```

3. **Optimize connection pool**:
   ```env
   CONNECTION_POOL_SIZE=10
   CONNECTION_KEEP_ALIVE=true
   ```

4. **Run closer to Home Assistant**:
   - Same network
   - Same machine if possible

See [Performance Guide](PERFORMANCE.md).

### What's the memory usage?

Typical usage:
- Base: ~50-100 MB
- With cache: ~100-200 MB
- Peak: ~300 MB

### Can I limit memory usage?

With Docker:
```bash
docker run --memory=512m ...
```

With configuration:
```env
CACHE_MAX_SIZE=50  # MB
```

### How many requests can it handle?

Default rate limits:
- 100 requests per 15 minutes per client
- Configurable per your needs

For high traffic:
```env
RATE_LIMIT_MAX=500
CONNECTION_POOL_SIZE=25
```

---

## Security

### Is it secure?

Yes! Security features:
- ✅ Token-based authentication
- ✅ Input sanitization
- ✅ Rate limiting
- ✅ Security headers
- ✅ HTTPS support

See [Security Guide](SECURITY.md).

### How do I secure the MCP server?

1. **Use HTTPS**:
   ```env
   HTTPS_ENABLED=true
   SSL_CERT_PATH=/path/to/cert.pem
   SSL_KEY_PATH=/path/to/key.pem
   ```

2. **Enable rate limiting**:
   ```env
   RATE_LIMIT_ENABLED=true
   RATE_LIMIT_MAX=50
   ```

3. **Rotate tokens regularly**

4. **Use strong JWT secret**:
   ```env
   JWT_SECRET=long-random-string-min-32-chars
   ```

### Should I expose this to the internet?

**Not recommended** unless:
- Using HTTPS
- Strong authentication
- Rate limiting enabled
- Behind reverse proxy
- Regular security updates

**Better option**: Use VPN to access home network.

### How do I protect my Home Assistant token?

1. **Never commit to git**:
   ```bash
   # Add to .gitignore
   .env
   .env.*
   ```

2. **Use environment variables**

3. **Rotate periodically**

4. **Use separate token** (not admin token if possible)

5. **Revoke if compromised**

### Can I restrict which devices can be controlled?

Not directly in MCP server. Use Home Assistant:
- Create restricted user
- Assign limited permissions
- Use that user's token

---

## Development

### How do I contribute?

See [Contributing Guide](CONTRIBUTING.md)!

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

### How do I add a new tool?

See [Development Guide](DEVELOPMENT.md#adding-a-new-tool):

1. Create tool file
2. Extend `BaseTool`
3. Implement `execute` method
4. Register tool
5. Add tests
6. Update docs

### How do I run tests?

```bash
# All tests
bun test

# Specific test
bun test __tests__/unit/tools/lights.test.ts

# With coverage
bun test --coverage

# Watch mode
bun test --watch
```

### How do I debug the server?

**VS Code**:
1. Set breakpoints
2. Press F5
3. Select "Debug Bun"

**Command line**:
```bash
bun --inspect src/index.ts
# Open chrome://inspect
```

See [Development Guide](DEVELOPMENT.md#debugging).

### Can I extend the server with custom tools?

Yes! Create custom tools:

```typescript
import { BaseTool } from './base-tool';

export class MyCustomTool extends BaseTool {
  name = 'my_custom_tool';
  description = 'My custom functionality';
  
  async execute(params: any): Promise<any> {
    // Your logic here
  }
}
```

Register in `src/tools/index.ts`.

### How do I update dependencies?

```bash
# Check for updates
bun update

# Update specific package
bun update <package-name>

# Update all
bun update
```

---

## Advanced Topics

### Can I use this with multiple Home Assistant instances?

Not directly in one server instance. Options:

1. **Run multiple MCP servers** (one per HA instance)
2. **Use Home Assistant federation** (if available)
3. **Contribute multi-instance support**!

### Can I use Redis for caching?

Yes! Configure:
```env
CACHE_STRATEGY=redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password
```

See [Configuration Guide](CONFIGURATION.md#caching).

### How do I monitor the server?

**Health endpoint** (HTTP mode):
```bash
curl http://localhost:4000/api/health
```

**Logs**:
```bash
tail -f logs/homeassistant-mcp.log
```

**Metrics** (if enabled):
- Request count
- Response time
- Error rate
- Cache hit rate

### Can I run this in Kubernetes?

Yes! See [Docker Guide](DOCKER_GUIDE.md) for containerization, then:

1. Build Docker image
2. Create Kubernetes deployment
3. Configure with secrets
4. Expose via service

### How do I backup my configuration?

Backup these files:
- `.env` (configuration)
- `logs/` (optional)
- Custom tool code (if any)

Home Assistant handles device/automation backup.

### Can I use this with voice assistants?

Indirectly:
1. AI assistant receives voice input
2. AI assistant uses MCP to control HA
3. Response to user

Direct voice control uses HA's voice features.

---

## Support & Community

### Where can I get help?

- 💬 [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions) - Ask questions
- 🐛 [Issue Tracker](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues) - Report bugs
- 📖 [Documentation](index.md) - Browse docs
- 🏠 [Home Assistant Community](https://community.home-assistant.io/) - HA help

### How do I report bugs?

1. Check existing issues
2. Create new issue with template
3. Include:
   - Error message
   - Steps to reproduce
   - Environment details
   - Logs (sanitized)

### How can I request features?

1. Check existing feature requests
2. Create enhancement issue
3. Describe use case
4. Explain expected behavior

### Is there a roadmap?

Check:
- GitHub Project boards
- Milestones
- Issue labels (`enhancement`, `planned`)

### How can I stay updated?

- ⭐ Star the repository
- 👀 Watch for releases
- 📢 Follow GitHub discussions
- 📰 Check CHANGELOG.md

---

## Still Have Questions?

**Can't find your answer?**

1. Search [existing discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)
2. Check [issue tracker](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues)
3. Read [full documentation](index.md)
4. Ask in [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions/new)

We're here to help! 🚀
