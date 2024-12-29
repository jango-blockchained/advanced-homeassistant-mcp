# A Model Context Protocol Server for Home Assistant

[![smithery badge](https://smithery.ai/badge/@strandbrown/homeassistant-mcp)](https://smithery.ai/server/@strandbrown/homeassistant-mcp)

The server uses the MCP protocol to share access to a local Home Assistant instance with an LLM application.

More about MCP here: https://modelcontextprotocol.io/introduction

More about Home Assistant here: https://www.home-assistant.io

## Usage

### Installing via Smithery

To install Home Assistant Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@strandbrown/homeassistant-mcp):

```bash
npx -y @smithery/cli install @strandbrown/homeassistant-mcp --client claude
```

### Manual Installation

First build the server

```
yarn build
```

Then configure your application (like Claude Desktop) to use it.

```
{
    "mcpServers": {
        "homeassistant": {
            "command": "node",
            "args": [
                "/Users/tevonsb/Desktop/mcp/dist/index.js"
            ],
            "env": {
                "TOKEN": <home_assistant_token>,
                "BASE_URL": <base_url_for_home_assistant>
            }
        }
    }
}
```

You'll need a personal access token from home assistant.

Get one using this guide: https://community.home-assistant.io/t/how-to-get-long-lived-access-token/162159

## In Progress

- [x] Access to entities
- [x] Access to Floors
- [x] Access to Areas
- [x] Control for entities
    - [x] Lights
    - [x] Thermostats
    - [x] Covers
- [ ] Testing / writing custom prompts
- [ ] Testing using resources for high-level context
- [ ] Test varying tool organization
