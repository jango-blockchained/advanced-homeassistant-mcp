[![MseeP Badge](https://mseep.net/pr/jango-blockchained-advanced-homeassistant-mcp-badge.jpg)](https://mseep.ai/app/jango-blockchained-advanced-homeassistant-mcp)

# Home Assistant Model Context Protocol (MCP)

A standardized protocol for AI assistants to interact with Home Assistant, providing a secure, typed, and extensible interface for controlling smart home devices.

## Overview

The Model Context Protocol (MCP) server acts as a bridge between AI models (like Claude, GPT, etc.) and Home Assistant, enabling AI assistants to:

- Execute commands on Home Assistant devices
- Retrieve information about the smart home
- Stream responses for long-running operations
- Validate parameters and inputs
- Provide consistent error handling

## Features

- **Modular Architecture** - Clean separation between transport, middleware, and tools
- **Typed Interface** - Fully TypeScript typed for better developer experience
- **Multiple Transports**:
  - **Standard I/O** (stdin/stdout) for CLI integration
  - **HTTP/REST API** with Server-Sent Events support for streaming
- **Middleware System** - Validation, logging, timeout, and error handling
- **Built-in Tools**:
  - Light control (brightness, color, etc.)
  - Climate control (thermostats, HVAC)
  - More to come...
- **Extensible Plugin System** - Easily add new tools and capabilities
- **Streaming Responses** - Support for long-running operations
- **Parameter Validation** - Using Zod schemas
- **Claude & Cursor Integration** - Ready-made utilities for AI assistants

## Getting Started

### Prerequisites

- Node.js 16+
- Home Assistant instance (or you can use the mock implementations for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/homeassistant-mcp.git

# Install dependencies 
cd homeassistant-mcp
npm install

# Build the project
npm run build
```

### Running the Server

```bash
# Start with standard I/O transport (for AI assistant integration)
npm start -- --stdio

# Start with HTTP transport (for API access)
npm start -- --http

# Start with both transports
npm start -- --stdio --http
```

### Configuration

Configure the server using environment variables or a `.env` file:

```dotenv
# Server configuration
PORT=3000
NODE_ENV=development

# Execution settings
EXECUTION_TIMEOUT=30000
STREAMING_ENABLED=true

# Transport settings
USE_STDIO_TRANSPORT=true
USE_HTTP_TRANSPORT=true

# Debug and logging
DEBUG_MODE=false
DEBUG_STDIO=false
DEBUG_HTTP=false
SILENT_STARTUP=false

# CORS settings
CORS_ORIGIN=*
```

## Architecture

The MCP server is built with a layered architecture:

1. **Transport Layer** - Handles communication protocols (stdio, HTTP)
2. **Middleware Layer** - Processes requests through a pipeline
3. **Tool Layer** - Implements specific functionality
4. **Resource Layer** - Manages stateful resources

### Tools

Tools are the primary way to add functionality to the MCP server. Each tool:

- Has a unique name
- Accepts typed parameters
- Returns typed results
- Can stream partial results
- Validates inputs and outputs

Example tool registration:

```typescript
import { LightsControlTool } from "./tools/homeassistant/lights.tool.js";
import { ClimateControlTool } from "./tools/homeassistant/climate.tool.js";

// Register tools
server.registerTool(new LightsControlTool());
server.registerTool(new ClimateControlTool());
```

### API

When running with HTTP transport, the server provides a JSON-RPC 2.0 API:

- `POST /api/mcp/jsonrpc` - Execute a tool
- `GET /api/mcp/stream` - Connect to SSE stream for real-time updates
- `GET /api/mcp/info` - Get server information
- `GET /health` - Health check endpoint

## Integration with AI Models

### Claude Integration

```typescript
import { createClaudeToolDefinitions } from "./mcp/index.js";

// Generate Claude-compatible tool definitions
const claudeTools = createClaudeToolDefinitions([
  new LightsControlTool(),
  new ClimateControlTool()
]);

// Use with Claude API
const messages = [
  { role: "user", content: "Turn on the lights in the living room" }
];

const response = await claude.messages.create({
  model: "claude-3-opus-20240229",
  messages,
  tools: claudeTools
});
```

### Cursor Integration

To use the Home Assistant MCP server with Cursor, add the following to your `.cursor/config/config.json` file:

```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "bash",
      "args": ["-c", "cd ${workspaceRoot} && bun run dist/index.js --stdio 2>/dev/null | grep -E '\\{\"jsonrpc\":\"2\\.0\"'"],
      "env": {
        "NODE_ENV": "development",
        "USE_STDIO_TRANSPORT": "true",
        "DEBUG_STDIO": "true"
      }
    }
  }
}
```

This configuration:
1. Runs the MCP server with stdio transport
2. Redirects all stderr output to /dev/null
3. Uses grep to filter stdout for lines containing `{"jsonrpc":"2.0"`, ensuring clean JSON-RPC output

#### Troubleshooting Cursor Integration

If you encounter a "failed to create client" error when using the MCP server with Cursor:

1. Make sure you're using the correct command and arguments in your Cursor configuration
   - The bash script approach ensures only valid JSON-RPC messages reach Cursor
   - Ensure the server is built by running `bun run build` before trying to connect

2. Ensure the server is properly outputting JSON-RPC messages to stdout:
   ```bash
   bun run dist/index.js --stdio 2>/dev/null | grep -E '\{"jsonrpc":"2\.0"' > json_only.txt
   ```
   Then examine json_only.txt to verify it contains only valid JSON-RPC messages.

3. Make sure grep is installed on your system (it should be available by default on most systems)

4. Try rebuilding the server with:
   ```bash
   bun run build
   ```
   
5. Enable debug mode by setting `DEBUG_STDIO=true` in the environment variables

If the issue persists, you can try:
1. Restarting Cursor
2. Clearing Cursor's cache (Help > Developer > Clear Cache and Reload)
3. Using a similar approach with Node.js:
   ```json
   {
     "command": "bash",
     "args": ["-c", "cd ${workspaceRoot} && node dist/index.js --stdio 2>/dev/null | grep -E '\\{\"jsonrpc\":\"2\\.0\"'"]
   }
   ```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

# MCP Server for Home Assistant 🏠🤖

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Bun](https://img.shields.io/badge/bun-%3E%3D1.0.26-black)](https://bun.sh) [![TypeScript](https://img.shields.io/badge/typescript-%5E5.0.0-blue.svg)](https://www.typescriptlang.org) [![smithery badge](https://smithery.ai/badge/@jango-blockchained/advanced-homeassistant-mcp)](https://smithery.ai/server/@jango-blockchained/advanced-homeassistant-mcp)

## Overview 🌐

MCP (Model Context Protocol) Server is my lightweight integration tool for Home Assistant, providing a flexible interface for device management and automation. It's designed to be fast, secure, and easy to use. Built with Bun for maximum performance.

## Core Features ✨

- 🔌 Basic device control via REST API
- 📡 WebSocket/Server-Sent Events (SSE) for state updates
- 🤖 Simple automation rule management
- 🔐 JWT-based authentication
- 🔄 Standard I/O (stdio) transport for integration with Claude and other AI assistants

## Why Bun? 🚀

I chose Bun as the runtime for several key benefits:

- ⚡ **Blazing Fast Performance**
  - Up to 4x faster than Node.js
  - Built-in TypeScript support
  - Optimized file system operations

- 🎯 **All-in-One Solution**
  - Package manager (faster than npm/yarn)
  - Bundler (no webpack needed)
  - Test runner (built-in testing)
  - TypeScript transpiler

- 🔋 **Built-in Features**
  - SQLite3 driver
  - .env file loading
  - WebSocket client/server
  - File watcher
  - Test runner

- 💾 **Resource Efficient**
  - Lower memory usage
  - Faster cold starts
  - Better CPU utilization

- 🔄 **Node.js Compatibility**
  - Runs most npm packages
  - Compatible with Express/Fastify
  - Native Node.js APIs

## Prerequisites 📋

- 🚀 [Bun runtime](https://bun.sh) (v1.0.26+)
- 🏡 [Home Assistant](https://www.home-assistant.io/) instance
- 🐳 Docker (optional, recommended for deployment)
- 🖥️ Node.js 18+ (optional, for speech features)
- 🎮 NVIDIA GPU with CUDA support (optional, for faster speech processing)

## Quick Start 🚀

1. Clone my repository:
```bash
git clone https://github.com/jango-blockchained/homeassistant-mcp.git
cd homeassistant-mcp
```

2. Set up the environment:
```bash
# Make my setup script executable
chmod +x scripts/setup-env.sh

# Run setup (defaults to development)
./scripts/setup-env.sh

# Or specify an environment:
NODE_ENV=production ./scripts/setup-env.sh

# Force override existing files:
./scripts/setup-env.sh --force
```

3. Configure your settings:
- Edit `.env` file with your Home Assistant details
- Required: Add your `HASS_TOKEN` (long-lived access token)

4. Build and launch with Docker:
```bash
# Standard build
./docker-build.sh

# Launch:
docker compose up -d
```

## Docker Build Options 🐳

My Docker build script (`docker-build.sh`) supports different configurations:

### 1. Standard Build
```bash
./docker-build.sh
```
- Basic MCP server functionality
- REST API and WebSocket support
- No speech features

### 2. Speech-Enabled Build
```bash
./docker-build.sh --speech
```
- Includes wake word detection
- Speech-to-text capabilities
- Pulls required images:
  - `onerahmet/openai-whisper-asr-webservice`
  - `rhasspy/wyoming-openwakeword`

### 3. GPU-Accelerated Build
```bash
./docker-build.sh --speech --gpu
```
- All speech features
- CUDA GPU acceleration
- Optimized for faster processing
- Float16 compute type for better performance

### Build Features
- 🔄 Automatic resource allocation
- 💾 Memory-aware building
- 📊 CPU quota management
- 🧹 Automatic cleanup
- 📝 Detailed build logs
- 📊 Build summary and status

## Environment Configuration 🔧

I've implemented a hierarchical configuration system:

### File Structure 📁
1. `.env.example` - My template with all options
2. `.env` - Your configuration (copy from .env.example)
3. Environment overrides:
   - `.env.dev` - Development settings
   - `.env.prod` - Production settings
   - `.env.test` - Test settings

### Loading Priority ⚡
Files load in this order:
1. `.env` (base config)
2. Environment-specific file:
   - `NODE_ENV=development` → `.env.dev`
   - `NODE_ENV=production` → `.env.prod`
   - `NODE_ENV=test` → `.env.test`

Later files override earlier ones.

## Development 💻

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Run tests
bun test

# Run with hot reload
bun --hot run dev

# Build for production
bun build ./src/index.ts --target=bun

# Run production build
bun run start
```

### Performance Comparison 📊

| Operation | Bun | Node.js |
|-----------|-----|---------|
| Install Dependencies | ~2s | ~15s |
| Cold Start | 300ms | 1000ms |
| Build Time | 150ms | 4000ms |
| Memory Usage | ~150MB | ~400MB |

## Documentation 📚

### Core Documentation
- [Configuration Guide](docs/configuration.md)
- [API Documentation](docs/api.md)
- [Troubleshooting](docs/troubleshooting.md)

### Advanced Features
- [Natural Language Processing](docs/nlp.md) - AI-powered automation analysis and control
- [Custom Prompts Guide](docs/prompts.md) - Create and customize AI behavior
- [Extras & Tools](docs/extras.md) - Additional utilities and advanced features

## Client Integration 🔗

### Cursor Integration 🖱️
Add to `.cursor/config/config.json`:
```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "bash",
      "args": ["-c", "cd ${workspaceRoot} && bun run dist/index.js --stdio 2>/dev/null | grep -E '\\{\"jsonrpc\":\"2\\.0\"'"],
      "env": {
        "NODE_ENV": "development",
        "USE_STDIO_TRANSPORT": "true",
        "DEBUG_STDIO": "true"
      }
    }
  }
}
```

### Claude Desktop 💬
Add to your Claude config:
```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "bun",
      "args": ["run", "start", "--port", "8080"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Command Line 💻
Windows users can use the provided script:
1. Go to `scripts` directory
2. Run `start_mcp.cmd`

## Additional Features

### Speech Features 🎤

MCP Server optionally supports speech processing capabilities:
- 🗣️ Wake word detection ("hey jarvis", "ok google", "alexa")
- 🎯 Speech-to-text using fast-whisper
- 🌍 Multiple language support
- 🚀 GPU acceleration support

#### Speech Features Setup

##### Prerequisites
1. 🐳 Docker installed and running
2. 🎮 NVIDIA GPU with CUDA (optional)
3. 💾 4GB+ RAM (8GB+ recommended)

##### Configuration
1. Enable speech in `.env`:
```bash
ENABLE_SPEECH_FEATURES=true
ENABLE_WAKE_WORD=true
ENABLE_SPEECH_TO_TEXT=true
WHISPER_MODEL_PATH=/models
WHISPER_MODEL_TYPE=base
```

2. Choose your STT engine:
```bash
# For standard Whisper
STT_ENGINE=whisper

# For Fast Whisper (GPU recommended)
STT_ENGINE=fast-whisper
CUDA_VISIBLE_DEVICES=0  # Set GPU device
```

##### Available Models 🤖
Choose based on your needs:
- `tiny.en`: Fastest, basic accuracy
- `base.en`: Good balance (recommended)
- `small.en`: Better accuracy, slower
- `medium.en`: High accuracy, resource intensive
- `large-v2`: Best accuracy, very resource intensive

##### Launch with Speech Features
```bash
# Build with speech support
./docker-build.sh --speech

# Launch with speech features:
docker compose -f docker-compose.yml -f docker-compose.speech.yml up -d
```

### Extra Tools 🛠️

I've included several powerful tools in the `extra/` directory to enhance your Home Assistant experience:

1. **Home Assistant Analyzer CLI** (`ha-analyzer-cli.ts`)
   - Deep automation analysis using AI models
   - Security vulnerability scanning
   - Performance optimization suggestions
   - System health metrics

2. **Speech-to-Text Example** (`speech-to-text-example.ts`)
   - Wake word detection
   - Speech-to-text transcription
   - Multiple language support
   - GPU acceleration support

3. **Claude Desktop Setup** (`claude-desktop-macos-setup.sh`)
   - Automated Claude Desktop installation for macOS
   - Environment configuration
   - MCP integration setup

See [Extras Documentation](docs/extras.md) for detailed usage instructions and examples.

## License 📄

MIT License. See [LICENSE](LICENSE) for details.

## Author 👨‍💻

Created by [jango-blockchained](https://github.com/jango-blockchained)

## Running with Standard I/O Transport 📝

MCP Server supports a JSON-RPC 2.0 stdio transport mode for direct integration with AI assistants like Claude:

### MCP Stdio Features

✅ **JSON-RPC 2.0 Compatibility**: Full support for the MCP protocol standard  
✅ **NPX Support**: Run directly without installation using `npx homeassistant-mcp`  
✅ **Auto Configuration**: Creates necessary directories and default configuration  
✅ **Cross-Platform**: Works on macOS, Linux, and Windows  
✅ **Claude Desktop Integration**: Ready to use with Claude Desktop  
✅ **Parameter Validation**: Automatic validation of tool parameters  
✅ **Error Handling**: Standardized error codes and handling  
✅ **Detailed Logging**: Logs to files without polluting stdio  

### Option 1: Using NPX (Easiest)

Run the MCP server directly without installation using npx:

```bash
# Basic usage
npx homeassistant-mcp

# Or with environment variables
HASS_URL=http://your-ha-instance:8123 HASS_TOKEN=your_token npx homeassistant-mcp
```

This will:
1. Install the package temporarily
2. Automatically run in stdio mode with JSON-RPC 2.0 transport
3. Create a logs directory for logging
4. Create a default .env file if not present

Perfect for integration with Claude Desktop or other MCP clients.

#### Integrating with Claude Desktop

To use MCP with Claude Desktop:

1. Open Claude Desktop settings
2. Go to the "Advanced" tab
3. Under "MCP Server", select "Custom"
4. Enter the command: `npx homeassistant-mcp`
5. Click "Save"

Claude will now use the MCP server for Home Assistant integration, allowing you to control your smart home directly through Claude.

### Option 2: Local Installation

1. Update your `.env` file to enable stdio transport:
   ```
   USE_STDIO_TRANSPORT=true
   ```

2. Run the server using the stdio-start script:
   ```bash
   ./stdio-start.sh
   ```

   Available options:
   ```
   ./stdio-start.sh --debug    # Enable debug mode
   ./stdio-start.sh --rebuild  # Force rebuild
   ./stdio-start.sh --help     # Show help
   ```

When running in stdio mode:
- The server communicates via stdin/stdout using JSON-RPC 2.0 format
- No HTTP server is started
- Console logging is disabled to avoid polluting the stdio stream
- All logs are written to the log files in the `logs/` directory

### JSON-RPC 2.0 Message Format

#### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tool-name",
  "params": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

#### Response Format
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    // Tool-specific result data
  }
}
```

#### Error Response Format
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32000,
    "message": "Error message",
    "data": {} // Optional error details
  }
}
```

#### Notification Format (Server to Client)
```json
{
  "jsonrpc": "2.0",
  "method": "notification-type",
  "params": {
    // Notification data
  }
}
```

### Supported Error Codes

| Code    | Description        | Meaning                                  |
|---------|--------------------|------------------------------------------|
| -32700  | Parse error        | Invalid JSON was received                |
| -32600  | Invalid request    | JSON is not a valid request object       |
| -32601  | Method not found   | Method does not exist or is unavailable  |
| -32602  | Invalid params     | Invalid method parameters                |
| -32603  | Internal error     | Internal JSON-RPC error                  |
| -32000  | Tool execution     | Error executing the tool                 |
| -32001  | Validation error   | Parameter validation failed              |

### Integrating with Claude Desktop

To use this MCP server with Claude Desktop:

1. Create or edit your Claude Desktop configuration:
   ```bash
   # On macOS
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # On Linux
   nano ~/.config/Claude/claude_desktop_config.json
   
   # On Windows
   notepad %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add the MCP server configuration:
   ```json
   {
     "mcpServers": {
       "homeassistant-mcp": {
         "command": "npx",
         "args": ["homeassistant-mcp"],
         "env": {
           "HASS_TOKEN": "your_home_assistant_token_here",
           "HASS_HOST": "http://your_home_assistant_host:8123"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop.

4. In Claude, you can now use the Home Assistant MCP tools.

### JSON-RPC 2.0 Message Format

## Usage

### Using NPX (Easiest)

The simplest way to use the Home Assistant MCP server is through NPX:

```bash
# Start the server in stdio mode
npx homeassistant-mcp
```

This will automatically:
1. Start the server in stdio mode
2. Output JSON-RPC messages to stdout
3. Send log messages to stderr
4. Create a logs directory if it doesn't exist

You can redirect stderr to hide logs and only see the JSON-RPC output:

```bash
npx homeassistant-mcp 2>/dev/null
```

### Manual Installation

If you prefer to install the package globally or locally:

```bash
# Install globally
npm install -g homeassistant-mcp

# Then run
homeassistant-mcp
```

Or install locally:

```bash
# Install locally
npm install homeassistant-mcp

# Then run using npx
npx homeassistant-mcp
```

### Advanced Usage
