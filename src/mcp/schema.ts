import { z } from "zod";
import { DomainSchema } from "../schemas.js";

export const MCP_SCHEMA = {
  tools: [
    {
      name: "list_devices",
      description: "List all devices connected to Home Assistant",
      parameters: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            enum: [
              "light",
              "climate",
              "alarm_control_panel",
              "cover",
              "switch",
              "contact",
              "media_player",
              "fan",
              "lock",
              "vacuum",
              "scene",
              "script",
              "camera",
            ],
          },
          area: { type: "string" },
          floor: { type: "string" },
        },
        required: [],
      },
    },
    {
      name: "control",
      description: "Control Home Assistant entities (lights, climate, etc.)",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            enum: [
              "turn_on",
              "turn_off",
              "toggle",
              "open",
              "close",
              "stop",
              "set_position",
              "set_tilt_position",
              "set_temperature",
              "set_hvac_mode",
              "set_fan_mode",
              "set_humidity",
            ],
          },
          entity_id: { type: "string" },
          state: { type: "string" },
          brightness: { type: "number" },
          color_temp: { type: "number" },
          rgb_color: {
            type: "array",
            items: { type: "number" },
            minItems: 3,
            maxItems: 3,
          },
          position: { type: "number" },
          tilt_position: { type: "number" },
          temperature: { type: "number" },
          target_temp_high: { type: "number" },
          target_temp_low: { type: "number" },
          hvac_mode: { type: "string" },
          fan_mode: { type: "string" },
          humidity: { type: "number" },
        },
        required: ["command", "entity_id"],
      },
    },
    {
      name: "subscribe_events",
      description: "Subscribe to Home Assistant events via SSE",
      parameters: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: { type: "string" },
          },
          entity_id: { type: "string" },
          domain: { type: "string" },
        },
        required: [],
      },
    },
    {
      name: "get_sse_stats",
      description: "Get statistics about SSE connections",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "automation_config",
      description: "Manage Home Assistant automations",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "toggle", "trigger", "create", "update", "delete"],
          },
          automation_id: { type: "string" },
          config: {
            type: "object",
            properties: {
              alias: { type: "string" },
              description: { type: "string" },
              mode: {
                type: "string",
                enum: ["single", "parallel", "queued", "restart"],
              },
              trigger: { type: "array" },
              condition: { type: "array" },
              action: { type: "array" },
            },
            required: ["alias", "trigger", "action"],
          },
        },
        required: ["action"],
      },
    },
    {
      name: "addon_management",
      description: "Manage Home Assistant add-ons",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "info", "install", "uninstall", "start", "stop", "restart"],
          },
          slug: { type: "string" },
          version: { type: "string" },
        },
        required: ["action"],
      },
    },
    {
      name: "package_management",
      description: "Manage HACS packages",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "install", "uninstall", "update"],
          },
          category: {
            type: "string",
            enum: ["integration", "plugin", "theme", "python_script", "appdaemon", "netdaemon"],
          },
          repository: { type: "string" },
          version: { type: "string" },
        },
        required: ["action", "category"],
      },
    },
    {
      name: "scene_control",
      description: "Manage and activate scenes",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "activate"],
          },
          scene_id: { type: "string" },
        },
        required: ["action"],
      },
    },
    {
      name: "notify",
      description: "Send notifications through Home Assistant",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
          title: { type: "string" },
          target: { type: "string" },
          data: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["message"],
      },
    },
    {
      name: "history",
      description: "Retrieve historical data for entities",
      parameters: {
        type: "object",
        properties: {
          entity_id: { type: "string" },
          start_time: { type: "string" },
          end_time: { type: "string" },
          minimal_response: { type: "boolean" },
          significant_changes_only: { type: "boolean" },
        },
        required: ["entity_id"],
      },
    },
  ],
  prompts: [
    {
      name: "claude",
      description: "Claude-specific prompt template for home automation control",
      template: {
        system:
          "You are Claude, an AI assistant specialized in home automation control through natural language. Your role is to interpret user commands and translate them into specific device control actions. Always maintain context awareness and consider user preferences and patterns. Provide clear, concise responses and suggest relevant follow-up actions.",
        user: "Control the {device_name} in the {location} by {action} with parameters: {parameters}. Current context: {context}",
        examples: [
          {
            user: "Turn on the living room lights",
            assistant:
              "I'll turn on the lights in the living room. Would you like me to set a specific brightness level?",
          },
          {
            user: "Set the temperature to 72 degrees",
            assistant:
              "I'll set the temperature to 72°F. I'll monitor the temperature and let you know when it reaches the target.",
          },
          {
            user: "Open the kitchen blinds halfway",
            assistant:
              "Setting the kitchen blinds to 50% open position. Would you like me to adjust the slat angle as well?",
          },
          {
            user: "Start the coffee maker",
            assistant:
              "I'll start the coffee maker in the kitchen. Based on your usual preferences, I'll use the strong brew setting. Would you like me to adjust any settings?",
          },
          {
            user: "Set up the house for bedtime",
            assistant:
              "I'll activate the bedtime routine: dimming hallway lights to 20%, turning off all other lights, setting temperature to your preferred sleeping temperature of 68°F, locking all doors, and arming the security system.",
          },
          {
            user: "Play some music in the bedroom",
            assistant:
              "I'll start playing music on the bedroom speaker. Based on this time of day and your preferences, I'll start your 'Evening Relaxation' playlist at 40% volume. Would you like to adjust any of these settings?",
          },
          {
            user: "Check if I left any windows open",
            assistant:
              "I'll check all window sensors. The kitchen window and guest bedroom window are currently open. Would you like me to notify you if any windows remain open after sunset?",
          },
        ],
      },
    },
    {
      name: "gpt4",
      description: "GPT-4 specific prompt template for precise home automation control",
      template: {
        system:
          "You are a home automation assistant powered by GPT-4. Focus on precise command interpretation and execution. Maintain high accuracy in device control and parameter settings. Provide feedback on action success and system state changes.",
        user: "Command: {action} {device_name} in {location}\nParameters: {parameters}\nContext: {context}",
        examples: [
          {
            user: "Dim the bedroom lights to 50%",
            assistant:
              "Setting bedroom light brightness to 50%. The change has been applied successfully.",
          },
          {
            user: "Start the evening routine",
            assistant:
              "Initiating evening routine: dimming lights, adjusting temperature, and enabling security system.",
          },
          {
            user: "Set living room AC to 74 degrees and high fan",
            assistant:
              "Configuring living room climate control: temperature set to 74°F, fan mode set to high. Current temperature is 78°F, estimated time to target: 15 minutes.",
          },
          {
            user: "Lock all doors and windows",
            assistant:
              "Security check initiated. All 4 doors locked successfully. 6/7 windows locked. Alert: Kitchen window cannot be locked remotely - manual intervention required.",
          },
          {
            user: "Turn on outdoor lights at sunset",
            assistant:
              "Scheduled task created. Outdoor lights (porch, pathway, garage) will activate at sunset (7:45 PM today). Current light sensor reading: 24,000 lux.",
          },
          {
            user: "Set up the media room for movie night",
            assistant:
              "Executing media room configuration: TV power on, input set to HDMI 2, surround sound activated at 40%, lights dimmed to 10%, blackout blinds closed. Room temperature adjusted to 72°F.",
          },
          {
            user: "Show me energy usage for today",
            assistant:
              "Retrieving energy data: Total usage today: 24.5 kWh. Peak consumption: 3.2 kWh (2-3 PM). Major consumers: HVAC (45%), Water Heater (25%), Kitchen Appliances (15%).",
          },
        ],
      },
    },
    {
      name: "custom",
      description: "Customizable prompt template for home automation control",
      template: {
        system:
          "Custom home automation assistant configuration. Adapt to user preferences and patterns. Learn from interactions and optimize responses. Provide detailed feedback and suggestions.",
        user: "Action requested: {action}\nTarget device: {device_name}\nLocation: {location}\nParameters: {parameters}\nCurrent context: {context}",
        examples: [
          {
            user: "Make it cooler in here",
            assistant:
              "Based on your preferences, I'll lower the temperature by 2 degrees. Current temperature is 74°F, adjusting to 72°F.",
          },
          {
            user: "Set up movie mode",
            assistant:
              "Activating movie mode: dimming lights to 20%, closing blinds, setting TV input to HDMI 1, and adjusting sound system.",
          },
          {
            user: "I'm heading to bed",
            assistant:
              "Initiating personalized bedtime sequence: Setting master bedroom temperature to 68°F, activating white noise machine at volume level 3, dimming hallway lights to 15%, turning off all other lights, closing all blinds, and enabling sleep mode on your phone charger.",
          },
          {
            user: "Start my morning routine",
            assistant:
              "Good morning! Executing your weekday morning routine: Gradually increasing bedroom lights (now at 30%), starting coffee maker with your weekday strength setting, setting bathroom heater to 72°F, and pulling up today's weather and calendar on your kitchen display.",
          },
          {
            user: "I'm working from home today",
            assistant:
              "Activating work-from-home environment: Setting home office lights to your preferred 5000K color temperature at 80% brightness, adjusting HVAC for daytime occupancy, enabling do-not-disturb on doorbell, and configuring automated breaks reminder every 2 hours.",
          },
          {
            user: "We're having guests over",
            assistant:
              "Preparing home for guests: Adjusting living room and dining room temperature to 72°F, setting accent lighting to warm white (2700K), activating air purifier in high mode, enabling guest WiFi network, and preheating the oven as per your usual entertaining preferences.",
          },
          {
            user: "Monitor the baby's room",
            assistant:
              "Activating enhanced nursery monitoring: Setting up temperature alerts (68-72°F range), enabling sound monitoring with smart notification threshold, maintaining humidity at 50%, and activating the smart night light with color changing based on sleep schedule. Current readings: 70°F, 48% humidity, sound level: minimal.",
          },
        ],
      },
      variables: {
        device_name: "string",
        location: "string",
        action: "string",
        parameters: "object",
        context: "object",
      },
    },
  ],
  resources: [
    {
      name: "Home Assistant API",
      url: "https://developers.home-assistant.io/docs/api/rest/",
    },
    {
      name: "Home Assistant WebSocket API",
      url: "https://developers.home-assistant.io/docs/api/websocket",
    },
    {
      name: "HACS Documentation",
      url: "https://hacs.xyz",
    },
  ],
};
