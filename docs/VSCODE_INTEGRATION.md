# VS Code Integration Guide

This document explains how to use the Home Assistant MCP Server within VS Code.

## Quick Start

1. **Install Required Extensions**
   - Install the recommended extensions (VS Code will prompt you)
   - Most importantly: MCP extension or Claude/Copilot extension with MCP support

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Set your Home Assistant credentials:
     ```
     HASS_HOST=http://your-homeassistant:8123
     HASS_TOKEN=your-long-lived-access-token
     ```

3. **Build the Project**

   ```bash
   npm install
   npm run build:stdio
   ```

4. **Start Using MCP**
   - The MCP server will automatically connect via the configuration in `.vscode/mcp.json`
   - Use the MCP tools through your AI assistant in VS Code

## Configuration Files

### `.vscode/mcp.json`

This is the main MCP configuration file that VS Code uses to connect to your MCP server:

```jsonc
{
  "servers": {
    "homeassistant-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/stdio-server.mjs"],
      "env": {
        "HASS_HOST": "${env:HASS_HOST}",
        "HASS_TOKEN": "${env:HASS_TOKEN}",
        "LOG_LEVEL": "info",
      },
    },
  },
}
```

**Key Points:**

- Uses the built `stdio-server.mjs` file
- Reads environment variables from your shell environment
- Ensure you've built the project before using

### `.vscode/settings.json`

Contains workspace-specific settings for TypeScript, formatting, and file associations.

### `.vscode/launch.json`

Provides debug configurations for:

- **Start HTTP Server**: Run the full HTTP/WebSocket server
- **Start STDIO Server**: Run the STDIO-only server (for MCP)
- **Start HTTP Simple Server**: Run the lightweight HTTP server
- **Run Tests**: Execute the test suite

### `.vscode/tasks.json`

Defines build and run tasks that can be executed from VS Code:

- `build` - Build the main HTTP server
- `build:stdio` - Build the STDIO server
- `build:http-simple` - Build the simple HTTP server
- `build:all` - Build all variants
- `test` - Run tests
- `clean` - Remove build artifacts

## Development Workflow

### Building

Use the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

1. Type "Tasks: Run Build Task"
2. Select the appropriate build task

Or use the terminal:

```bash
npm run build:stdio    # Build STDIO server for MCP
npm run build          # Build main HTTP server
npm run build:all      # Build everything
```

### Debugging

1. Set breakpoints in your TypeScript source files
2. Press F5 or go to Run & Debug view
3. Select a debug configuration from the dropdown
4. Press the green play button

The debugger will:

- Automatically build the project
- Launch the server
- Attach the debugger
- Stop at your breakpoints

### Testing

Run tests using:

- The "Run Tests" debug configuration
- Command Palette: "Tasks: Run Test Task"
- Terminal: `bun test`

## MCP Tools Available

When connected, the following Home Assistant tools are available:

- **get_state** - Get state of any Home Assistant entity
- **call_service** - Call any Home Assistant service
- **list_entities** - List all entities with optional filtering
- **get_history** - Get historical data for entities
- **execute_script** - Execute Home Assistant scripts
- **send_notification** - Send notifications
- And many more...

## Troubleshooting

### MCP Server Not Connecting

1. **Check Build**: Ensure `dist/stdio-server.mjs` exists

   ```bash
   npm run build:stdio
   ```

2. **Check Environment**: Verify `.env` file has correct credentials

   ```bash
   cat .env | grep HASS_
   ```

3. **Check Logs**: Look in the `logs/` directory for error messages

4. **Manual Test**: Test the STDIO server manually
   ```bash
   npm run start:stdio
   ```

### Environment Variables Not Loading

The STDIO server automatically loads `.env` from the workspace root. Ensure:

- The `.env` file exists in the project root
- Variables are correctly formatted (no quotes needed)
- No syntax errors in the `.env` file

### TypeScript Errors

If you see TypeScript errors in VS Code:

1. Open Command Palette
2. Run "TypeScript: Restart TS Server"
3. If issues persist, check `tsconfig.json` matches your TypeScript version

## Advanced Configuration

### Custom Port for HTTP Server

Edit `.env`:

```
PORT=7123
```

### Custom Log Level

Edit `.vscode/mcp.json`:

```jsonc
{
  "servers": {
    "homeassistant-mcp": {
      // ...
      "env": {
        "LOG_LEVEL": "debug", // Change to debug, info, warn, error
      },
    },
  },
}
```

### Using a Different Node Version

If you need to use a specific Node.js version:

```jsonc
{
  "servers": {
    "homeassistant-mcp": {
      "command": "/path/to/specific/node",
      // ...
    },
  },
}
```

## Production Deployment

For production use outside of VS Code development:

1. **HTTP Server** (recommended for remote access):

   ```bash
   npm run build
   npm run start
   ```

2. **STDIO Server** (for local MCP clients):

   ```bash
   npm run build:stdio
   npm run start:stdio
   ```

3. **Docker** (for containerized deployment):
   ```bash
   docker-compose up -d
   ```

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Home Assistant API](https://developers.home-assistant.io/docs/api/rest/)
- [Project Documentation](docs/)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
