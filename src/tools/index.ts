import { Tool } from "../types/index";
import { controlTool } from "./control.tool";
import { historyTool } from "./history.tool";
import { addonTool } from "./addon.tool";
import { packageTool } from "./package.tool";
import { automationConfigTool } from "./automation-config.tool";
import { subscribeEventsTool } from "./subscribe-events.tool";
import { getSSEStatsTool } from "./sse-stats.tool";

// Import Tool objects (not classes) from homeassistant directory
import { lightsControlTool } from "./homeassistant/lights.tool";
import { climateControlTool } from "./homeassistant/climate.tool";
import { automationTool } from "./homeassistant/automation.tool";
import { listDevicesTool } from "./homeassistant/list-devices.tool";
import { notifyTool } from "./homeassistant/notify.tool";
import { sceneTool } from "./homeassistant/scene.tool";
import { mediaPlayerControlTool } from "./homeassistant/media-player.tool";
import { coverControlTool } from "./homeassistant/cover.tool";
import { lockControlTool } from "./homeassistant/lock.tool";
import { fanControlTool } from "./homeassistant/fan.tool";
import { vacuumControlTool } from "./homeassistant/vacuum.tool";
import { alarmControlTool } from "./homeassistant/alarm.tool";
import { switchControlTool } from "./homeassistant/switch.tool";
import { maintenanceTool } from "./homeassistant/maintenance.tool";
import { smartScenariosTool } from "./homeassistant/smart-scenarios.tool";
import { lightAnimationTool } from "./homeassistant/light-animation.tool";
// Import voice tools
import { voiceCommandParserTool } from "./homeassistant/voice-command-parser.tool";
import { voiceCommandExecutorTool } from "./homeassistant/voice-command-executor.tool";
import { voiceCommandAIParserTool } from "./homeassistant/voice-command-ai-parser.tool";
import { traceTool } from "./homeassistant/trace.tool";
import { entityStateTool } from "./entity-state.tool";
import { searchEntitiesTool } from "./search-entities.tool";

// Tool category types
export enum ToolCategory {
  DEVICE = "device",
  SYSTEM = "system",
  AUTOMATION = "automation",
}

// Tool priority levels
export enum ToolPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

interface _ToolMetadata {
  category: ToolCategory;
  platform: string;
  version: string;
  caching?: {
    enabled: boolean;
    ttl: number;
  };
}

// Array to track all tools
export const tools: Tool[] = [
  controlTool,
  historyTool,
  addonTool,
  packageTool,
  automationConfigTool,
  subscribeEventsTool,
  getSSEStatsTool,
  // Home Assistant tools
  lightsControlTool,
  climateControlTool,
  automationTool,
  listDevicesTool,
  notifyTool,
  sceneTool,
  mediaPlayerControlTool,
  coverControlTool,
  lockControlTool,
  fanControlTool,
  vacuumControlTool,
  alarmControlTool,
  switchControlTool,
  maintenanceTool,
  smartScenariosTool,
  lightAnimationTool,
  // Voice command tools
  voiceCommandParserTool,
  voiceCommandExecutorTool,
  voiceCommandAIParserTool,
  // Trace tool (WebSocket-based)
  traceTool,
  // Generic entity state tool
  entityStateTool,
  // Powerful entity search
  searchEntitiesTool,
];

// Function to get a tool by name
export function getToolByName(name: string): Tool | undefined {
  return tools.find((tool) => tool.name === name);
}

// Function to get all tools
export function getAllTools(): Tool[] {
  return [...tools];
}

// Export all tools individually
export {
  controlTool,
  historyTool,
  addonTool,
  packageTool,
  automationConfigTool,
  subscribeEventsTool,
  getSSEStatsTool,
  // Home Assistant tools
  lightsControlTool,
  climateControlTool,
  automationTool,
  listDevicesTool,
  notifyTool,
  sceneTool,
  mediaPlayerControlTool,
  coverControlTool,
  lockControlTool,
  fanControlTool,
  vacuumControlTool,
  alarmControlTool,
  switchControlTool,
  maintenanceTool,
  smartScenariosTool,
  lightAnimationTool,
  // Voice command tools
  voiceCommandParserTool,
  voiceCommandExecutorTool,
  voiceCommandAIParserTool,
  // Trace tool
  traceTool,
  // Generic entity state
  entityStateTool,
  // Entity search
  searchEntitiesTool,
};
