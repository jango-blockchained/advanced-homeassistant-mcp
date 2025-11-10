# 📚 Home Assistant MCP Documentation

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0.26-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.0.0-blue.svg)](https://www.typescriptlang.org)
[![smithery badge](https://smithery.ai/badge/@jango-blockchained/homeassitant-mcp)](https://smithery.ai/server/@jango-blockchained/homeassitant-mcp)

> **Complete documentation hub for Home Assistant MCP Server** 📖

Your comprehensive guide to mastering AI-powered smart home control through the Model Context Protocol.

## 🎯 Quick Start Paths

### 👤 For End Users

**New to Home Assistant MCP?**
1. **[Getting Started Guide](GETTING_STARTED.md)** - Learn what it is and get running in minutes
2. **[Installation](INSTALLATION.md)** - Choose your installation method
3. **[Quick Start Scenarios](QUICK_START_SCENARIOS.md)** - See it in action with examples
4. **[Examples](EXAMPLES.md)** - Real-world usage patterns

**Want to learn more?**
5. **[Tools Reference](TOOLS_REFERENCE.md)** - Explore all 24 available commands
6. **[Smart Features](SMART_FEATURES.md)** - Advanced automation and maintenance
7. **[Configuration](CONFIGURATION.md)** - Fine-tune your setup
8. **[FAQ](FAQ.md)** - Find answers to common questions

**Having issues?**
- **[Troubleshooting](TROUBLESHOOTING.md)** - Solve common problems
- **[FAQ](FAQ.md)** - Check frequently asked questions

### 🔧 For Developers

**Want to contribute?**
1. **[Architecture](ARCHITECTURE.md)** - Understand the system design
2. **[Development](DEVELOPMENT.md)** - Set up your dev environment
3. **[Contributing](CONTRIBUTING.md)** - Learn the contribution process

**Reference materials:**
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Technical overview
- **[README](../README.md)** - Project overview

### 🔐 For System Administrators

**Deploying in production?**
1. **[Installation](INSTALLATION.md)** - Production deployment methods
2. **[Configuration](CONFIGURATION.md)** - Production configuration
3. **[Security](SECURITY.md)** - Secure your deployment
4. **[Smithery Deployment](SMITHERY_DEPLOYMENT.md)** - Cloud deployment

**Monitoring and maintenance:**
- **[Troubleshooting](TROUBLESHOOTING.md)** - Debug production issues
- **[FAQ](FAQ.md)** - Common operational questions

---

## 📖 Complete Documentation Index

### 🎓 Getting Started (For Beginners)

Perfect for new users who want to quickly get up and running:

| Guide | Description | Est. Time |
|-------|-------------|-----------|
| **[Getting Started](GETTING_STARTED.md)** | Complete beginner's guide with step-by-step setup | 15 min |
| **[Installation](INSTALLATION.md)** | All installation methods (Smithery, NPX, Docker, Source) | 10 min |
| **[Configuration](CONFIGURATION.md)** | Environment variables and settings reference | 20 min |
| **[Quick Start Scenarios](QUICK_START_SCENARIOS.md)** | Conversational examples with your AI assistant | 10 min |
| **[Troubleshooting](TROUBLESHOOTING.md)** | Common issues and detailed solutions | As needed |
| **[FAQ](FAQ.md)** | Frequently asked questions with quick answers | As needed |

### 📘 User Guide (For Regular Users)

Comprehensive guides for using all features:

| Guide | Description |
|-------|-------------|
| **[Tools Reference](TOOLS_REFERENCE.md)** | Complete documentation of all 24 tools with examples |
| **[Smart Features](SMART_FEATURES.md)** | Maintenance and intelligent scenario detection |
| **[Examples](EXAMPLES.md)** | Real-world usage patterns and automation ideas |
| **[Smithery Deployment](SMITHERY_DEPLOYMENT.md)** | Deploy via Smithery registry |

### 🔧 Developer Guide (For Contributors)

Technical documentation for developers and contributors:

| Guide | Description |
|-------|-------------|
| **[Architecture](ARCHITECTURE.md)** | System design, components, and data flow |
| **[Development](DEVELOPMENT.md)** | Development setup, building, testing, debugging |
| **[Contributing](CONTRIBUTING.md)** | How to contribute code and documentation |
| **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** | Technical implementation details |

### 🔐 Operations & Security

Guides for system administrators and security-conscious users:

| Guide | Description |
|-------|-------------|
| **[Security](SECURITY.md)** | Security best practices and hardening guide |
| **[Microphone Permissions](MICROPHONE_PERMISSIONS.md)** | Voice control setup and permissions |

---

## 🎯 Quick Navigation by Task

### Installing & Configuring

- **First time setup** → [Getting Started](GETTING_STARTED.md)
- **Choose installation method** → [Installation](INSTALLATION.md)
- **Configure settings** → [Configuration](CONFIGURATION.md)
- **Deploy to cloud** → [Smithery Deployment](SMITHERY_DEPLOYMENT.md)

### Using the System

- **Basic commands** → [Getting Started: Basic Usage](GETTING_STARTED.md#basic-usage)
- **All available tools** → [Tools Reference](TOOLS_REFERENCE.md)
- **Advanced features** → [Smart Features](SMART_FEATURES.md)
- **Real-world examples** → [Examples](EXAMPLES.md)
- **Quick scenarios** → [Quick Start Scenarios](QUICK_START_SCENARIOS.md)

### Troubleshooting

- **Common problems** → [Troubleshooting Guide](TROUBLESHOOTING.md)
- **Quick answers** → [FAQ](FAQ.md)
- **Installation issues** → [Troubleshooting: Installation](TROUBLESHOOTING.md#installation-issues)
- **Connection problems** → [Troubleshooting: Connection](TROUBLESHOOTING.md#connection-problems)
- **Authentication errors** → [Troubleshooting: Authentication](TROUBLESHOOTING.md#authentication-errors)

### Contributing to the Project

- **Getting started** → [Contributing Guide](CONTRIBUTING.md)
- **Development setup** → [Development: Setup](DEVELOPMENT.md#development-setup)
- **System architecture** → [Architecture](ARCHITECTURE.md)
- **Code style** → [Development: Code Style](DEVELOPMENT.md#code-style)
- **Testing** → [Development: Testing](DEVELOPMENT.md#testing)

### Security & Operations

- **Security setup** → [Security Guide](SECURITY.md)
- **Production config** → [Configuration: Production](CONFIGURATION.md#production-configuration)
- **Monitoring** → [Security: Monitoring](SECURITY.md#monitoring--auditing)

---

## 📊 Complete Tool Coverage

All 24 tools are fully documented with examples, parameters, and use cases.

### Device Control (13 tools)

| Tool | Description | Documentation |
|------|-------------|---------------|
| 🔦 **Lights** | Control brightness, color, temperature, effects | [Reference](TOOLS_REFERENCE.md#-lights-control-lights_control) |
| 🌡️ **Climate** | Thermostats, HVAC modes, temperature control | [Reference](TOOLS_REFERENCE.md#️-climate-control-climate_control) |
| 📺 **Media Players** | Playback, volume, sources, sound modes | [Reference](TOOLS_REFERENCE.md#-media-player-control-media_player_control) |
| 🪟 **Covers** | Blinds, curtains, garage doors, position control | [Reference](TOOLS_REFERENCE.md#-cover-control-cover_control) |
| 🔒 **Locks** | Lock/unlock with code support | [Reference](TOOLS_REFERENCE.md#-lock-control-lock_control) |
| 💨 **Fans** | Speed, oscillation, direction, presets | [Reference](TOOLS_REFERENCE.md#-fan-control-fan_control) |
| 🤖 **Vacuums** | Cleaning, docking, spot clean, fan speed | [Reference](TOOLS_REFERENCE.md#-vacuum-control-vacuum_control) |
| 🚨 **Alarms** | Arm/disarm modes, security management | [Reference](TOOLS_REFERENCE.md#-alarm-control-alarm_control) |
| 🎛️ **Generic Control** | Universal device control interface | [Reference](TOOLS_REFERENCE.md#-generic-control-control) |

### Automation (3 tools)

| Tool | Description | Documentation |
|------|-------------|---------------|
| ⚙️ **Automations** | List, toggle, trigger automations | [Reference](TOOLS_REFERENCE.md#️-automation-management-automation) |
| 🎬 **Scenes** | Activate predefined scenes | [Reference](TOOLS_REFERENCE.md#-scene-management-scene) |
| 🔧 **Automation Config** | Create/update/delete complex automations | [Reference](TOOLS_REFERENCE.md#-automation-config-automation_config) |

### System Management (6 tools)

| Tool | Description | Documentation |
|------|-------------|---------------|
| 📋 **Device Discovery** | List and filter devices by domain/area | [Reference](TOOLS_REFERENCE.md#-device-discovery-list_devices) |
| 📱 **Notifications** | Multi-channel alert system | [Reference](TOOLS_REFERENCE.md#-notifications-notify) |
| 📊 **History** | Query historical state data | [Reference](TOOLS_REFERENCE.md#-history-get_history) |
| 📦 **Add-on Management** | Install, configure, control add-ons | [Reference](TOOLS_REFERENCE.md#-add-on-management-addon) |
| 📦 **Package Management** | HACS integration and custom components | [Reference](TOOLS_REFERENCE.md#-package-management-package) |
| 🔔 **Event Subscription** | Real-time SSE event streaming | [Reference](TOOLS_REFERENCE.md#-event-subscription-subscribe_events) |

### Smart Features (2 tools)

| Tool | Description | Documentation |
|------|-------------|---------------|
| 🔧 **Maintenance** | Find orphaned devices, analyze usage, energy monitoring | [Reference](SMART_FEATURES.md#maintenance-tool) |
| 🧠 **Smart Scenarios** | Nobody home, window/heating conflicts, energy saving | [Reference](SMART_FEATURES.md#smart-scenarios-tool) |

→ **[View Complete Tools Reference](TOOLS_REFERENCE.md)** for detailed documentation

---

## 🆘 Support & Resources

### Get Help

- 💬 **[GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)** - Ask questions and get community help
- 🐛 **[Issue Tracker](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues)** - Report bugs and request features
- 📖 **[FAQ](FAQ.md)** - Frequently asked questions
- 🔧 **[Troubleshooting](TROUBLESHOOTING.md)** - Solve common problems

### External Resources

- 🏠 **[Home Assistant Documentation](https://www.home-assistant.io/docs/)** - Official HA docs
- 🤖 **[Model Context Protocol](https://modelcontextprotocol.io/)** - MCP specification
- 📦 **[Smithery.ai](https://smithery.ai)** - MCP server registry
- ⭐ **[GitHub Repository](https://github.com/jango-blockchained/advanced-homeassistant-mcp)** - Source code

---

## 🎯 Quick Navigation

| Category | Documentation |
|----------|--------------|
| 🎬 Getting Started | [README](../README.md) |
| 🛠️ All Tools | [Tools Reference](./TOOLS_REFERENCE.md) |
| 🧠 Smart Features | [Smart Features](./SMART_FEATURES.md) |
| 💬 Usage Examples | [Quick Start](./QUICK_START_SCENARIOS.md) |
| 🏗️ Development | [Implementation](./IMPLEMENTATION_SUMMARY.md) |

---

---

**Ready to get started?** Begin with the [Quick Start Guide](../README.md#-quick-start)!

**Need help?** Check out our [Quick Start Scenarios](./QUICK_START_SCENARIOS.md) for AI assistant examples.

---

## 📄 License

MIT License - see [LICENSE](https://github.com/jango-blockchained/advanced-homeassistant-mcp/blob/main/LICENSE) for details.

---

Transform your smart home into an AI-powered experience 🚀
