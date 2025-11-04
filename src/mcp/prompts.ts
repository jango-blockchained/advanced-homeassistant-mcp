/**
 * MCP Prompts for Home Assistant
 * 
 * Pre-defined prompt templates to help AI assistants understand common home automation tasks
 */

export interface MCPPrompt {
    name: string;
    description: string;
    arguments?: Array<{
        name: string;
        description: string;
        required: boolean;
    }>;
    content: string;
}

export const homeAssistantPrompts: MCPPrompt[] = [
    {
        name: "control_lights",
        description: "Help with controlling lights in a room or area",
        arguments: [
            {
                name: "room",
                description: "The room or area name (e.g., 'living room', 'bedroom')",
                required: true
            },
            {
                name: "action",
                description: "What to do with the lights (e.g., 'turn on', 'dim', 'set color')",
                required: true
            }
        ],
        content: `To control lights in {{room}}, I'll help you {{action}}:

1. First, I'll list all lights to find ones in {{room}}
2. Then I'll execute the appropriate action on those lights
3. I can also check the current state if needed

Common actions:
- Turn on/off lights
- Adjust brightness (0-255 or percentage)
- Change color (RGB or color temperature)
- Set scenes or effects

Let me search for lights in {{room}} and {{action}}.`
    },
    {
        name: "morning_routine",
        description: "Create a morning routine automation",
        content: `I'll help you set up a morning routine that can:

1. Gradually turn on bedroom lights
2. Adjust thermostat to wake-up temperature
3. Open bedroom blinds/curtains
4. Start playing morning music or news
5. Disarm alarm system

What would you like to include in your morning routine? I can help configure:
- Trigger time or sunrise-based
- Specific devices to control
- Order and timing of actions
- Conditions (like only on weekdays)`
    },
    {
        name: "energy_saving",
        description: "Suggestions for energy-saving automations",
        content: `I can help you save energy with these automations:

1. **Lights**: Turn off lights when rooms are empty (using motion sensors)
2. **Climate**: Adjust temperature based on occupancy or time of day
3. **Media**: Turn off devices when not in use
4. **Standby Power**: Cut standby power to devices at night

Let me check your devices and suggest specific energy-saving automations based on what you have available.`
    },
    {
        name: "security_setup",
        description: "Set up security and monitoring",
        content: `I'll help you set up home security features:

1. **Alarm System**: Configure arm/disarm schedules and modes
2. **Door Locks**: Set up automatic locking schedules
3. **Notifications**: Alert you about doors, windows, or motion
4. **Away Mode**: Simulate presence when you're away
5. **Camera Integration**: Link cameras with motion detection

What security features would you like to configure? I can check your available devices and set up automations.`
    },
    {
        name: "climate_comfort",
        description: "Optimize climate control for comfort and efficiency",
        arguments: [
            {
                name: "preferred_temp",
                description: "Your preferred temperature (e.g., '72°F' or '22°C')",
                required: false
            }
        ],
        content: `I'll help optimize your climate control:

1. Check all climate devices (thermostats, fans, etc.)
2. Set up schedules based on your routine
3. Create automations for:
   - Temperature adjustments based on occupancy
   - Fan control based on temperature
   - Energy-saving modes when away

${typeof arguments !== 'undefined' && arguments[0]?.preferred_temp ? `Target temperature: ${arguments[0].preferred_temp}` : 'What is your preferred temperature?'}

Let me review your climate devices and suggest optimal settings.`
    },
    {
        name: "media_control",
        description: "Control media players and entertainment systems",
        arguments: [
            {
                name: "room",
                description: "The room where the media player is located",
                required: false
            },
            {
                name: "activity",
                description: "What you want to do (e.g., 'watch movie', 'play music')",
                required: false
            }
        ],
        content: `I'll help you control your entertainment system:

Available actions:
- Play/Pause/Stop media playback
- Adjust volume
- Change input sources
- Select sound modes
- Play specific media content
- Create scene for movie watching or music listening

${typeof arguments !== 'undefined' && arguments[0]?.room ? `Room: ${arguments[0].room}` : 'Which room?'}
${typeof arguments !== 'undefined' && arguments[0]?.activity ? `Activity: ${arguments[0].activity}` : 'What would you like to do?'}

Let me find your media players and help you set them up.`
    },
    {
        name: "vacuum_schedule",
        description: "Set up robot vacuum cleaning schedule",
        content: `I'll help you create a cleaning schedule for your robot vacuum:

1. Check available vacuum robots
2. Set up cleaning schedule:
   - Daily/Weekly cleaning times
   - Specific rooms or zones
   - Avoid cleaning when home
3. Configure:
   - Fan speed/suction level
   - Return to dock after cleaning
   - Notifications when done or stuck

What schedule would work best for you? I can set up automations based on your routine.`
    },
    {
        name: "troubleshoot_device",
        description: "Help troubleshoot a device that's not responding",
        arguments: [
            {
                name: "device_name",
                description: "The name or type of device having issues",
                required: true
            }
        ],
        content: `I'll help troubleshoot {{device_name}}:

1. First, let me check the current state of the device
2. Verify it's reachable and responding
3. Check for any error states or warnings
4. Review recent history to see when it last responded
5. Suggest fixes:
   - Reload integration
   - Check power/connectivity
   - Restart device if possible

Let me investigate the issue with {{device_name}}.`
    },
    {
        name: "voice_control_setup",
        description: "Recommendations for voice control setup",
        content: `I'll help you set up voice control for your home:

1. **Recommended Integrations**:
   - Google Assistant for Google Home devices
   - Alexa for Amazon Echo devices
   - Siri Shortcuts for Apple devices

2. **Entity Configuration**:
   - Expose devices you want to control via voice
   - Create friendly names for easy commands
   - Set up rooms/areas for grouped control

3. **Voice Routines**:
   - "Good morning" routine
   - "Good night" routine
   - Custom commands for scenes

What voice assistant do you use? I can help configure the integration and suggest entity names.`
    },
    {
        name: "scene_creation",
        description: "Create a scene for a specific activity or mood",
        arguments: [
            {
                name: "scene_name",
                description: "Name for the scene (e.g., 'Movie Time', 'Dinner', 'Reading')",
                required: true
            }
        ],
        content: `I'll help you create a "{{scene_name}}" scene:

A scene captures the state of multiple devices and can activate them all at once.

For "{{scene_name}}", consider:
1. **Lights**: Which lights should be on/off and at what brightness?
2. **Climate**: Any temperature adjustments?
3. **Media**: Should any media players be controlled?
4. **Covers**: Open or close any blinds/curtains?
5. **Other devices**: Any other devices to control?

Tell me what state each device should be in for this scene, and I'll create it for you.`
    }
];

// Function to get a prompt by name
export function getPrompt(name: string): MCPPrompt | undefined {
    return homeAssistantPrompts.find(p => p.name === name);
}

// Function to get all prompts
export function getAllPrompts(): MCPPrompt[] {
    return homeAssistantPrompts;
}

// Function to render a prompt with arguments
export function renderPrompt(name: string, args: Record<string, string> = {}): string {
    const prompt = getPrompt(name);
    if (!prompt) {
        return `Prompt '${name}' not found`;
    }

    let content = prompt.content;
    
    // Replace argument placeholders
    for (const [key, value] of Object.entries(args)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(placeholder, value);
    }

    return content;
}
