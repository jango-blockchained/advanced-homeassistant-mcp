# ⚙️ Configuration Guide

Complete configuration reference for Home Assistant MCP server. Learn how to customize and optimize your setup.

## 📋 Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration File](#configuration-file)
- [Security Settings](#security-settings)
- [Performance Tuning](#performance-tuning)
- [Logging Configuration](#logging-configuration)
- [Transport Configuration](#transport-configuration)
- [Advanced Options](#advanced-options)

---

## Environment Variables

### Required Variables

These variables must be set for the server to function:

```env
# Home Assistant Connection
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
```

#### `HOME_ASSISTANT_URL`

**Description**: URL to your Home Assistant instance

**Format**: `http(s)://host:port`

**Examples**:
```env
# Local network
HOME_ASSISTANT_URL=http://192.168.1.100:8123

# mDNS/Avahi
HOME_ASSISTANT_URL=http://homeassistant.local:8123

# HTTPS with custom domain
HOME_ASSISTANT_URL=https://home.example.com

# Nabu Casa Cloud
HOME_ASSISTANT_URL=https://abcdef12345.ui.nabu.casa
```

**Validation**:
- Must start with `http://` or `https://`
- Must be accessible from the MCP server
- Port is typically 8123 for local installations

#### `HOME_ASSISTANT_TOKEN`

**Description**: Long-lived access token for authentication

**Format**: Long string of alphanumeric characters

**How to obtain**:
1. Home Assistant → Profile → Long-Lived Access Tokens
2. Click "Create Token"
3. Copy the token immediately (it won't be shown again)

**Security**:
- ⚠️ Never commit to version control
- ⚠️ Store securely (use secret management)
- ⚠️ Rotate periodically for security

---

### Optional Variables

#### Server Configuration

```env
# Server Port
PORT=3000
# Default: 3000
# Range: 1024-65535
# Used for HTTP transport mode

# Server Host
HOST=0.0.0.0
# Default: undefined (localhost only)
# Sets which hostname to bind the server to. Can be used to expose externally.

# Node Environment
NODE_ENV=production
# Options: development, production, test
# Default: production
# Affects logging, error handling, and performance

# Server Name
SERVER_NAME=homeassistant-mcp
# Default: homeassistant-mcp
# Used in logs and server identification
```

#### Logging

```env
# Log Level
LOG_LEVEL=info
# Options: error, warn, info, debug, trace
# Default: info
# Controls verbosity of logs

# Debug Mode
DEBUG=false
# Options: true, false
# Default: false
# Enables detailed debugging output

# Log Format
LOG_FORMAT=json
# Options: json, simple, pretty
# Default: json (production), pretty (development)

# Log File
LOG_FILE=./logs/homeassistant-mcp.log
# Default: ./logs/homeassistant-mcp.log
# Path to log file (created if doesn't exist)

# Log Rotation
LOG_ROTATION=true
# Options: true, false
# Default: true
# Enable daily log file rotation

# Max Log Files
LOG_MAX_FILES=14
# Default: 14 (2 weeks)
# Number of rotated log files to keep
```

#### Security

```env
# JWT Secret
JWT_SECRET=your-secret-key-here-min-32-chars
# Default: Generated randomly
# Used for JWT token signing
# Minimum 32 characters recommended

# Rate Limiting
RATE_LIMIT_ENABLED=true
# Options: true, false
# Default: true
# Enable request rate limiting

# Rate Limit Window (minutes)
RATE_LIMIT_WINDOW=15
# Default: 15
# Time window for rate limiting in minutes

# Rate Limit Max Requests
RATE_LIMIT_MAX=100
# Default: 100
# Maximum requests per window

# CORS Origins
CORS_ORIGINS=http://localhost:3000,https://example.com
# Default: * (all origins in development)
# Comma-separated list of allowed origins

# Enable HTTPS
HTTPS_ENABLED=false
# Options: true, false
# Default: false
# Enable HTTPS server (requires certificates)

# SSL Certificate
SSL_CERT_PATH=/path/to/cert.pem
# Path to SSL certificate file

# SSL Key
SSL_KEY_PATH=/path/to/key.pem
# Path to SSL private key file
```

#### Performance

```env
# Request Timeout (seconds)
REQUEST_TIMEOUT=30
# Default: 30
# Timeout for Home Assistant API requests

# Connection Pool Size
CONNECTION_POOL_SIZE=10
# Default: 10
# Number of concurrent connections to Home Assistant

# Cache Enabled
CACHE_ENABLED=true
# Options: true, false
# Default: true
# Enable response caching

# Cache TTL (seconds)
CACHE_TTL=60
# Default: 60
# Time-to-live for cached responses

# Max Cache Size (MB)
CACHE_MAX_SIZE=100
# Default: 100
# Maximum cache size in megabytes
```

#### Features

```env
# Enable AI Features
AI_FEATURES_ENABLED=true
# Options: true, false
# Default: true
# Enable AI-powered features

# Enable Smart Scenarios
SMART_SCENARIOS_ENABLED=true
# Options: true, false
# Default: true
# Enable smart scenario detection

# Enable Maintenance Tools
MAINTENANCE_TOOLS_ENABLED=true
# Options: true, false
# Default: true
# Enable maintenance and health check tools

# Enable Event Streaming
EVENT_STREAMING_ENABLED=true
# Options: true, false
# Default: true
# Enable Server-Sent Events (SSE) for real-time updates
```

---

## Configuration File

### Using .env File

**Location**: Root directory or custom path

**Example .env file**:
```env
# ============================================
# Home Assistant MCP Configuration
# ============================================

# ----------------
# Required Settings
# ----------------
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1Qi...

# ----------------
# Server Settings
# ----------------
PORT=3000
NODE_ENV=production
SERVER_NAME=homeassistant-mcp

# ----------------
# Logging
# ----------------
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=./logs/homeassistant-mcp.log
LOG_ROTATION=true
LOG_MAX_FILES=14

# ----------------
# Security
# ----------------
JWT_SECRET=my-super-secret-key-min-32-characters-long
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
CORS_ORIGINS=http://localhost:3000

# ----------------
# Performance
# ----------------
REQUEST_TIMEOUT=30
CONNECTION_POOL_SIZE=10
CACHE_ENABLED=true
CACHE_TTL=60
CACHE_MAX_SIZE=100

# ----------------
# Features
# ----------------
AI_FEATURES_ENABLED=true
SMART_SCENARIOS_ENABLED=true
MAINTENANCE_TOOLS_ENABLED=true
EVENT_STREAMING_ENABLED=true
```

### Multiple Environments

Create separate files for different environments:

**Development (.env.development)**:
```env
HOME_ASSISTANT_URL=http://localhost:8123
HOME_ASSISTANT_TOKEN=dev_token_here
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=true
CACHE_ENABLED=false
```

**Production (.env.production)**:
```env
HOME_ASSISTANT_URL=https://home.example.com
HOME_ASSISTANT_TOKEN=prod_token_here
NODE_ENV=production
LOG_LEVEL=info
DEBUG=false
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=true
```

**Load specific environment**:
```bash
# Development
NODE_ENV=development homeassistant-mcp

# Production
NODE_ENV=production homeassistant-mcp

# Or specify file
homeassistant-mcp --env-file .env.production
```

---

## Security Settings

### Authentication

**JWT Configuration**:
```env
# Generate strong secret
JWT_SECRET=$(openssl rand -base64 32)

# Set expiration
JWT_EXPIRATION=24h  # 24 hours
JWT_ALGORITHM=HS256  # HMAC SHA-256
```

### Rate Limiting

**Prevent API abuse**:
```env
# Standard configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=15        # 15 minutes
RATE_LIMIT_MAX=100          # 100 requests

# Strict configuration (high-security)
RATE_LIMIT_WINDOW=5         # 5 minutes
RATE_LIMIT_MAX=30           # 30 requests

# Relaxed configuration (development)
RATE_LIMIT_ENABLED=false    # Disable in dev
```

**Per-endpoint rate limits** (advanced):
```env
# Custom limits
RATE_LIMIT_TOOLS=50         # Tool execution
RATE_LIMIT_RESOURCES=100    # Resource access
RATE_LIMIT_AUTH=10          # Authentication attempts
```

### CORS Configuration

**Allow specific origins**:
```env
# Single origin
CORS_ORIGINS=https://example.com

# Multiple origins
CORS_ORIGINS=https://example.com,https://app.example.com,http://localhost:3000

# Allow all (development only)
CORS_ORIGINS=*

# Disable CORS
CORS_ENABLED=false
```

### HTTPS/SSL

**Enable secure connections**:
```env
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/homeassistant-mcp.crt
SSL_KEY_PATH=/etc/ssl/private/homeassistant-mcp.key

# Optional: CA bundle
SSL_CA_PATH=/etc/ssl/certs/ca-bundle.crt

# Cipher configuration
SSL_CIPHERS=ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384
```

**Generate self-signed certificate** (development):
```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

---

## Performance Tuning

### Connection Pooling

**Optimize Home Assistant connections**:
```env
# Default
CONNECTION_POOL_SIZE=10
CONNECTION_POOL_MAX_IDLE=5
CONNECTION_KEEP_ALIVE=true
CONNECTION_TIMEOUT=30000  # milliseconds

# High-traffic setup
CONNECTION_POOL_SIZE=25
CONNECTION_POOL_MAX_IDLE=10
CONNECTION_POOL_MIN_IDLE=5

# Low-resource setup
CONNECTION_POOL_SIZE=5
CONNECTION_POOL_MAX_IDLE=2
```

### Caching

**Response caching configuration**:
```env
# Enable caching
CACHE_ENABLED=true

# Cache strategies
CACHE_STRATEGY=memory  # Options: memory, redis
CACHE_TTL=60          # Default TTL in seconds
CACHE_MAX_SIZE=100    # Max cache size in MB

# Per-resource TTL
CACHE_TTL_STATES=30       # Entity states
CACHE_TTL_DEVICES=300     # Device list
CACHE_TTL_AREAS=3600      # Areas (rarely change)
```

**Redis caching** (advanced):
```env
CACHE_STRATEGY=redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_PREFIX=homeassistant-mcp:
```

### Request Optimization

```env
# Timeouts
REQUEST_TIMEOUT=30        # API request timeout
WEBSOCKET_TIMEOUT=60      # WebSocket timeout
SSE_TIMEOUT=300          # SSE connection timeout

# Batch processing
BATCH_REQUESTS=true       # Enable request batching
BATCH_SIZE=10            # Max requests per batch
BATCH_DELAY=100          # Delay in milliseconds

# Compression
COMPRESSION_ENABLED=true  # Enable response compression
COMPRESSION_LEVEL=6       # Compression level (1-9)
```

### Memory Management

```env
# Memory limits
MAX_MEMORY_MB=512         # Maximum memory usage
GARBAGE_COLLECTION=aggressive  # GC strategy

# Buffer sizes
MAX_REQUEST_SIZE=1mb      # Maximum request body size
MAX_RESPONSE_SIZE=10mb    # Maximum response size
```

---

## Logging Configuration

### Log Levels

**Choose appropriate verbosity**:

```env
# ERROR - Only errors
LOG_LEVEL=error
# Use for production with minimal logging

# WARN - Warnings and errors
LOG_LEVEL=warn
# Use for production with some diagnostics

# INFO - General information (default)
LOG_LEVEL=info
# Use for standard production

# DEBUG - Detailed debugging
LOG_LEVEL=debug
# Use for troubleshooting

# TRACE - Very detailed (all requests)
LOG_LEVEL=trace
# Use for development only
```

### Log Format

```env
# JSON (machine-readable)
LOG_FORMAT=json
# Output: {"level":"info","message":"Server started","timestamp":"2024-01-01T00:00:00.000Z"}

# Simple (human-readable)
LOG_FORMAT=simple
# Output: [INFO] 2024-01-01 00:00:00 - Server started

# Pretty (colored, development)
LOG_FORMAT=pretty
# Output: ✓ INFO  2024-01-01 00:00:00  Server started
```

### Log Rotation

```env
# Daily rotation
LOG_ROTATION=true
LOG_ROTATION_PATTERN=YYYY-MM-DD
LOG_MAX_FILES=14          # Keep 2 weeks

# Size-based rotation
LOG_ROTATION=true
LOG_MAX_SIZE=10m          # Rotate at 10MB
LOG_MAX_FILES=5           # Keep 5 files
```

### Log Output

```env
# File only
LOG_OUTPUT=file
LOG_FILE=./logs/homeassistant-mcp.log

# Console only
LOG_OUTPUT=console

# Both file and console
LOG_OUTPUT=both
LOG_FILE=./logs/homeassistant-mcp.log

# Syslog
LOG_OUTPUT=syslog
SYSLOG_HOST=localhost
SYSLOG_PORT=514
```

---

## Transport Configuration

### Standard I/O (stdio)

**Default for MCP clients**:
```env
TRANSPORT=stdio
# No additional configuration needed
```

### HTTP Server

**Enable HTTP API**:
```env
TRANSPORT=http
PORT=3000
HOST=0.0.0.0              # Listen on all interfaces
HTTPS_ENABLED=false

# With SSL
HTTPS_ENABLED=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### WebSocket

**Real-time bidirectional communication**:
```env
TRANSPORT=websocket
WS_PORT=3001
WS_PATH=/ws
WS_HEARTBEAT=30000        # Ping interval (ms)
WS_MAX_CONNECTIONS=100
```

### Server-Sent Events (SSE)

**One-way event streaming**:
```env
SSE_ENABLED=true
SSE_PATH=/api/events
SSE_HEARTBEAT=30000       # Keep-alive interval
SSE_MAX_CONNECTIONS=50
```

---

## Advanced Options

### Home Assistant Configuration

```env
# Custom API endpoints
HA_API_BASE=/api
HA_WS_BASE=/api/websocket

# Verify SSL certificates
HA_VERIFY_SSL=true

# Custom headers
HA_CUSTOM_HEADERS={"X-Custom":"value"}

# Timeout settings
HA_CONNECT_TIMEOUT=5000
HA_REQUEST_TIMEOUT=30000
HA_SOCKET_TIMEOUT=60000
```

### AI Features

```env
# AI model configuration
AI_MODEL=gpt-4            # AI model to use
AI_TEMPERATURE=0.7        # Response creativity
AI_MAX_TOKENS=2000        # Max response length

# OpenAI API (if using AI features)
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...

# Anthropic API (if using Claude features)
ANTHROPIC_API_KEY=sk-ant-...
```

### Feature Flags

**Enable/disable specific features**:
```env
# Smart features
FEATURE_SMART_SCENARIOS=true
FEATURE_MAINTENANCE=true
FEATURE_ENERGY_MONITORING=true

# Device controls
FEATURE_LIGHTS=true
FEATURE_CLIMATE=true
FEATURE_MEDIA=true
FEATURE_COVERS=true
FEATURE_LOCKS=true

# Automation
FEATURE_AUTOMATIONS=true
FEATURE_SCENES=true
FEATURE_SCRIPTS=true

# System
FEATURE_ADDONS=true
FEATURE_PACKAGES=true
FEATURE_HISTORY=true
```

### Experimental Features

```env
# ⚠️ Experimental - may change or break
EXPERIMENTAL_VOICE_CONTROL=false
EXPERIMENTAL_ML_PREDICTIONS=false
EXPERIMENTAL_AUTO_LEARNING=false
```

---

## Configuration Examples

### Home Network Setup

```env
# Typical home setup
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1Qi...
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=false
```

### Cloud/Remote Setup

```env
# Secure remote access
HOME_ASSISTANT_URL=https://home.example.com
HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1Qi...
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=50
LOG_LEVEL=warn
```

### Development Setup

```env
# Development configuration
HOME_ASSISTANT_URL=http://localhost:8123
HOME_ASSISTANT_TOKEN=dev_token
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DEBUG=true
CACHE_ENABLED=false
RATE_LIMIT_ENABLED=false
LOG_FORMAT=pretty
```

### High-Performance Setup

```env
# Optimized for performance
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=eyJ0eXAiOiJKV1Qi...
CONNECTION_POOL_SIZE=25
CACHE_ENABLED=true
CACHE_STRATEGY=redis
REDIS_URL=redis://localhost:6379
COMPRESSION_ENABLED=true
LOG_LEVEL=warn
```

---

## Validation

### Check Configuration

```bash
# Validate configuration
homeassistant-mcp --validate-config

# Show current configuration
homeassistant-mcp --show-config

# Test Home Assistant connection
homeassistant-mcp --test-connection
```

### Configuration Checker Script

Create `check-config.sh`:
```bash
#!/bin/bash

echo "Checking configuration..."

# Check required variables
if [ -z "$HOME_ASSISTANT_URL" ]; then
  echo "❌ HOME_ASSISTANT_URL is not set"
  exit 1
fi

if [ -z "$HOME_ASSISTANT_TOKEN" ]; then
  echo "❌ HOME_ASSISTANT_TOKEN is not set"
  exit 1
fi

# Test connection
echo "Testing Home Assistant connection..."
curl -s -H "Authorization: Bearer $HOME_ASSISTANT_TOKEN" \
  "$HOME_ASSISTANT_URL/api/" > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Configuration is valid"
else
  echo "❌ Cannot connect to Home Assistant"
  exit 1
fi
```

---

## Next Steps

- **[Security Guide](SECURITY.md)** - Security best practices
- **[Performance Guide](PERFORMANCE.md)** - Optimization tips
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues
- **[API Reference](API_REFERENCE.md)** - API documentation

---

**Need help?** See the [FAQ](FAQ.md) or [open an issue](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues).
