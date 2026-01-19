# VS Code MCP Integration - Quick Reference

## ✅ Setup Checklist

- [ ] Install recommended VS Code extensions
- [ ] Copy `.env.example` to `.env`
- [ ] Configure `HASS_HOST` and `HASS_TOKEN` in `.env`
- [ ] Run `npm install`
- [ ] Run `npm run build:stdio`
- [ ] Reload VS Code window

## 🚀 Quick Commands

| Action                | Command                  |
| --------------------- | ------------------------ |
| Build STDIO server    | `npm run build:stdio`    |
| Build all             | `npm run build:all`      |
| Start HTTP server     | `npm run start`          |
| Start STDIO server    | `npm run start:stdio`    |
| Run tests             | `bun test`               |
| Clean build artifacts | `rm -rf dist logs/*.log` |

## 🔧 VS Code Keyboard Shortcuts

| Action          | Shortcut                                             |
| --------------- | ---------------------------------------------------- |
| Run Build Task  | `Ctrl+Shift+B` (Windows/Linux) / `Cmd+Shift+B` (Mac) |
| Start Debugging | `F5`                                                 |
| Stop Debugging  | `Shift+F5`                                           |
| Run Task        | `Ctrl+Shift+P` → "Tasks: Run Task"                   |
| Command Palette | `Ctrl+Shift+P` (Windows/Linux) / `Cmd+Shift+P` (Mac) |

## 📁 Important Files

| File                    | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `.vscode/mcp.json`      | MCP server configuration                           |
| `.vscode/settings.json` | Workspace settings                                 |
| `.vscode/launch.json`   | Debug configurations                               |
| `.vscode/tasks.json`    | Build tasks                                        |
| `.env`                  | Environment variables (create from `.env.example`) |
| `dist/stdio-server.mjs` | Built STDIO server (MCP entry point)               |

## 🔍 Troubleshooting Quick Fixes

### MCP Server Not Working

```bash
# Rebuild the STDIO server
npm run build:stdio

# Check if environment variables are set
cat .env | grep HASS_

# Test manually
npm run start:stdio
```

### TypeScript Errors in Editor

1. `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type: "TypeScript: Restart TS Server"
3. Press Enter

### VS Code Not Detecting MCP Server

1. Check that `.vscode/mcp.json` exists
2. Verify `dist/stdio-server.mjs` exists
3. Reload VS Code window: `Ctrl+Shift+P` → "Developer: Reload Window"

## 🔑 Environment Variables

Required variables in `.env`:

```bash
HASS_HOST=http://homeassistant.local:8123
HASS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
```

Optional variables:

```bash
LOG_LEVEL=info          # debug, info, warn, error
PORT=7123               # HTTP server port
NODE_ENV=development    # or production
```

## 🎯 Common Development Tasks

### Adding a New MCP Tool

1. Create tool file in `src/tools/homeassistant/`
2. Export from `src/tools/index.ts`
3. Rebuild: `npm run build:stdio`
4. Test with MCP client

### Updating Documentation

1. Edit files in `docs/`
2. Test locally: `mkdocs serve`
3. Build: `mkdocs build`

### Running Integration Tests

```bash
bun test integration
```

## 🐛 Debug Configurations Available

- **Start HTTP Server** - Full server with HTTP/WebSocket
- **Start STDIO Server** - STDIO-only for MCP
- **Start HTTP Simple Server** - Lightweight HTTP server
- **Run Tests** - Execute test suite

Access via: Run & Debug view (Ctrl+Shift+D / Cmd+Shift+D)

## 📚 Documentation Links

- [Full VS Code Integration Guide](docs/VSCODE_INTEGRATION.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [MCP Protocol Docs](https://modelcontextprotocol.io/)

## 💡 Pro Tips

1. **Use Tasks**: Access build tasks via `Ctrl+Shift+B`
2. **Watch Logs**: Check `logs/combined.log` for detailed output
3. **Environment First**: Always set up `.env` before building
4. **Test STDIO**: Run `npm run start:stdio` to verify MCP server works
5. **Reload Often**: Reload VS Code window after config changes

## 📦 Version Info

Current Version: **1.2.3**

Check package version:

```bash
cat package.json | grep version
```
