# 📚 Real-World Examples

Comprehensive collection of real-world usage examples for Home Assistant MCP. Learn through practical scenarios and patterns.

## 📋 Table of Contents

- [Daily Routines](#daily-routines)
- [Lighting Scenarios](#lighting-scenarios)
- [Climate Control](#climate-control)
- [Entertainment & Media](#entertainment--media)
- [Security & Safety](#security--safety)
- [Energy Management](#energy-management)
- [Automation Workflows](#automation-workflows)
- [Smart Home Scenes](#smart-home-scenes)
- [Maintenance & Monitoring](#maintenance--monitoring)
- [Advanced Patterns](#advanced-patterns)

---

## Daily Routines

### Morning Routine

**Scenario:** Start your day with automated morning routine

**User asks:**
```
"Good morning! Please activate my morning routine"
```

**AI Response:**
```
I'll activate your morning routine:

1. Gradually increasing bedroom lights to 100%
2. Setting thermostat to 72°F
3. Opening bedroom blinds
4. Starting coffee maker
5. Playing morning news on kitchen speaker

All done! Your morning routine is active.
```

**What happens:**
```javascript
// Lights
{
  "action": "turn_on",
  "entity_id": "light.bedroom",
  "brightness": 255,
  "transition": 30  // 30 seconds gradual
}

// Climate
{
  "action": "set_temperature",
  "entity_id": "climate.bedroom",
  "temperature": 72
}

// Covers
{
  "action": "open_cover",
  "entity_id": "cover.bedroom_blinds"
}

// Switches
{
  "action": "turn_on",
  "entity_id": "switch.coffee_maker"
}

// Media
{
  "action": "play_media",
  "entity_id": "media_player.kitchen_speaker",
  "media_content_id": "news_playlist"
}
```

### Evening Wind-Down

**User asks:**
```
"It's bedtime, help me wind down"
```

**AI Response:**
```
Setting up your wind-down routine:

✓ Locked all doors
✓ Dimmed living room lights to 20%
✓ Set bedroom lights to warm white
✓ Reduced thermostat to 68°F
✓ Closed all blinds
✓ Activated security system
✓ Playing relaxing music in bedroom

Sleep well!
```

### Leaving Home

**User asks:**
```
"I'm leaving home for the day, make sure everything is secure"
```

**AI Response:**
```
Activating away mode:

Security:
✓ All doors locked
✓ Security system armed
✓ Cameras activated

Energy Saving:
✓ All lights turned off
✓ Thermostats set to eco mode (62°F)
✓ Unnecessary devices powered off

Smart Checks:
✓ All windows closed
✓ Garage door closed
✓ No water leaks detected

Everything is secure. Have a great day!
```

### Arriving Home

**User asks:**
```
"I'm home! Welcome me back"
```

**AI Response:**
```
Welcome home! Setting up:

✓ Unlocked front door
✓ Turned on entry lights
✓ Set climate to comfortable 72°F
✓ Opened living room blinds
✓ Disarmed security system
✓ Playing your favorite music

Currently:
- Temperature: 72°F
- 5 lights on
- Climate adjusting

Enjoy your evening!
```

---

## Lighting Scenarios

### Reading Mode

**User asks:**
```
"Set up lighting for reading in the living room"
```

**AI does:**
```javascript
// Main lights at medium brightness
{
  "action": "turn_on",
  "entity_id": "light.living_room_main",
  "brightness": 180,  // ~70%
  "color_temp": 400   // Warm white
}

// Reading lamp at full brightness
{
  "action": "turn_on",
  "entity_id": "light.reading_lamp",
  "brightness": 255,
  "color_temp": 450   // Very warm
}

// Ambient lights dimmed
{
  "action": "turn_on",
  "entity_id": "light.living_room_accent",
  "brightness": 50
}
```

### Movie Night

**User asks:**
```
"Set up movie night lighting"
```

**AI Response:**
```
Creating cinema atmosphere:

✓ Dimmed all living room lights to 10%
✓ Set lights to warm red/orange glow
✓ Turned off bright overhead lights
✓ Reduced hallway brightness
✓ Set TV backlight to blue

Ready for movie night! 🍿
```

**Implementation:**
```javascript
// Dim main lights
{
  "entity_id": "light.living_room",
  "brightness": 25,
  "rgb_color": [255, 100, 0]  // Warm orange
}

// TV backlight
{
  "entity_id": "light.tv_backlight",
  "brightness": 128,
  "rgb_color": [0, 50, 255]  // Blue
}
```

### Party Mode

**User asks:**
```
"Set up colorful party lighting"
```

**AI creates:**
```javascript
// Living room - rotating colors
{
  "entity_id": "light.living_room",
  "effect": "colorloop",
  "brightness": 255
}

// Kitchen - bright white
{
  "entity_id": "light.kitchen",
  "brightness": 255,
  "color_temp": 250  // Cool white
}

// Bedroom - dim red
{
  "entity_id": "light.bedroom_rgb",
  "brightness": 100,
  "rgb_color": [255, 0, 0]
}
```

### Focus/Work Mode

**User asks:**
```
"I need to focus and work, adjust lighting please"
```

**AI Response:**
```
Setting up productive workspace:

✓ Office lights: Bright cool white (100%, 5000K)
✓ Desk lamp: Maximum brightness
✓ Ambient lights: Off to reduce distractions
✓ Monitor backlight: Neutral white

Lighting optimized for focus and productivity!
```

---

## Climate Control

### Temperature Management

**User asks:**
```
"It's too hot, cool down the house"
```

**AI Response:**
```
Cooling your home:

✓ Set all thermostats to cooling mode
✓ Target temperature: 70°F
✓ Fan mode: High for faster cooling
✓ Closed blinds to block sun
✓ Turned on ceiling fans

Current temps:
- Living room: 76°F → targeting 70°F
- Bedroom: 75°F → targeting 70°F
- Kitchen: 77°F → targeting 70°F

Should reach target in ~20 minutes.
```

### Energy Efficient Heating

**User asks:**
```
"Heat the house efficiently"
```

**AI Response:**
```
Implementing energy-efficient heating:

✓ Set occupied rooms to 70°F (living room, bedroom)
✓ Set unoccupied rooms to 65°F (guest room, office)
✓ Closed windows (all confirmed closed)
✓ Fan mode: Auto (energy saving)
✓ Schedule: Night setback to 65°F at 10 PM

Energy saving tips:
- Currently using eco mode
- Estimated 20% energy savings
- Windows closed prevents heat loss

Comfort maintained with optimized efficiency!
```

### Room-Specific Climate

**User asks:**
```
"Make the bedroom cool for sleeping but keep living room comfortable"
```

**AI manages:**
```javascript
// Bedroom - cool for sleeping
{
  "entity_id": "climate.bedroom",
  "temperature": 68,
  "hvac_mode": "cool",
  "fan_mode": "low"  // Quiet
}

// Living room - comfortable
{
  "entity_id": "climate.living_room",
  "temperature": 72,
  "hvac_mode": "auto"
}
```

---

## Entertainment & Media

### Multi-Room Audio

**User asks:**
```
"Play my workout playlist throughout the house"
```

**AI Response:**
```
Playing workout playlist on all speakers:

✓ Living room speaker - Volume: 60%
✓ Kitchen speaker - Volume: 70%
✓ Bedroom speaker - Volume: 50%
✓ Bathroom speaker - Volume: 40%

All synchronized and playing "Workout Mix 2024"
Use "stop all music" to stop playback.
```

### Movie Setup

**User asks:**
```
"Set up the TV for movie watching"
```

**AI does:**
```
Movie setup complete:

TV & Sound:
✓ TV powered on
✓ Switched to HDMI 1 (Apple TV)
✓ Sound mode: Cinema
✓ Volume: 35
✓ Subwoofer enabled

Lighting:
✓ Dimmed to 10%
✓ Warm orange ambiance

Climate:
✓ Set to 71°F

Ready to start your movie!
```

### Music by Room

**User asks:**
```
"Play jazz in the kitchen, classical in the office"
```

**AI creates:**
```javascript
// Kitchen - Jazz
{
  "entity_id": "media_player.kitchen_speaker",
  "media_content_id": "spotify:playlist:jazz",
  "media_content_type": "music",
  "volume_level": 0.6
}

// Office - Classical
{
  "entity_id": "media_player.office_speaker",
  "media_content_id": "spotify:playlist:classical",
  "volume_level": 0.4
}
```

---

## Security & Safety

### Security Check

**User asks:**
```
"Is my home secure?"
```

**AI Response:**
```
Security Status Report:

Locks: ✓ All Secure
- Front door: Locked
- Back door: Locked
- Garage door: Closed and locked

Windows: ⚠️ 1 Issue
- Living room window: OPEN
- All others: Closed

Alarms:
- Security system: Armed (Away mode)
- Smoke detectors: Normal
- CO detectors: Normal

Cameras:
- Front door: Recording
- Backyard: Recording
- Driveway: Recording

Recommendation: Close living room window before leaving.
```

### Night Security

**User asks:**
```
"Activate night security mode"
```

**AI Response:**
```
Night security activated:

✓ All exterior doors locked
✓ Security system armed (Night mode)
✓ Motion sensors: Active
✓ Cameras: Night vision enabled
✓ Exterior lights: Motion-activated
✓ Interior lights: Minimal night lighting

Alert settings:
- Door/window sensors: Instant alert
- Motion detection: Delayed alert (30s)
- Glass break: Instant alert

Sleep securely!
```

### Vacation Mode

**User asks:**
```
"We're going on vacation for a week, secure the house"
```

**AI Response:**
```
Vacation mode activated:

Security (Maximum):
✓ All doors/windows locked
✓ Security system: Armed (Away)
✓ All cameras: 24/7 recording
✓ Alerts: Sent to all phones

Presence Simulation:
✓ Random light schedules (7pm-11pm)
✓ Living room TV timer
✓ Periodic blind movements

Energy Saving:
✓ Thermostats: Eco mode (60°F)
✓ Water heater: Vacation mode
✓ All non-essential devices: Off

Safety:
✓ Stove/oven: Verified off
✓ Water main: Consider closing
✓ HVAC: Minimal operation

Notifications enabled for any alerts.
Have a great vacation!
```

---

## Energy Management

### Energy Audit

**User asks:**
```
"Show me my energy usage and waste"
```

**AI Response:**
```
Energy Consumption Analysis:

Current Usage:
- Total power: 2.4 kW
- Estimated cost: $0.35/hour

Top Consumers:
1. HVAC System: 1.2 kW (50%)
2. Water Heater: 0.5 kW (21%)
3. Entertainment: 0.3 kW (13%)
4. Lights: 0.2 kW (8%)
5. Other: 0.2 kW (8%)

Energy Waste Detected:
⚠️ 3 lights on in empty rooms
⚠️ TV on standby (5W phantom load)
⚠️ AC running with window open

Recommendations:
1. Close bedroom window to save ~$0.50/day
2. Turn off unused lights to save ~$0.10/day
3. Reduce thermostat by 2°F to save ~$1.20/day

Potential monthly savings: ~$55
```

### Cost Optimization

**User asks:**
```
"Help me reduce my energy bill"
```

**AI Response:**
```
Energy Optimization Plan:

Immediate Actions:
✓ Turned off 5 unnecessary lights
✓ Adjusted thermostats to eco-friendly temps
✓ Powered off standby devices
✓ Optimized water heater schedule

Estimated immediate savings: $0.45/hour

Schedule Changes:
✓ Peak hours (2pm-7pm): Minimal usage
✓ Off-peak hours: Heavy usage shifted
✓ Night mode: Reduced climate control

Smart Automation:
✓ Auto lights off when rooms empty
✓ Climate based on occupancy
✓ Appliance scheduling

Weekly Report:
- Previous week: $45
- This week (projected): $32
- Savings: $13 (29%)

Monthly projected savings: ~$55
```

### Solar Integration

**User asks:**
```
"Optimize usage with my solar panels"
```

**AI Response:**
```
Solar Optimization Active:

Current Status:
- Solar production: 3.2 kW
- Home usage: 2.1 kW
- Grid export: 1.1 kW (earning credits)

Schedule Recommendations:
✓ Run dishwasher now (peak solar)
✓ Charge EV during day (free solar)
✓ Delay AC until evening (grid cheaper)

Battery Status (if applicable):
- Charge level: 85%
- Mode: Self-consumption
- Reserved for peak hours

Today's Performance:
- Generated: 18 kWh
- Consumed: 12 kWh
- Exported: 6 kWh
- Cost savings: $3.20

Maximizing your solar investment!
```

---

## Automation Workflows

### Create Morning Automation

**User asks:**
```
"Create an automation that runs every morning at 7 AM"
```

**AI Response:**
```
Created "Morning Routine" automation:

Trigger:
- Time: 7:00 AM (Monday-Friday)

Actions:
1. Gradual lights on (30 min before, 20% → 100%)
2. Set thermostat to 72°F
3. Open bedroom blinds
4. Start coffee maker
5. Play news on kitchen speaker
6. Send notification: "Good morning!"

The automation is now active and will run every weekday at 7 AM.
Would you like to test it now?
```

### Presence-Based Automation

**User asks:**
```
"Turn off lights automatically when I leave"
```

**AI Response:**
```
Created "Away Mode" automation:

Trigger:
- All persons leave home
- Wait 5 minutes (grace period)

Conditions:
- House mode: Not "Guest"
- Time: Not during party hours

Actions:
1. Turn off all lights
2. Set thermostats to eco mode
3. Lock all doors
4. Arm security system
5. Close garage door
6. Send notification

This automation is now active.
Test by: "Simulate leaving home"
```

### Motion-Activated Lights

**User asks:**
```
"Turn on hallway lights when motion detected at night"
```

**AI creates:**
```yaml
alias: "Hallway Night Lights"
trigger:
  - platform: state
    entity_id: binary_sensor.hallway_motion
    to: 'on'
condition:
  - condition: time
    after: '21:00:00'
    before: '06:00:00'
action:
  - service: light.turn_on
    target:
      entity_id: light.hallway
    data:
      brightness: 50
      color_temp: 450  # Warm
  - delay: '00:02:00'
  - service: light.turn_off
    target:
      entity_id: light.hallway
```

---

## Smart Home Scenes

### Dinner Scene

**User asks:**
```
"Activate dinner scene"
```

**AI Response:**
```
Activating "Dinner Time" scene:

Dining Room:
✓ Chandelier: 80% brightness, warm white
✓ Accent lights: 30%, amber glow

Kitchen:
✓ Task lights: 100%, bright white
✓ Under-cabinet: 60%

Living Room:
✓ Dimmed to 20% (ambient)

Climate:
✓ Comfortable 72°F

Music:
✓ Soft jazz, volume 25%

Enjoy your meal!
```

### Guest Mode

**User asks:**
```
"I have guests coming, prepare the house"
```

**AI Response:**
```
Guest Mode activated:

Lighting:
✓ Entry: Bright welcome (100%)
✓ Living room: Social setting (70%)
✓ Bathroom: Bright and clean (100%)
✓ Kitchen: Task ready (80%)

Climate:
✓ All rooms: Comfortable 72°F
✓ Fresh air circulation

Entertainment:
✓ Background music: Ambient playlist
✓ TV: Ready on home screen

Privacy:
✓ Bedroom doors: Closed
✓ Private cameras: Temporarily disabled

Your home is ready to welcome guests!
```

---

## Maintenance & Monitoring

### Health Check

**User asks:**
```
"Check the health of my smart home"
```

**AI Response:**
```
Smart Home Health Report:

Overall Status: ✓ Good

Entities:
- Total: 156
- Available: 152 (97%)
- Unavailable: 4 (3%)

Issues Found:
⚠️ sensor.garage_temperature - Offline 3 days
⚠️ light.guest_room_2 - Battery low (15%)
⚠️ binary_sensor.back_door - Not responding
⚠️ switch.outdoor_outlet - Unavailable

Recent Changes:
- 2 devices added this week
- 1 firmware update pending

Battery Status:
- 3 devices need replacement (<20%)
- 8 devices good (>60%)

Recommendations:
1. Replace garage temperature sensor battery
2. Check back door sensor connection
3. Update outdoor outlet firmware

System Performance: Excellent
Network: Stable
```

### Find Unused Devices

**User asks:**
```
"Which devices haven't been used in a while?"
```

**AI Response:**
```
Unused Device Report:

Lights (30+ days no use):
- light.guest_room_closet
- light.basement_storage
- light.attic

Sensors (60+ days no activity):
- binary_sensor.spare_room_motion
- sensor.old_temperature

Switches (30+ days off):
- switch.holiday_decorations
- switch.pool_pump (seasonal)

Recommendations:
- Consider removing guest room closet light from dashboards
- Verify spare room sensor is working
- Archive seasonal devices

Would you like to:
1. Remove unused devices?
2. Keep but hide from main dashboard?
3. Set up reminder to check these?
```

---

## Advanced Patterns

### Conditional Automation

**User asks:**
```
"Only cool the bedroom if it's hot AND we're home"
```

**AI creates:**
```yaml
automation:
  trigger:
    - platform: numeric_state
      entity_id: sensor.bedroom_temperature
      above: 75
  condition:
    - condition: state
      entity_id: person.user
      state: 'home'
    - condition: time
      after: '21:00:00'
      before: '23:00:00'
  action:
    - service: climate.set_temperature
      target:
        entity_id: climate.bedroom
      data:
        temperature: 70
        hvac_mode: 'cool'
```

### Multi-Condition Scene

**User asks:**
```
"Create a sunset scene that only activates if I'm home and it's after 6 PM"
```

**AI Response:**
```
Created conditional "Sunset" scene:

Conditions (all must be true):
✓ Time after 6:00 PM
✓ Someone home
✓ Sun below horizon
✓ Not already night mode

Scene Actions:
1. Warm lights (2700K, 60%)
2. Close blinds gradually
3. Reduce thermostat 2°F
4. Ambient music (volume 20%)

This scene automatically checks conditions before activating.
```

### Template-Based Automation

**User asks:**
```
"Adjust fan speed based on room temperature"
```

**AI creates:**
```yaml
automation:
  trigger:
    - platform: state
      entity_id: sensor.room_temperature
  action:
    - service: fan.set_percentage
      target:
        entity_id: fan.bedroom
      data:
        percentage: >
          {% if states('sensor.room_temperature')|float < 72 %}
            0
          {% elif states('sensor.room_temperature')|float < 75 %}
            33
          {% elif states('sensor.room_temperature')|float < 78 %}
            66
          {% else %}
            100
          {% endif %}
```

---

## Next Steps

**Learn More:**
- [Tools Reference](TOOLS_REFERENCE.md) - All available commands
- [Smart Features](SMART_FEATURES.md) - Advanced features
- [Configuration](CONFIGURATION.md) - Customize your setup
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

**Get Help:**
- 💬 [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)
- 📖 [Full Documentation](index.md)

---

**Ready to create your own automations?** Start with simple commands and build up to complex workflows! 🚀
