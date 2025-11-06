# 📚 Home Assistant MCP Documentation

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jango-blockchained/advanced-homeassistant-mcp/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.0.26-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.0.0-blue.svg)](https://www.typescriptlang.org)
[![smithery badge](https://smithery.ai/badge/@jango-blockchained/homeassitant-mcp)](https://smithery.ai/server/@jango-blockchained/homeassitant-mcp)

> **Complete documentation hub for Home Assistant MCP Server** 📖

Your gateway to mastering AI-powered smart home control through the Model Context Protocol.

## 🚀 Quick Links

- **[README](../README.md)** - Project overview and quick start
- **[Complete Tools Reference](./TOOLS_REFERENCE.md)** - All 24 available tools
- **[Smart Features Guide](./SMART_FEATURES.md)** - Maintenance & Smart Scenarios
- **[Quick Start Scenarios](./QUICK_START_SCENARIOS.md)** - AI assistant usage examples

## 🚀 Quick Links

- **[README](../README.md)** - Project overview and quick start
- **[Complete Tools Reference](./TOOLS_REFERENCE.md)** - All 24 available tools
- **[Smart Features Guide](./SMART_FEATURES.md)** - Maintenance & Smart Scenarios
- **[Quick Start Scenarios](./QUICK_START_SCENARIOS.md)** - AI assistant usage examples

---

## 📖 Documentation Structure

### Getting Started
- **[Installation](../README.md#-installation)** - Multiple installation methods
- **[Configuration](../README.md#-configuration)** - Environment setup
- **[Quick Start](../README.md#-quick-start)** - Get running in minutes

### Core Features

#### Device Control
All tools for controlling your smart home devices:
- **[Lights Control](./TOOLS_REFERENCE.md#-lights-control-lights_control)** - Full lighting management
- **[Climate Control](./TOOLS_REFERENCE.md#️-climate-control-climate_control)** - HVAC and thermostats
- **[Media Players](./TOOLS_REFERENCE.md#-media-player-control-media_player_control)** - Audio/video control
- **[Covers](./TOOLS_REFERENCE.md#-cover-control-cover_control)** - Blinds, curtains, garage doors
- **[Locks](./TOOLS_REFERENCE.md#-lock-control-lock_control)** - Smart lock control
- **[Fans](./TOOLS_REFERENCE.md#-fan-control-fan_control)** - Fan speed and oscillation
- **[Vacuums](./TOOLS_REFERENCE.md#-vacuum-control-vacuum_control)** - Robot vacuum control
- **[Alarms](./TOOLS_REFERENCE.md#-alarm-control-alarm_control)** - Security systems

#### Automation
- **[Automation Management](./TOOLS_REFERENCE.md#️-automation-management-automation)** - List, toggle, trigger
- **[Scene Management](./TOOLS_REFERENCE.md#-scene-management-scene)** - Activate scenes
- **[Automation Config](./TOOLS_REFERENCE.md#-automation-config-automation_config)** - Create/update automations

#### System Management
- **[Device Discovery](./TOOLS_REFERENCE.md#-device-discovery-list_devices)** - List and filter devices
- **[Notifications](./TOOLS_REFERENCE.md#-notifications-notify)** - Send alerts
- **[History](./TOOLS_REFERENCE.md#-history-get_history)** - Query historical data
- **[Add-on Management](./TOOLS_REFERENCE.md#-add-on-management-addon)** - Control add-ons
- **[Package Management](./TOOLS_REFERENCE.md#-package-management-package)** - HACS integration

### Smart Features 🆕

#### Maintenance Tool
Spook-like features for system health and cleanup:
- **[Find Orphaned Devices](./SMART_FEATURES.md#1-find_orphaned_devices)** - Detect unavailable devices
- **[Analyze Light Usage](./SMART_FEATURES.md#2-analyze_light_usage)** - Usage patterns by room
- **[Energy Consumption](./SMART_FEATURES.md#3-analyze_energy_consumption)** - Monitor power usage
- **[Device Health Check](./SMART_FEATURES.md#5-device_health_check)** - Comprehensive health scan
- **[Find Unavailable Entities](./SMART_FEATURES.md#4-find_unavailable_entities)** - List problematic entities

#### Smart Scenarios Tool
Intelligent automation detection and management:
- **[Nobody Home Detection](./SMART_FEATURES.md#nobody-home-detection)** - Auto turn off & reduce climate
- **[Window/Heating Conflicts](./SMART_FEATURES.md#windowheating-conflicts)** - Auto disable heating
- **[Energy Saving](./SMART_FEATURES.md#energy-saving-detection)** - Detect waste opportunities
- **[Scenario Detection](./QUICK_START_SCENARIOS.md#smart-scenarios-examples)** - All-in-one analysis

---

## 💡 Usage Examples

### For Users
- **[Quick Start Scenarios](./QUICK_START_SCENARIOS.md)** - Conversational examples with AI
- **[Example Commands](../README.md#-example-commands)** - Natural language queries

### For Developers
- **[Tools Reference](./TOOLS_REFERENCE.md)** - Complete API documentation
- **[Implementation Details](./IMPLEMENTATION_SUMMARY.md)** - Technical overview
- **[Architecture](../README.md#️-architecture)** - System design

---

## 🔧 Advanced Topics

### Deployment
- **[Smithery Deployment](../README.md#option-1-npx-easiest)** - One-click install
- **[Docker Deployment](../README.md#option-3-local-installation)** - Container setup
- **[Manual Installation](../README.md#option-4-from-source-most-flexible)** - From source

### Integration
- **[Claude Desktop](../README.md#claude-desktop)** - MCP client setup
- **[Cursor](../README.md#cursor)** - IDE integration
- **[VS Code](../README.md#vs-code--claude-extension)** - Editor integration

### Security
- **[Rate Limiting](../README.md#️-enterprise-grade-security)** - Protection features
- **[Authentication](../README.md#️-enterprise-grade-security)** - JWT tokens
- **[Input Sanitization](../README.md#️-enterprise-grade-security)** - XSS prevention

---

## 🎓 Tutorials & Guides

### Beginner
1. [Quick Start Guide](../README.md#-quick-start) - Get started in 5 minutes
2. [Basic Commands](../README.md#-example-commands) - Common operations
3. [Using with AI](./QUICK_START_SCENARIOS.md) - AI assistant examples

### Intermediate
1. [Device Control Patterns](./TOOLS_REFERENCE.md#usage-patterns) - Best practices
2. [Automation Creation](./TOOLS_REFERENCE.md#-automation-config-automation_config) - Building automations
3. [Scene Management](./TOOLS_REFERENCE.md#-scene-management-scene) - Organizing scenes

### Advanced
1. [Smart Scenarios](./SMART_FEATURES.md) - Intelligent automation
2. [Maintenance Tasks](./SMART_FEATURES.md#maintenance-tool) - System optimization
3. [Custom Integrations](./IMPLEMENTATION_SUMMARY.md) - Extending functionality

---

## 📊 Tool Categories

### Device Control (13 tools)
Control all your smart home devices through unified interfaces.
→ [See all Device Control tools](./TOOLS_REFERENCE.md#device-control-tools)

### Automation (3 tools)
Manage scenes, automations, and complex workflows.
→ [See all Automation tools](./TOOLS_REFERENCE.md#automation-tools)

### System Management (6 tools)
Device discovery, notifications, history, and package management.
→ [See all System Management tools](./TOOLS_REFERENCE.md#system-management-tools)

### Smart Features (2 tools)
AI-powered maintenance and scenario detection.
→ [See all Smart Feature tools](./TOOLS_REFERENCE.md#smart-features-tools)

**Total: 24 Tools** - See [Complete Reference](./TOOLS_REFERENCE.md)

---

## 🔍 Find What You Need

### By Task
- **Control Devices** → [Device Control Tools](./TOOLS_REFERENCE.md#device-control-tools)
- **Create Automations** → [Automation Tools](./TOOLS_REFERENCE.md#automation-tools)
- **System Health** → [Maintenance Tool](./SMART_FEATURES.md#maintenance-tool)
- **Energy Saving** → [Smart Scenarios](./SMART_FEATURES.md#smart-scenarios-tool)
- **Get Notified** → [Notifications](./TOOLS_REFERENCE.md#-notifications-notify)

### By Device Type
- **Lights** → [Lights Control](./TOOLS_REFERENCE.md#-lights-control-lights_control)
- **Thermostats** → [Climate Control](./TOOLS_REFERENCE.md#️-climate-control-climate_control)
- **Entertainment** → [Media Players](./TOOLS_REFERENCE.md#-media-player-control-media_player_control)
- **Security** → [Locks](./TOOLS_REFERENCE.md#-lock-control-lock_control) & [Alarms](./TOOLS_REFERENCE.md#-alarm-control-alarm_control)
- **Cleaning** → [Vacuums](./TOOLS_REFERENCE.md#-vacuum-control-vacuum_control)

### By Use Case
- **Leaving Home** → [Nobody Home Scenario](./SMART_FEATURES.md#nobody-home-detection)
- **Saving Energy** → [Energy Analysis](./SMART_FEATURES.md#energy-saving-detection)
- **Troubleshooting** → [Device Health Check](./SMART_FEATURES.md#device-health-check)
- **Media Control** → [Media Player Control](./TOOLS_REFERENCE.md#-media-player-control-media_player_control)

---

## 🆘 Support & Resources

### Documentation
- 📖 [Complete Tools Reference](./TOOLS_REFERENCE.md)
- 🚀 [Quick Start Guide](./QUICK_START_SCENARIOS.md)
- 🏗️ [Architecture Overview](../README.md#️-architecture)

### Community
- 💬 [GitHub Discussions](https://github.com/jango-blockchained/homeassistant-mcp/discussions)
- 🐛 [Issue Tracker](https://github.com/jango-blockchained/homeassistant-mcp/issues)
- ⭐ [GitHub Repository](https://github.com/jango-blockchained/homeassistant-mcp)

### External Resources
- 🏠 [Home Assistant Docs](https://www.home-assistant.io/docs/)
- 🤖 [Model Context Protocol](https://modelcontextprotocol.io/)
- 📦 [Smithery.ai](https://smithery.ai)

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
