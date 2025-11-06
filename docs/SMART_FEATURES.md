# Smart Home Features & Maintenance Tools

This document describes the new intelligent features added to the Home Assistant MCP server, including recursive maintenance tasks and smart scenario detection.

## Table of Contents
- [Maintenance Tool](#maintenance-tool)
- [Smart Scenarios Tool](#smart-scenarios-tool)
- [Usage Examples](#usage-examples)
- [Automation Examples](#automation-examples)

---

## Maintenance Tool

The maintenance tool provides Spook-like capabilities for cleaning up and analyzing your Home Assistant installation.

### Tool Name: `maintenance`

### Actions

#### 1. **find_orphaned_devices**
Finds devices that are unavailable, unknown, or haven't been updated in 30+ days.

**Parameters:**
- `action`: `"find_orphaned_devices"`
- `days`: Optional, number of days (default: 30)

**Returns:**
- List of orphaned devices with entity_id, state, and reason
- Recommendations for cleanup

#### 2. **analyze_light_usage**
Analyzes light usage patterns across your home.

**Parameters:**
- `action`: `"analyze_light_usage"`
- `days`: Optional, analysis period in days (default: 30)

**Returns:**
- Total lights count
- Lights currently on/off/unavailable
- Lights by room/area
- Lights never used in the specified period
- Recommendations for optimization

#### 3. **analyze_energy_consumption**
Monitors energy consumption and identifies high consumers.

**Parameters:**
- `action`: `"analyze_energy_consumption"`
- `days`: Optional, analysis period (default: 30)

**Returns:**
- Energy and power sensors found
- Current consumption readings
- High energy consumers (>100W or >1kWh)
- Recommendations

#### 4. **find_unavailable_entities**
Lists all unavailable or unknown state entities.

**Parameters:**
- `action`: `"find_unavailable_entities"`
- `entity_filter`: Optional, filter by domain (e.g., "light", "sensor")

**Returns:**
- List of unavailable entities by domain

#### 5. **device_health_check**
Comprehensive health check of all entities.

**Parameters:**
- `action`: `"device_health_check"`

**Returns:**
- Total entities vs healthy/unavailable/unknown counts
- Low battery devices (<20%)
- Offline devices list
- Health breakdown by domain
- List of issues found

#### 6. **cleanup_orphaned_entities** *(Planned)*
Would remove orphaned entities (currently requires manual removal).

**Parameters:**
- `action`: `"cleanup_orphaned_entities"`
- `cleanup`: Must be `true` to confirm

---

## Smart Scenarios Tool

Detects and manages common smart home scenarios automatically.

### Tool Name: `smart_scenarios`

### Actions

#### 1. **detect_scenarios**
Detects all smart scenarios at once.

**Parameters:**
- `action`: `"detect_scenarios"`
- `mode`: Optional, `"detect"` (default), `"apply"`, or `"auto"`
- `enable_notifications`: Optional, boolean (default: true)

**Returns:**
- Nobody home detection results
- Window/heating conflicts
- Energy saving opportunities
- Summary of total issues

**Scenarios Detected:**
- **Nobody Home**: Detects when all persons are away
- **Window Heating Conflict**: Heating active while windows open
- **Daytime Lights**: Lights on during bright daylight
- **Standby Power**: Devices consuming standby power
- **Inefficient Climate**: Climate set to inefficient temperatures

#### 2. **apply_nobody_home**
Executes the "nobody home" scenario actions.

**Parameters:**
- `action`: `"apply_nobody_home"`
- `mode`: `"detect"` or `"apply"`
- `rooms`: Optional, array of room names to limit scope
- `temperature_reduction`: Optional, degrees to reduce (default: 3)
- `enable_notifications`: Optional, boolean (default: true)

**Actions Taken (when mode="apply"):**
- Turns off all lights
- Sets climate devices to eco mode OR reduces temperature by specified amount
- Sends notification

#### 3. **apply_window_heating_check**
Manages window/heating conflicts.

**Parameters:**
- `action`: `"apply_window_heating_check"`
- `mode`: `"detect"` or `"apply"`
- `enable_notifications`: Optional, boolean (default: true)

**Actions Taken (when mode="apply"):**
- Turns off climate devices in rooms with open windows
- Sends notification about conflicts resolved

#### 4. **detect_issues**
Detects only problematic scenarios (window conflicts + energy waste).

**Parameters:**
- `action`: `"detect_issues"`

**Returns:**
- List of window/heating conflicts
- Energy saving opportunities
- Total count of issues

#### 5. **create_automation** *(Planned)*
Would create Home Assistant automations for detected scenarios.

---

## Usage Examples

### Example 1: Daily Health Check

```json
{
  "action": "device_health_check"
}
```

**Response includes:**
- Total entities: 245
- Healthy: 230 (93.8%)
- Unavailable: 12 (4.9%)
- Low battery devices: 3
- Recommendations

### Example 2: Find and Analyze Orphaned Devices

```json
{
  "action": "find_orphaned_devices",
  "days": 60
}
```

**Response:**
```json
{
  "action": "find_orphaned_devices",
  "total_found": 5,
  "devices": [
    {
      "entity_id": "sensor.old_temperature",
      "state": "unavailable",
      "friendly_name": "Old Temperature Sensor",
      "reason": "unavailable"
    }
  ],
  "recommendation": "Found 5 orphaned devices. Review and consider removing them..."
}
```

### Example 3: Detect All Smart Scenarios

```json
{
  "action": "detect_scenarios",
  "mode": "detect"
}
```

**Response includes:**
- Nobody home status
- Window/heating conflicts in each room
- Energy saving opportunities
- Summary of findings

### Example 4: Apply Nobody Home Mode

```json
{
  "action": "apply_nobody_home",
  "mode": "apply",
  "temperature_reduction": 5,
  "enable_notifications": true
}
```

**Actions:**
- Turns off 12 lights
- Reduces 3 climate devices by 5°C
- Sends notification: "Nobody home mode activated"

### Example 5: Check Window/Heating Conflicts

```json
{
  "action": "apply_window_heating_check",
  "mode": "apply"
}
```

**Response:**
```json
{
  "conflicts_found": 2,
  "conflicts": [
    {
      "scenario_type": "window_heating_conflict",
      "detected": true,
      "entities_affected": ["climate.living_room", "binary_sensor.living_room_window"],
      "current_state": "Window open in living_room while heating is active (target: 22°C, current: 18°C)",
      "recommended_action": "Turn off climate.living_room while window is open"
    }
  ],
  "actions_taken": [...],
  "mode": "apply"
}
```

### Example 6: Analyze Light Usage

```json
{
  "action": "analyze_light_usage",
  "days": 30
}
```

**Response:**
- Lights by room with on/off counts
- Lights unused for 30+ days
- Recommendations for automation

### Example 7: Energy Consumption Analysis

```json
{
  "action": "analyze_energy_consumption",
  "days": 7
}
```

**Response:**
- Power sensors found
- Current consumption list
- Top 10 high consumers
- Energy saving recommendations

---

## Automation Examples

### Generated Automation: Nobody Home

The tool can generate automation configs like this:

```yaml
alias: "Nobody Home - Auto Actions"
description: "Automatically turn off lights and reduce climate when nobody is home"
trigger:
  - platform: state
    entity_id: zone.home
    to: "0"
    for:
      minutes: 5
action:
  - service: light.turn_off
    target:
      entity_id:
        - light.living_room
        - light.kitchen
        - light.bedroom
  - service: climate.set_preset_mode
    target:
      entity_id:
        - climate.living_room
        - climate.bedroom
    data:
      preset_mode: eco
  - service: notify.notify
    data:
      message: "Nobody home mode activated"
      title: "Smart Home"
mode: single
```

### Generated Automation: Window Heating Control

```yaml
alias: "Window Open Climate Control - Living Room"
description: "Turn off heating when window opens, restore when closed"
trigger:
  - platform: state
    entity_id: binary_sensor.living_room_window
    to: "on"
condition:
  - condition: state
    entity_id: climate.living_room
    state:
      - heat
      - auto
action:
  - service: climate.turn_off
    target:
      entity_id: climate.living_room
  - wait_for_trigger:
      - platform: state
        entity_id: binary_sensor.living_room_window
        to: "off"
        for:
          minutes: 2
    timeout:
      hours: 4
  - service: climate.turn_on
    target:
      entity_id: climate.living_room
mode: restart
```

---

## Smart Home Best Practices

### Common Scenarios Covered

1. **Nobody Home**
   - Automatically turn off all lights
   - Reduce heating/cooling to eco mode
   - Disable unnecessary devices
   - Arm security system (if integrated)

2. **Window + Heating Conflict**
   - Detect open windows/doors
   - Turn off heating in affected rooms
   - Restore heating when window closes
   - Send notification to close windows

3. **Energy Saving**
   - Turn off daytime lights
   - Detect standby power consumption
   - Monitor inefficient climate settings
   - Suggest automation opportunities

4. **Arrival Home**
   - Detect when someone arrives
   - Turn on welcome lights
   - Restore climate to comfortable settings
   - Disarm security

5. **Night Mode**
   - Automatically dim/turn off lights
   - Reduce climate slightly
   - Enable night security features

6. **Motion-Based Lighting**
   - Turn on lights when motion detected
   - Auto-off after no motion
   - Adjust brightness based on time of day

---

## Integration with AI Assistants

These tools are designed to work seamlessly with AI assistants like Claude, ChatGPT, or Copilot through the MCP protocol.

**Example conversation:**
```
User: "Check if my smart home is healthy"
AI: [Uses maintenance tool with device_health_check]
    "Your system is 93% healthy. Found 3 devices with low battery
    and 2 unavailable sensors. Would you like me to show details?"

User: "Yes, and suggest what to do"
AI: [Provides battery device list and recommendations]
    "I recommend replacing batteries in these sensors. Also, 
    the bedroom motion sensor has been offline for 15 days..."
```

---

## Future Enhancements

- [ ] Automatic cleanup of orphaned entities
- [ ] Historical trend analysis for energy consumption
- [ ] Machine learning for usage pattern detection
- [ ] Automatic automation creation and deployment
- [ ] Integration with weather forecasts for climate optimization
- [ ] Presence detection improvements (WiFi, BLE)
- [ ] Cost calculation based on energy prices
- [ ] Maintenance scheduling and reminders

---

## Troubleshooting

### Tool Not Responding
- Verify Home Assistant connection
- Check HASS_TOKEN environment variable
- Ensure entities exist in your HA instance

### Scenarios Not Detected
- Verify presence detection entities exist (person.*, device_tracker.*)
- Check window/door sensors are properly configured
- Ensure climate devices are available

### Actions Not Applied
- Check Home Assistant permissions
- Verify entity IDs in error messages
- Review Home Assistant logs

---

## Contributing

Found a bug or have a suggestion for a new smart scenario? Please open an issue or submit a pull request!

## License

Same as the main project (see LICENSE file).
