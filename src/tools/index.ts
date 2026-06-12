import { Tool } from "../types/index";
import { controlActivateTool } from "./control.tool";
import { historyTool } from "./history.tool";
import { addonTool, addonModifyTool } from "./addon.tool";
import { packageTool, packageModifyTool } from "./package.tool";
import { automationConfigModifyTool } from "./automation-config.tool";
import { subscribeEventsTool } from "./subscribe-events.tool";
import { getSSEStatsTool } from "./sse-stats.tool";

// Domain device tools — each split into <domain> (read-only) + <domain>_activate
import { lightsTool, lightsActivateTool } from "./homeassistant/lights.tool";
import { climateTool, climateActivateTool } from "./homeassistant/climate.tool";
import {
  automationTool,
  automationModifyTool,
  automationActivateTool,
} from "./homeassistant/automation.tool";
import { listDevicesTool } from "./homeassistant/list-devices.tool";
import { notifyActivateTool } from "./homeassistant/notify.tool";
import { sceneTool, sceneActivateTool } from "./homeassistant/scene.tool";
import { mediaPlayersTool, mediaPlayersActivateTool } from "./homeassistant/media-player.tool";
import { coversTool, coversActivateTool } from "./homeassistant/cover.tool";
import { locksTool, locksActivateTool } from "./homeassistant/lock.tool";
import { fansTool, fansActivateTool } from "./homeassistant/fan.tool";
import { vacuumsTool, vacuumsActivateTool } from "./homeassistant/vacuum.tool";
import { alarmsTool, alarmsActivateTool } from "./homeassistant/alarm.tool";
import { switchesTool, switchesActivateTool } from "./homeassistant/switch.tool";
import { todoTool, todoModifyTool } from "./homeassistant/todo.tool";
import { maintenanceTool } from "./homeassistant/maintenance.tool";
import {
  smartScenariosTool,
  smartScenariosActivateTool,
} from "./homeassistant/smart-scenarios.tool";
import { lightAnimationActivateTool } from "./homeassistant/light-animation.tool";
import { lightScenarioActivateTool } from "./homeassistant/light-scenario.tool";
import { lightShowcaseActivateTool } from "./homeassistant/light-showcase.tool";
import {
  animationControlTool,
  animationControlActivateTool,
} from "./homeassistant/animation-control.tool";
// Voice tools
import { voiceCommandParserTool } from "./homeassistant/voice-command-parser.tool";
import { voiceCommandExecutorActivateTool } from "./homeassistant/voice-command-executor.tool";
import { voiceCommandAIParserActivateTool } from "./homeassistant/voice-command-ai-parser.tool";
import { traceTool } from "./homeassistant/trace.tool";
import { entityStateTool } from "./entity-state.tool";
import { searchEntitiesTool } from "./search-entities.tool";
import { errorLogTool } from "./error-log.tool";
import { dashboardTool, dashboardModifyTool } from "./dashboard.tool";
import { renderTemplateTool } from "./template.tool";

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

// Array to track all tools. Naming convention:
//   - no suffix:  read-only (local HA queries or in-process)
//   - _modify:    mutates HA config/state (no hardware actuation, no outbound messages)
//   - _activate:  actuates hardware, sends messages, or makes remote (non-HA) API calls
export const tools: Tool[] = [
  // Universal control
  controlActivateTool,

  // History / events / SSE
  historyTool,
  subscribeEventsTool,
  getSSEStatsTool,

  // Add-on / package management
  addonTool,
  addonModifyTool,
  packageTool,
  packageModifyTool,

  // Automation
  automationTool,
  automationModifyTool,
  automationActivateTool,
  automationConfigModifyTool,

  // Generic entity / search / template / log
  listDevicesTool,
  entityStateTool,
  searchEntitiesTool,
  renderTemplateTool,
  errorLogTool,

  // Dashboard
  dashboardTool,
  dashboardModifyTool,

  // Domain device tools (read-only + activate)
  lightsTool,
  lightsActivateTool,
  climateTool,
  climateActivateTool,
  switchesTool,
  switchesActivateTool,
  coversTool,
  coversActivateTool,
  fansTool,
  fansActivateTool,
  locksTool,
  locksActivateTool,
  alarmsTool,
  alarmsActivateTool,
  mediaPlayersTool,
  mediaPlayersActivateTool,
  vacuumsTool,
  vacuumsActivateTool,

  // Scenes
  sceneTool,
  sceneActivateTool,

  // To-do lists
  todoTool,
  todoModifyTool,

  // Notifications
  notifyActivateTool,

  // Maintenance / smart scenarios
  maintenanceTool,
  smartScenariosTool,
  smartScenariosActivateTool,

  // Light animations / scenarios / showcase
  lightAnimationActivateTool,
  lightScenarioActivateTool,
  lightShowcaseActivateTool,
  animationControlTool,
  animationControlActivateTool,

  // Voice command tools
  voiceCommandParserTool,
  voiceCommandExecutorActivateTool,
  voiceCommandAIParserActivateTool,

  // Trace
  traceTool,
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
  controlActivateTool,
  historyTool,
  addonTool,
  addonModifyTool,
  packageTool,
  packageModifyTool,
  automationConfigModifyTool,
  subscribeEventsTool,
  getSSEStatsTool,
  // Home Assistant tools
  lightsTool,
  lightsActivateTool,
  climateTool,
  climateActivateTool,
  automationTool,
  automationModifyTool,
  automationActivateTool,
  listDevicesTool,
  notifyActivateTool,
  sceneTool,
  sceneActivateTool,
  mediaPlayersTool,
  mediaPlayersActivateTool,
  coversTool,
  coversActivateTool,
  locksTool,
  locksActivateTool,
  fansTool,
  fansActivateTool,
  vacuumsTool,
  vacuumsActivateTool,
  alarmsTool,
  alarmsActivateTool,
  switchesTool,
  switchesActivateTool,
  todoTool,
  todoModifyTool,
  maintenanceTool,
  smartScenariosTool,
  smartScenariosActivateTool,
  lightAnimationActivateTool,
  lightScenarioActivateTool,
  lightShowcaseActivateTool,
  animationControlTool,
  animationControlActivateTool,
  // Voice command tools
  voiceCommandParserTool,
  voiceCommandExecutorActivateTool,
  voiceCommandAIParserActivateTool,
  // Trace tool
  traceTool,
  // Generic entity state
  entityStateTool,
  // Entity search
  searchEntitiesTool,
  // Error log
  errorLogTool,
  // Dashboard
  dashboardTool,
  dashboardModifyTool,
  // Template evaluation
  renderTemplateTool,
};
