import { Tool } from "../types/index.js";
import { controlTool } from "./control.tool.js";
import { historyTool } from "./history.tool.js";
import { addonTool } from "./addon.tool.js";
import { packageTool } from "./package.tool.js";
import { automationConfigTool } from "./automation-config.tool.js";
import { subscribeEventsTool } from "./subscribe-events.tool.js";
import { getSSEStatsTool } from "./sse-stats.tool.js";

// Import Tool objects (not classes) from homeassistant directory
import { lightsControlTool } from "./homeassistant/lights.tool.js";
import { climateControlTool } from "./homeassistant/climate.tool.js";
import { automationTool } from "./homeassistant/automation.tool.js";
import { listDevicesTool } from "./homeassistant/list-devices.tool.js";
import { notifyTool } from "./homeassistant/notify.tool.js";
import { sceneTool } from "./homeassistant/scene.tool.js";

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

interface ToolMetadata {
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
};
