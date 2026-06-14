# 🏠 Home Assistant MCP

[![Smithery](https://shieldcn.dev/badge/smithery-available-7842E8.png?size=xs)](https://smithery.ai/server/@jango-blockchained/advanced-homeassistant-mcp)
[![Release](https://shieldcn.dev/github/release/jango-blockchained/advanced-homeassistant-mcp.png?size=xs)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/releases)
[![npm](https://shieldcn.dev/npm/v/@jango-blockchained/homeassistant-mcp.png?size=xs)](https://www.npmjs.com/package/@jango-blockchained/homeassistant-mcp)
[![Docker](https://shieldcn.dev/badge/docker-ghcr.io-2496ED.png?size=xs)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/pkgs/container/advanced-homeassistant-mcp)
[![CI](https://shieldcn.dev/github/ci/jango-blockchained/advanced-homeassistant-mcp.png?size=xs)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/actions)
[![Bun](https://shieldcn.dev/badge/runtime-bun-000000.png?size=xs)](https://bun.sh)
[![Node](https://shieldcn.dev/badge/node-%3E18-339933.png?size=xs)](https://nodejs.org)
[![License](https://shieldcn.dev/github/license/jango-blockchained/advanced-homeassistant-mcp.png?size=xs)](LICENSE)

> **Talk to your house.** Your AI assistant (Claude, GPT, Cursor, Copilot) — connected to Home Assistant through the Model Context Protocol. 50+ tools, three transports, one `bunx` command.

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
<summary><strong>Cursor</strong> — add to <code>.cursor/mcp.json</code></summary>

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
npx @smithery/cli install @jango-blockchained/advanced-homeassistant-mcp --client claude
```

---

## 📦 All Install Options

| Method                 | Command                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **Smithery** (easiest) | `npx @smithery/cli install @jango-blockchained/advanced-homeassistant-mcp --client claude`               |
| **bunx** (no install)  | `bunx github:jango-blockchained/advanced-homeassistant-mcp`                                              |
| **npx**                | `npx @jango-blockchained/homeassistant-mcp@latest`                                                       |
| **Docker**             | `docker run -d -p 7123:7123 --env-file .env ghcr.io/jango-blockchained/advanced-homeassistant-mcp:1.7.0` |
| **From source**        | `git clone ... && bun install && bun run build:all && bun run start:stdio`                               |
| **npm global**         | `npm add -g @jango-blockchained/homeassistant-mcp && homeassistant-mcp`                                  |

**Available Docker tags:**

- `latest` - Latest stable release
- `1.7.1`, `1.7`, `1` - Tagged versions
- `dev` - Latest development build from main branch

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

Every command maps to one of **50+ tools** — lights, climate, media, locks, covers, fans, vacuums, alarms, scenes, automations, notifications, history, energy monitoring, maintenance, and more.

<details>
<summary><strong>Full tool reference</strong> (all 50+ tools)</summary>

| Category            | Tools                                                        |
| ------------------- | ------------------------------------------------------------ |
| **Lights**          | list, get, turn on/off, brightness, color temp, RGB, effects |
| **Climate**         | list, get, HVAC modes, target temp, fan mode, humidify       |
| **Media**           | list, get, play/pause, volume, source, sound mode, shuffle   |
| **Covers**          | list, get, open/close, position, tilt, garage door           |
| **Locks**           | list, get, lock/unlock with code support                     |
| **Fans**            | list, get, speed, oscillation, direction, preset             |
| **Vacuums**         | list, get, start/stop/dock, spot clean, fan speed            |
| **Alarm**           | list, get, arm home/away/night, disarm                       |
| **Switches**        | list, get, turn on/off/toggle                                |
| **Scenes**          | list, activate named scene                                   |
| **Automations**     | list, toggle, trigger, create/edit/delete                    |
| **Notifications**   | push alerts via HA channels                                  |
| **History**         | query historical states                                      |
| **Add-ons**         | install, configure, control                                  |
| **Packages**        | HACS integrations and custom components                      |
| **Maintenance**     | orphaned devices, battery warnings, energy analysis          |
| **Smart Scenarios** | nobody-home mode, window/heat conflicts, energy waste        |
| **Lighting**        | animations, scenarios, showcase, BPM/beat detection          |
| **Voice**           | wake word detection, speech-to-text, voice commands          |
| **Dashboard**       | query and manage Lovelace dashboards                         |
| **Templates**       | render Jinja2 templates via HA                               |
| **To-Do Lists**     | add, update, remove items                                    |
| **Traces**          | automation/script execution traces                           |
| **Search**          | full-text entity search with filters                         |
| **Entity State**    | get current state of any entity                              |
| **Error Log**       | query HA error logs with filtering                           |

Full docs: [Tools Reference](https://jango-blockchained.github.io/advanced-homeassistant-mcp/tools/ha-tools/)

</details>

---

## 🎙️ Speech Features (Voice Control)

Transform your setup into a fully voice-controlled smart home assistant. The speech integration provides local, privacy-focused voice processing.

- **Wake Word Detection**: Powered by `wyoming-openwakeword` (default: "Hey Jarvis").
- **Speech-to-Text**: Fast, local transcription using `faster-whisper`.
- **Audio Integration**: Direct PulseAudio integration for seamless microphone access.

To enable speech features, use the dedicated Docker Compose file:

```bash
docker-compose -f docker-compose.speech.yml up -d
```

See the [Speech Features Guide](https://jango-blockchained.github.io/advanced-homeassistant-mcp/guides/speech-features/) for detailed configuration and setup instructions.

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

Three transports, one codebase. Pick the one that fits your setup — all expose the same 50+ tools.

- **STDIO** — for Claude Desktop, Cursor, VS Code (local editor integrations)
- **HTTP+WS** — for remote AI hosts, with JWT auth, rate limiting, and WebSocket streaming
- **HTTP (fastmcp)** — lightweight HTTP transport without bespoke middleware

---

## ⚙️ Configuration

Minimal setup. Two variables are required:

```env
HASS_HOST=http://homeassistant.local:8123
HASS_TOKEN=eyJ...                          # long-lived access token
```

Optional:

```env
PORT=7123                                  # HTTP server port (default: 4000)
LOG_LEVEL=info                             # debug | info | warn | error
JWT_SECRET=...                             # for HTTP/WS auth (min 32 chars)
```

For the full list of 20+ environment variables, see the [Configuration docs](https://jango-blockchained.github.io/advanced-homeassistant-mcp/configuration/environment/).

---

## 🛠️ Development

```bash
bun install              # install dependencies
bun run build:all        # build all three entry points
bun test                 # run test suite (80% coverage threshold)
bun run lint             # ESLint + Prettier
bun run typecheck        # TypeScript type checking
```

Built with [Bun](https://bun.sh), TypeScript, and [fastmcp](https://github.com/punkpeye/fastmcp). Three entry points:

- `dist/index.cjs` — HTTP+WS on a custom Express-based MCP server
- `dist/stdio-server.mjs` — STDIO via fastmcp v3
- `dist/http-server.mjs` — HTTP via fastmcp v3

---

## 📖 Docs

Full documentation lives at **[jango-blockchained.github.io/advanced-homeassistant-mcp](https://jango-blockchained.github.io/advanced-homeassistant-mcp/)** — covers installation, configuration, all 50+ tools, deployment (HTTP, STDIO, Smithery), architecture deep-dives, and guides.

---

## 🤝 Contributing

PRs welcome. Keep it simple — same code style, add tests, update docs if you touch public APIs.

1. Fork it
2. Branch it
3. Code it
4. Test it
5. PR it

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guidelines.

---

## 📄 License

MIT — go build something cool.

---

**Your smart home speaks MCP. Now your AI speaks it too.** 🏠⚡🤖🔋

> Batteries included. 🔋
