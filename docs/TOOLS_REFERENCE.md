# 🛠️ Complete Tools Reference

This document provides a comprehensive reference for all available MCP tools in the Home Assistant MCP server.

## Table of Contents

- [Device Control Tools](#device-control-tools)
- [Automation Tools](#automation-tools)
- [System & Management Tools](#system--management-tools)
- [Smart Features](#smart-features)

---

## Device Control Tools

### 🔦 Lights Control (`lights_control`)

Control all aspects of your lighting system.

**Actions:**
- `list` - Get all lights
- `get` - Get specific light details
- `turn_on` - Turn on light(s)
- `turn_off` - Turn off light(s)

**Parameters:**
```typescript
{
  action: "list" | "get" | "turn_on" | "turn_off",
  entity_id?: string,        // Light entity ID
  brightness?: number,        // 0-255
  color_temp?: number,        // 153-500 mireds
  rgb_color?: [number, number, number]  // [R, G, B] 0-255
}
```

**Examples:**
```javascript
// List all lights
{ "action": "list" }

// Turn on with brightness
{ "action": "turn_on", "entity_id": "light.living_room", "brightness": 200 }

// Set RGB color
{ "action": "turn_on", "entity_id": "light.bedroom", "rgb_color": [255, 0, 0] }
```

---

### 🌡️ Climate Control (`climate_control`)

Manage thermostats, HVAC systems, and climate devices.

**Actions:**
- `list` - Get all climate devices
- `get` - Get specific climate device
- `set_hvac_mode` - Change heating/cooling mode
- `set_temperature` - Set target temperature
- `set_fan_mode` - Change fan speed

**Parameters:**
```typescript
{
  action: "list" | "get" | "set_hvac_mode" | "set_temperature" | "set_fan_mode",
  entity_id?: string,
  hvac_mode?: "off" | "heat" | "cool" | "auto" | "dry" | "fan_only",
  temperature?: number,
  target_temp_low?: number,
  target_temp_high?: number,
  fan_mode?: "auto" | "low" | "medium" | "high"
}
```

**Examples:**
```javascript
// Set heating to 22°C
{ "action": "set_temperature", "entity_id": "climate.living_room", "temperature": 22 }

// Change to cooling mode
{ "action": "set_hvac_mode", "entity_id": "climate.bedroom", "hvac_mode": "cool" }
```

---

### 📺 Media Player Control (`media_player_control`)

Control media playback, volume, and sources.

**Actions:**
- `list` - Get all media players
- `get` - Get specific player
- `turn_on` / `turn_off` / `toggle` - Power control
- `play_media` - Play specific media
- `media_play` / `media_pause` / `media_stop` - Playback control
- `media_next_track` / `media_previous_track` - Track navigation
- `volume_up` / `volume_down` / `volume_set` / `volume_mute` - Volume control
- `select_source` - Change input source
- `select_sound_mode` - Change audio mode

**Parameters:**
```typescript
{
  action: string,
  entity_id?: string,
  media_content_id?: string,    // URL or media ID
  media_content_type?: string,  // "music", "video", "playlist"
  volume_level?: number,         // 0.0 - 1.0
  source?: string,
  sound_mode?: string
}
```

---

### 🪟 Cover Control (`cover_control`)

Control blinds, curtains, garage doors, and shades.

**Actions:**
- `list` - Get all covers
- `get` - Get specific cover
- `open_cover` - Open cover
- `close_cover` - Close cover
- `stop_cover` - Stop movement
- `toggle` - Toggle open/close
- `set_cover_position` - Set position (0-100)
- `open_cover_tilt` / `close_cover_tilt` - Tilt control
- `set_cover_tilt_position` - Set tilt angle

**Parameters:**
```typescript
{
  action: string,
  entity_id?: string,
  position?: number,      // 0-100 (0=closed, 100=open)
  tilt_position?: number  // 0-100
}
```

---

### 🔒 Lock Control (`lock_control`)

Control smart locks with optional code support.

**Actions:**
- `list` - Get all locks
- `get` - Get specific lock
- `lock` - Lock the lock
- `unlock` - Unlock the lock
- `open` - Open/unlatch lock

**Parameters:**
```typescript
{
  action: "list" | "get" | "lock" | "unlock" | "open",
  entity_id?: string,
  code?: string  // Optional PIN/code
}
```

---

### 💨 Fan Control (`fan_control`)

Control ceiling fans and ventilation.

**Actions:**
- `list` - Get all fans
- `get` - Get specific fan
- `turn_on` / `turn_off` / `toggle` - Power control
- `set_percentage` - Set speed (0-100)
- `set_preset_mode` - Use preset (auto, eco, smart, etc.)
- `oscillate` - Enable/disable oscillation
- `set_direction` - Change rotation direction

**Parameters:**
```typescript
{
  action: string,
  entity_id?: string,
  percentage?: number,        // 0-100
  preset_mode?: string,       // "auto", "smart", "eco", etc.
  oscillating?: boolean,
  direction?: "forward" | "reverse"
}
```

---

### 🤖 Vacuum Control (`vacuum_control`)

Control robot vacuums and scheduling.

**Actions:**
- `list` - Get all vacuums
- `get` - Get specific vacuum
- `start` - Start cleaning
- `pause` - Pause cleaning
- `stop` - Stop cleaning
- `return_to_base` - Return to dock
- `clean_spot` - Spot clean current area
- `locate` - Play sound to locate vacuum
- `set_fan_speed` - Set suction power
- `send_command` - Send vendor-specific command

**Parameters:**
```typescript
{
  action: string,
  entity_id?: string,
  fan_speed?: string,
  command?: string,
  params?: object
}
```

---

### 🚨 Alarm Control (`alarm_control`)

Manage security alarm systems.

**Actions:**
- `list` - Get all alarm systems
- `get` - Get specific alarm
- `alarm_disarm` - Disarm alarm
- `alarm_arm_home` - Arm in home mode
- `alarm_arm_away` - Arm in away mode
- `alarm_arm_night` - Arm in night mode
- `alarm_arm_vacation` - Arm in vacation mode
- `alarm_arm_custom_bypass` - Custom arm mode
- `alarm_trigger` - Manually trigger alarm

**Parameters:**
```typescript
{
  action: string,
  entity_id?: string,
  code?: string  // Security code if required
}
```

---

## Automation Tools

### ⚙️ Automation Management (`automation`)

List, toggle, and trigger automations.

**Actions:**
- `list` - Get all automations
- `toggle` - Enable/disable automation
- `trigger` - Manually trigger automation

**Parameters:**
```typescript
{
  action: "list" | "toggle" | "trigger",
  automation_id?: string
}
```

---

### 🎬 Scene Management (`scene`)

Activate predefined scenes.

**Actions:**
- `list` - Get all scenes
- `activate` - Activate a scene

**Parameters:**
```typescript
{
  action: "list" | "activate",
  scene_id?: string
}
```

---

### 🔧 Automation Config (`automation_config`)

Advanced automation creation and management.

**Actions:**
- `create` - Create new automation
- `update` - Update existing automation
- `delete` - Delete automation
- `duplicate` - Duplicate automation

**Parameters:**
```typescript
{
  action: "create" | "update" | "delete" | "duplicate",
  automation_id?: string,
  config?: AutomationConfig  // Full automation YAML structure
}
```

**Automation Config Structure:**
```typescript
{
  alias: string,
  description?: string,
  mode?: "single" | "parallel" | "queued" | "restart",
  trigger: AutomationTrigger[],
  condition?: AutomationCondition[],
  action: AutomationAction[]
}
```

---

## System & Management Tools

### 📋 Device Discovery (`list_devices`)

List and filter devices.

**Parameters:**
```typescript
{
  domain?: "light" | "climate" | "switch" | "sensor" | etc.,
  area?: string,
  floor?: string
}
```

**Examples:**
```javascript
// All lights
{ "domain": "light" }

// All devices in living room
{ "area": "living_room" }
```

---

### 🎛️ Generic Control (`control`)

Universal device control interface.

**Commands:**
- `turn_on` / `turn_off` / `toggle`
- `open` / `close` / `stop`
- `set_position` / `set_tilt_position`
- `set_temperature` / `set_hvac_mode` / `set_fan_mode`
- `set_humidity`

**Parameters:**
```typescript
{
  command: string,
  entity_id?: string,
  area_id?: string,  // Control all devices in area
  state?: string,
  // Plus any device-specific parameters
}
```

---

### 📱 Notifications (`notify`)

Send notifications through Home Assistant.

**Parameters:**
```typescript
{
  message: string,
  title?: string,
  target?: string,  // Specific notification service
  data?: object     // Additional notification data
}
```

**Examples:**
```javascript
// Simple notification
{ "message": "Dinner is ready!" }

// With title and target
{
  "message": "Motion detected",
  "title": "Security Alert",
  "target": "mobile_app_phone"
}
```

---

### 📊 History (`get_history`)

Get historical state data.

**Parameters:**
```typescript
{
  entity_id: string,
  start_time?: string,  // ISO format
  end_time?: string,
  minimal_response?: boolean,
  significant_changes_only?: boolean
}
```

---

### 📦 Add-on Management (`addon`)

Manage Home Assistant add-ons.

**Actions:**
- `list` - Get all add-ons
- `info` - Get add-on details
- `install` - Install add-on
- `uninstall` - Remove add-on
- `start` / `stop` / `restart` - Control add-on

**Parameters:**
```typescript
{
  action: string,
  slug?: string,
  version?: string
}
```

---

### 📦 Package Management (`package`)

Manage HACS packages and custom components.

**Actions:**
- `list` - Get installed packages
- `install` - Install package
- `uninstall` - Remove package
- `update` - Update package

**Parameters:**
```typescript
{
  action: string,
  category: "integration" | "plugin" | "theme" | "python_script" | "appdaemon" | "netdaemon",
  repository?: string,
  version?: string
}
```

---

### 🔔 Event Subscription (`subscribe_events`)

Subscribe to Home Assistant events via SSE.

**Parameters:**
```typescript
{
  token: string,
  events?: string[],
  entity_id?: string,
  domain?: string
}
```

---

### 📈 SSE Statistics (`get_sse_stats`)

Get Server-Sent Events connection statistics.

**Parameters:**
```typescript
{
  token: string
}
```

---

## Smart Features

### 🔧 Maintenance Tool (`maintenance`)

Spook-like maintenance and analysis features.

**Actions:**

#### `find_orphaned_devices`
Find devices that are unavailable, unknown, or haven't been updated recently.

```typescript
{
  action: "find_orphaned_devices",
  days?: number  // Default: 30
}
```

**Returns:** List of orphaned devices with reasons.

#### `analyze_light_usage`
Analyze light usage patterns across your home.

```typescript
{
  action: "analyze_light_usage",
  days?: number  // Analysis period (default: 30)
}
```

**Returns:**
- Total lights by state
- Lights by room/area
- Never-used lights
- Usage recommendations

#### `analyze_energy_consumption`
Monitor and analyze energy consumption.

```typescript
{
  action: "analyze_energy_consumption",
  days?: number
}
```

**Returns:**
- Energy/power sensor counts
- Current consumption readings
- High consumers (>100W or >1kWh)
- Energy saving recommendations

#### `find_unavailable_entities`
List all unavailable or unknown entities.

```typescript
{
  action: "find_unavailable_entities",
  entity_filter?: string  // Domain filter (e.g., "light", "sensor")
}
```

#### `device_health_check`
Comprehensive health check of all entities.

```typescript
{
  action: "device_health_check"
}
```

**Returns:**
- Total vs healthy/unavailable counts
- Low battery devices (<20%)
- Offline devices by domain
- Health breakdown and issues

#### `cleanup_orphaned_entities`
Clean up orphaned entities (planned - currently manual).

```typescript
{
  action: "cleanup_orphaned_entities",
  cleanup: boolean  // Must be true to confirm
}
```

---

### 🧠 Smart Scenarios Tool (`smart_scenarios`)

Intelligent scenario detection and automation.

**Actions:**

#### `detect_scenarios`
Detect all smart home scenarios at once.

```typescript
{
  action: "detect_scenarios",
  mode?: "detect" | "apply" | "auto",  // Default: "detect"
  enable_notifications?: boolean        // Default: true
}
```

**Detects:**
- Nobody home situations
- Window/heating conflicts
- Energy saving opportunities
- Inefficient settings

#### `apply_nobody_home`
Execute nobody-home scenario actions.

```typescript
{
  action: "apply_nobody_home",
  mode?: "detect" | "apply",
  rooms?: string[],                    // Specific rooms
  temperature_reduction?: number,       // Degrees (default: 3)
  enable_notifications?: boolean
}
```

**Actions (when mode="apply"):**
- Turn off all lights (or filtered by rooms)
- Set climate to eco mode OR reduce temperature
- Send notification

#### `apply_window_heating_check`
Detect and resolve window/heating conflicts.

```typescript
{
  action: "apply_window_heating_check",
  mode?: "detect" | "apply",
  enable_notifications?: boolean
}
```

**Actions (when mode="apply"):**
- Turn off heating in rooms with open windows
- Send notification about conflicts resolved

#### `detect_issues`
Focus on problematic scenarios only.

```typescript
{
  action: "detect_issues"
}
```

**Returns:**
- Window/heating conflicts
- Energy saving opportunities
- Total issue count

#### Future Actions (Planned)
- `apply_motion_lighting` - Motion-based lighting
- `apply_energy_saving` - Energy optimization
- `apply_night_mode` - Night mode automation
- `apply_arrival_home` - Arrival detection
- `create_automation` - Auto-create automations

---

## Usage Patterns

### With AI Assistants

When using with AI assistants, you can use natural language:

```
"Turn on the living room lights"
"Set bedroom temperature to 22 degrees"
"Check my home health"
"Are any windows open with heating on?"
"I'm leaving home, turn everything off"
```

### Direct API Calls

```bash
# Via HTTP
curl -X POST http://localhost:3000/api/tools/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "lights_control", "params": {"action": "turn_on", "entity_id": "light.living_room"}}'

# Via WebSocket
ws://localhost:3000/api/ws
```

### MCP Protocol

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "lights_control",
    "arguments": {
      "action": "turn_on",
      "entity_id": "light.living_room",
      "brightness": 200
    }
  }
}
```

---

## Error Handling

All tools follow consistent error handling:

**Success Response:**
```json
{
  "success": true,
  "result": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Errors:**
- `ENTITY_NOT_FOUND` - Entity doesn't exist
- `INVALID_PARAMETERS` - Invalid tool parameters
- `PERMISSION_DENIED` - Insufficient permissions
- `SERVICE_ERROR` - Home Assistant service error
- `CONNECTION_ERROR` - HA connection issue

---

## Best Practices

1. **Use Specific Entity IDs**: More reliable than area-based control
2. **Check State Before Actions**: Use `get` actions to verify current state
3. **Handle Errors Gracefully**: Always check response status
4. **Use Appropriate Modes**: Start with "detect" before "apply"
5. **Enable Notifications**: Stay informed of automated actions
6. **Regular Health Checks**: Use maintenance tool weekly/monthly
7. **Group Related Actions**: Use scenes for multi-device control
8. **Test Automations**: Use `trigger` to test before scheduling

---

## Tool Categories Summary

**Device Control** (13 tools):
- lights_control, climate_control, media_player_control
- cover_control, lock_control, fan_control, vacuum_control
- alarm_control, control (generic)

**Automation** (3 tools):
- automation, scene, automation_config

**System Management** (6 tools):
- list_devices, notify, get_history
- addon, package, subscribe_events, get_sse_stats

**Smart Features** (2 tools):
- maintenance, smart_scenarios

**Total: 24 Tools** providing comprehensive Home Assistant control.

---

## Additional Resources

- [Smart Features Documentation](./SMART_FEATURES.md)
- [Quick Start Guide](./QUICK_START_SCENARIOS.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Home Assistant Docs](https://www.home-assistant.io/docs/)

---

**Need Help?** Check the troubleshooting section or open an issue on GitHub!
