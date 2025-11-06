# Smart Scenarios & Maintenance - Quick Start Guide

## Overview

This guide shows you how to use the new maintenance and smart scenarios tools with your AI assistant.

## Maintenance Tool Examples

### 1. Daily Health Check

Ask your AI assistant:
```
"Check the health of my Home Assistant devices"
```

The AI will use the `maintenance` tool to provide:
- Total entity count
- Healthy vs. problematic devices
- Low battery warnings
- Offline devices by domain
- Actionable recommendations

### 2. Find Orphaned Devices

```
"Find any devices that haven't been working properly"
```

Or be more specific:
```
"Show me all unavailable sensors"
"Find devices that haven't updated in 60 days"
```

The tool will identify:
- Unavailable entities
- Devices with unknown state
- Devices not updated recently
- Recommendations for cleanup

### 3. Light Usage Analysis

```
"Analyze my light usage patterns"
"Which lights are never used?"
"Show me my light usage by room"
```

Results include:
- Total lights and their states
- Lights grouped by room/area
- Lights unused for 30+ days
- Optimization suggestions

### 4. Energy Consumption Analysis

```
"Analyze my home energy consumption"
"Which devices use the most power?"
"Show me my energy sensors"
```

The tool provides:
- Power and energy sensor counts
- Current consumption readings
- Top 10 high consumers
- Energy saving recommendations

## Smart Scenarios Examples

### 1. Detect All Scenarios

```
"Check for any smart home issues or opportunities"
"Analyze my home automation setup"
```

The AI will detect:
- Nobody home situations
- Window/heating conflicts
- Energy saving opportunities
- Inefficient settings

### 2. Nobody Home Mode

**Detection only:**
```
"Am I wasting energy while nobody is home?"
"Check if I should turn things off"
```

**Apply actions:**
```
"I'm leaving home, activate nobody-home mode"
"Turn off lights and reduce heating, we're leaving"
```

Actions taken:
- Turns off all lights
- Sets climate to eco mode or reduces temperature
- Sends confirmation notification

### 3. Window/Heating Conflicts

**Detection:**
```
"Are any windows open while heating is on?"
"Check for window and heating conflicts"
```

**Auto-resolve:**
```
"Fix any window and heating conflicts"
"Turn off heating where windows are open"
```

The system will:
- Identify rooms with open windows and active heating
- Optionally turn off heating in those rooms
- Notify you of actions taken

### 4. Energy Saving Detection

```
"How can I save energy?"
"What's wasting energy in my home?"
```

Detects:
- Lights on during bright daylight
- Devices in standby mode consuming power
- Inefficient climate settings (too hot/cold)
- Unused devices

## Conversational Examples

### Example 1: Morning Check

**You:** "Good morning! How's my home doing?"

**AI:** *Uses device_health_check*
"Good morning! Your home is 94% healthy:
- 234 entities operational
- 3 devices need battery replacement
- 2 sensors offline (bedroom motion sensor for 5 days)
- Everything else looks good!

Would you like me to show the battery details?"

### Example 2: Before Vacation

**You:** "I'm going on vacation for 2 weeks. What should I do?"

**AI:** *Uses detect_scenarios and provides recommendations*
"Great! Here's what I recommend:
1. Currently 8 lights are on - shall I turn them off?
2. Your living room is heated to 22°C - reduce to 16°C eco mode?
3. 3 devices in standby consuming 25W total - turn off?

Want me to apply all of these changes?"

**You:** "Yes, do it"

**AI:** *Uses apply_nobody_home*
"Done! Applied nobody-home mode:
- ✓ Turned off 8 lights
- ✓ Reduced 2 thermostats to eco mode
- ✓ Notification sent

Have a great vacation!"

### Example 3: Energy Optimization

**You:** "My energy bill is high, can you help?"

**AI:** *Uses analyze_energy_consumption and detect_scenarios*
"I found several opportunities to save energy:

High Consumers:
- Heater: 1500W (currently on)
- Dryer: 800W
- Water heater: 300W standby

Issues:
- 5 lights on during daytime (wasting ~100W)
- Living room window open with heater on
- 4 devices in standby (total 30W)

Recommendations:
1. Close the living room window or turn off heater
2. Use automations to turn off daytime lights
3. Use smart plugs to cut standby power

Want me to fix the window/heating conflict now?"

### Example 4: Weekly Maintenance

**You:** "Run a weekly maintenance check"

**AI:** *Uses multiple maintenance actions*
"Weekly maintenance report:

✅ Device Health: 95% (excellent)
⚠️ Found 2 orphaned devices:
   - sensor.old_basement_temp (unavailable 45 days)
   - light.guest_bathroom (not updated 60 days)

📊 Light Usage:
   - 3 lights never used this month
   - Bedroom lights used 8h/day average
   
⚡ Energy:
   - 15 sensors active
   - Average consumption normal
   - No high consumers detected

🔋 Battery Status:
   - door_sensor_front: 15% (replace soon!)
   - motion_living: 25%
   
Would you like me to help fix any of these issues?"

## Advanced Usage

### Combine with Automations

Ask the AI to help create automations:

```
"Create an automation to turn off heating when windows open"
```

The AI will:
1. Detect current window/heating conflicts
2. Generate automation YAML config
3. Explain how to add it to Home Assistant

### Scheduled Checks

Set up regular conversations:

```
"Remind me to check home health every Sunday"
"Run energy analysis every month"
```

### Custom Scenarios

```
"Detect if I'm wasting energy at night"
"Check if any doors are open when I leave"
"Alert me if motion sensors stop working"
```

## Tips for Best Results

1. **Be Specific**: "Check bedroom lights" vs "check all lights"
2. **Confirm Actions**: AI will ask before making changes in "apply" mode
3. **Regular Checks**: Weekly/monthly health checks catch issues early
4. **Use History**: "Show me last week's energy report"
5. **Combine Tools**: AI can chain multiple tools for complex queries

## Common Patterns

### Pattern 1: Detect → Review → Apply
```
You: "Check for issues"
AI: *detects 3 problems*
You: "Show me details on the heating conflict"
AI: *explains specific issue*
You: "Fix it"
AI: *applies solution*
```

### Pattern 2: Scheduled Maintenance
```
You: "Run full maintenance check"
AI: *checks health, orphaned devices, energy*
You: "Focus on the battery warnings"
AI: *provides detailed battery status*
```

### Pattern 3: Leaving/Arriving
```
You: "I'm leaving for the day"
AI: *automatically checks and suggests nobody-home actions*

You: "I'm home"
AI: *could suggest restoring comfort settings*
```

## Troubleshooting

**"Tool not responding"**
- Check Home Assistant connection
- Verify HASS_TOKEN is valid
- Ensure devices exist in your setup

**"No scenarios detected"**
- Verify presence detection is working (person.*, device_tracker.*)
- Check that sensors are properly named and grouped
- Ensure climate devices are available

**"Actions not applied"**
- Confirm you used mode="apply" or explicitly requested action
- Check Home Assistant logs for permission issues
- Verify entity IDs are correct

## Next Steps

- Read [SMART_FEATURES.md](./SMART_FEATURES.md) for complete documentation
- Explore automation examples
- Set up regular maintenance schedules
- Customize scenarios for your home

## Feedback

Found these features helpful? Have ideas for new scenarios? Let us know!
