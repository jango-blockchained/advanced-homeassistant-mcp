# Real-World Examples

Practical examples of using the Home Assistant MCP server with AI assistants.

## Basic Device Control

### Lighting Examples

**Turn on lights:**
> "Turn on the living room lights"

**Adjust brightness:**
> "Set the bedroom lights to 50% brightness"

**Change colors:**
> "Make the kitchen lights warm white"
> "Set the hallway lights to blue"

### Climate Control

**Adjust temperature:**
> "Set the thermostat to 22 degrees"
> "Make it warmer in the bedroom"

**Change modes:**
> "Turn on the AC"
> "Switch the living room to heat mode"

## Automation & Scenes

### Scene Activation

**Activate scenes:**
> "Activate the movie night scene"
> "Set the good morning scene"

### Automation Control

**Trigger automations:**
> "Run the bedtime automation"
> "Trigger the arrival home routine"

**List automations:**
> "Show me all my automations"
> "Which automations are currently enabled?"

## Smart Maintenance

### Device Health

**Check device status:**
> "Are there any offline devices?"
> "Show me unavailable entities"

**Find orphaned devices:**
> "Find devices that aren't being used"

### Energy Management

**Monitor usage:**
> "What's using the most energy?"
> "Show me my energy consumption"

**Detect waste:**
> "Find energy saving opportunities"
> "Are there lights left on?"

## Advanced Scenarios

### Nobody Home Detection

**Automated checks:**
> "Am I leaving anything on when nobody's home?"
> "What should be turned off when I leave?"

The server can detect:
- Lights left on when nobody's home
- Climate running unnecessarily
- Media players still active

### Window & Heating Conflicts

**Smart detection:**
> "Are any windows open with heating on?"
> "Check for heating and window conflicts"

The server identifies inefficient heating situations.

## Media Control

### Media Players

**Control playback:**
> "Play music in the living room"
> "Pause the bedroom TV"
> "Skip to the next track"

**Volume control:**
> "Turn up the volume in the kitchen"
> "Mute all speakers"

## Security & Safety

### Lock Control

**Manage locks:**
> "Lock all doors"
> "Is the front door locked?"
> "Unlock the garage"

### Alarm Management

**Control alarms:**
> "Arm the security system"
> "What's the alarm status?"
> "Disarm the alarm"

## Notifications

### Send Alerts

**Create notifications:**
> "Send a notification that dinner is ready"
> "Alert everyone that it's time to leave"

## Complex Scenarios

### Morning Routine

> "Good morning setup: Turn on lights to 30%, set temperature to 20°C, and open blinds"

The AI will:
1. Turn on appropriate lights at low brightness
2. Adjust thermostat
3. Open window covers

### Leaving Home

> "I'm leaving home, make sure everything is secure"

The AI will:
1. Check if all doors are locked
2. Turn off unnecessary lights
3. Adjust climate settings
4. Arm security if configured

### Movie Time

> "Set up for movie time: dim lights, close blinds, and turn on the TV"

The AI will:
1. Dim living room lights
2. Close window covers
3. Activate media scene

## Tips for Better Results

### Be Specific

❌ "Turn on lights"
✅ "Turn on the living room lights"

### Use Natural Language

❌ "light.living_room=on"
✅ "Turn on the living room lights"

### Combine Actions

✅ "Turn on the lights and set temperature to 21°C"

### Ask for Information

✅ "What's the current temperature?"
✅ "Which lights are currently on?"

## Next Steps

- Explore the [Tools Reference](TOOLS_REFERENCE.md) for all available commands
- Review [Smart Features](SMART_FEATURES.md) for advanced functionality
- Check [Quick Start Scenarios](QUICK_START_SCENARIOS.md) for more examples
