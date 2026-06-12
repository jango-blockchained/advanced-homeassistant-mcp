# 🏠 Home Assistant MCP

[![Smithery](https://img.shields.io/badge/smithery-available-7842E8?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxMiAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiAwTDEyIDNMMTIgMTFMNiAxNEwwIDExTDAgM0w2IDBaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==)](https://smithery.ai/server/@jango-blockchained/advanced-homeassistant-mcp)
[![Release](https://img.shields.io/github/v/release/jango-blockchained/advanced-homeassistant-mcp?logo=github)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/releases)
[![npm](https://img.shields.io/npm/v/@jango-blockchained/homeassistant-mcp?logo=npm)](https://www.npmjs.com/package/@jango-blockchained/homeassistant-mcp)
[![Docker](https://img.shields.io/docker/v/ghcr.io/jango-blockchained/advanced-homeassistant-mcp?logo=docker&label=docker)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/pkgs/container/advanced-homeassistant-mcp)
[![CI](https://img.shields.io/github/actions/workflow/status/jango-blockchained/advanced-homeassistant-mcp/release.yml?logo=github&label=CI)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/actions)
[![Bun](https://img.shields.io/badge/runtime-bun-000?logo=bun)](https://bun.sh)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> **Talk to your house.** Your AI assistant (Claude, GPT, Cursor, Copilot) — connected to Home Assistant through the Model Context Protocol. 40+ tools, three transports, one `bunx` command.

```bash
# ⚡ Fastest way to try it
bunx github:jango-blockchained/advanced-homeassistant-mcp
```

---

## 🚀 Quick Start

You need a **Home Assistant** instance and a **long-lived access token** ([create one here](https://www.home-assistant.io/docs/authentication/#your-account-profile)).

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "bunx",
      "args": ["github:jango-blockchained/advanced-homeassistant-mcp"],
      "env": {
        "HASS_HOST": "http://your-ha-instance:8123",
        "HASS_TOKEN": "your_long_lived_access_token"
      }
    }
  }
}
```

**Restart Claude.** You're done. Ask it to turn on the lights.

### Cursor / VS Code

<details>
<summary><strong>Cursor</strong> — add to <code>.cursor/config/config.json</code></summary>

```json
{
  "mcpServers": {
    "homeassistant-mcp": {
      "command": "bunx",
      "args": ["github:jango-blockchained/advanced-homeassistant-mcp"],
      "env": {
        "HASS_HOST": "http://your-ha-instance:8123",
        "HASS_TOKEN": "your_long_lived_access_token"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>VS Code + MCP Extension</strong></summary>

Set your env vars in a `.env` file and use the pre-configured `.vscode/mcp.json`:

```json
{
  "mcp.servers": {
    "homeassistant-mcp": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "dist/stdio-server.mjs"],
      "env": {
        "HASS_HOST": "${env:HASS_HOST}",
        "HASS_TOKEN": "${env:HASS_TOKEN}"
      }
    }
  }
}
```

</details>

### Smithery (One-Click)

Install directly from the [Smithery registry](https://smithery.ai/server/@jango-blockchained/advanced-homeassistant-mcp) — no config files needed:

```bash
npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude
```

---

## 📦 All Install Options

| Method                 | Command                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **Smithery** (easiest) | `npx @smithery/cli install @jango-blockchained/homeassistant-mcp --client claude`                        |
| **bunx** (no install)  | `bunx github:jango-blockchained/advanced-homeassistant-mcp`                                              |
| **npx**                | `npx @jango-blockchained/homeassistant-mcp@latest`                                                       |
| **Docker**             | `docker run -d -p 7123:7123 --env-file .env ghcr.io/jango-blockchained/advanced-homeassistant-mcp:1.6.1` |
| **From source**        | `git clone ... && bun install && bun run build && bun run start:stdio`                                   |
| **npm global**         | `npm add -g @jango-blockchained/homeassistant-mcp && homeassistant-mcp`                                  |

> **Docker tags**: `latest`, `1.6.1`, `1.6`, `1`, `dev`

---

## 🎯 What You Can Do

Once connected, you talk to your house like you talk to a human:

```
"Turn off all lights in the bedroom"
"Set the thermostat to 72°F"
"Lock all doors and start the vacuum"
"Show me energy consumption this week"
"What's the temperature in the living room?"
"Activate the movie scene"
"Notify everyone that dinner is ready"
"Check my Home Assistant health"
"Find orphaned devices with low battery"
"Analyze my light usage patterns"
```

Every command maps to one of **40+ tools** — lights, climate, media, locks, covers, fans, vacuums, alarms, scenes, automations, notifications, history, energy monitoring, maintenance, and more.

<details>
<summary><strong>Full tool reference</strong> (all 41 tools)</summary>

| Category            | Tools                                                 |
| ------------------- | ----------------------------------------------------- |
| **Lights**          | brightness, color temp, RGB, effects, turn on/off     |
| **Climate**         | HVAC modes, target temp, fan mode, humidify           |
| **Media**           | play/pause, volume, source, sound mode, shuffle       |
| **Covers**          | open/close, position, tilt, garage door               |
| **Locks**           | lock/unlock with code support                         |
| **Fans**            | speed, oscillation, direction, preset                 |
| **Vacuums**         | start/stop/dock, spot clean, fan speed                |
| **Alarm**           | arm home/away/night, disarm                           |
| **Scenes**          | activate named scene                                  |
| **Automations**     | list, toggle, trigger, create/edit/delete             |
| **Notifications**   | push alerts via HA channels                           |
| **History**         | query historical states                               |
| **Add-ons**         | install, configure, control                           |
| **Maintenance**     | orphaned devices, battery warnings, energy analysis   |
| **Smart Scenarios** | nobody-home mode, window/heat conflicts, energy waste |
| **Aurora**          | sound-to-light sync, BPM/beat detection, light shows  |

Full docs: [Tools Reference](https://jango-blockchained.github.io/advanced-homeassistant-mcp/tools/generic-tools/)

</details>

---

## 🧱 Architecture

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  AI Assistant │◄───►│   Home Assistant    │◄───►│  Your Smart Home │
│ (Claude/GPT)  │     │    MCP Server       │     │  (Home Assistant)│
└──────────────┘     └─────────────────────┘     └──────────────────┘
                         │           │
                    ┌────┘           └────┐
                    ▼                     ▼
              ┌────────────┐      ┌──────────────┐
              │  HTTP/WS   │      │    STDIO     │
              │ (Express)  │      │ (fastmcp v3) │
              └────────────┘      └──────────────┘
```

Three transports, one codebase. Pick the one that fits your setup — all expose the same 40+ tools.

---

## ⚙️ Configuration

Minimal setup. Two variables are required:

```env
HASS_HOST=http://homeassistant.local:8123
HASS_TOKEN=eyJ...                          # long-lived access token
```

Optional:

```env
PORT=7123                                  # HTTP server port
LOG_LEVEL=info                             # debug | info | warn | error
JWT_SECRET=...                             # for HTTP/WS auth
```

---

## 🛠️ Development

```bash
bun install              # install dependencies
bun run build:all        # build all three entry points
bun test                 # run test suite (80% coverage threshold)
bun run lint             # ESLint + Prettier
```

Built with [Bun](https://bun.sh), TypeScript, and [fastmcp](https://github.com/punkpeye/fastmcp). Three entry points:

- `dist/index.cjs` — HTTP+WS on a custom Express-based MCP server
- `dist/stdio-server.mjs` — STDIO via fastmcp v3
- `dist/http-server.mjs` — HTTP via fastmcp v3

---

## 📖 Docs

Full documentation lives at **[jango-blockchained.github.io/advanced-homeassistant-mcp](https://jango-blockchained.github.io/advanced-homeassistant-mcp/)** — covers installation, configuration, all 41 tools, deployment (HTTP, STDIO, Smithery), architecture deep-dives, and guides.

---

## 🤝 Contributing

PRs welcome. Keep it simple — same code style, add tests, update docs if you touch public APIs.

1. Fork it
2. Branch it
3. Code it
4. Test it
5. PR it

---

## 📄 License

MIT — go build something cool.

---

**Your smart home speaks MCP. Now your AI speaks it too.** 🏠⚡🤖🔋

> Batteries included. 🔋
