import './polyfills.js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { sseManager } from './sse/index.js';
import { ILogger } from "@digital-alchemy/core";
import express from 'express';
import { rateLimiter, securityHeaders } from './security/index.js';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '.env'
  : process.env.NODE_ENV === 'test'
    ? '.env.test'
    : '.env.development';

console.log(`Loading environment from ${envFile}`);
config({ path: resolve(process.cwd(), envFile) });

import { get_hass } from './hass/index.js';
import { LiteMCP } from 'litemcp';
import { z } from 'zod';
import { DomainSchema } from './schemas.js';

// Configuration
const HASS_HOST = process.env.HASS_HOST || 'http://192.168.178.63:8123';
const HASS_TOKEN = process.env.HASS_TOKEN;
const PORT = process.env.PORT || 3000;

console.log('Initializing Home Assistant connection...');

// Initialize Express app
const app = express();

// Apply security middleware
app.use(securityHeaders);
app.use(rateLimiter);
app.use(express.json());

// Initialize LiteMCP
const server = new LiteMCP('home-assistant', '0.1.0');

// Define Tool interface
interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  execute: (params: any) => Promise<any>;
}

// Array to track tools (moved outside main function)
const tools: Tool[] = [];

// Create API endpoint for each tool
app.post('/api/:tool', async (req, res) => {
  const toolName = req.params.tool;
  const tool = tools.find((t: Tool) => t.name === toolName);

  if (!tool) {
    return res.status(404).json({
      success: false,
      message: `Tool '${toolName}' not found`
    });
  }

  try {
    const result = await tool.execute(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

interface CommandParams {
  command: string;
  entity_id: string;
  // Common parameters
  state?: string;
  // Light parameters
  brightness?: number;
  color_temp?: number;
  rgb_color?: [number, number, number];
  // Cover parameters
  position?: number;
  tilt_position?: number;
  // Climate parameters
  temperature?: number;
  target_temp_high?: number;
  target_temp_low?: number;
  hvac_mode?: string;
  fan_mode?: string;
  humidity?: number;
}

const commonCommands = ['turn_on', 'turn_off', 'toggle'] as const;
const coverCommands = [...commonCommands, 'open', 'close', 'stop', 'set_position', 'set_tilt_position'] as const;
const climateCommands = [...commonCommands, 'set_temperature', 'set_hvac_mode', 'set_fan_mode', 'set_humidity'] as const;

interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}

interface HassState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    description?: string;
    [key: string]: any;
  };
}

interface HassAddon {
  name: string;
  slug: string;
  description: string;
  version: string;
  installed: boolean;
  available: boolean;
  state: string;
}

interface HassAddonResponse {
  data: {
    addons: HassAddon[];
  };
}

interface HassAddonInfoResponse {
  data: {
    name: string;
    slug: string;
    description: string;
    version: string;
    state: string;
    status: string;
    options: Record<string, any>;
    [key: string]: any;
  };
}

interface HacsRepository {
  name: string;
  description: string;
  category: string;
  installed: boolean;
  version_installed: string;
  available_version: string;
  authors: string[];
  domain: string;
}

interface HacsResponse {
  repositories: HacsRepository[];
}

interface AutomationConfig {
  alias: string;
  description?: string;
  mode?: 'single' | 'parallel' | 'queued' | 'restart';
  trigger: any[];
  condition?: any[];
  action: any[];
}

interface AutomationResponse {
  automation_id: string;
}

interface SSEHeaders {
  onAbort?: () => void;
}

interface SSEParams {
  token: string;
  events?: string[];
  entity_id?: string;
  domain?: string;
}

interface HistoryParams {
  entity_id: string;
  start_time?: string;
  end_time?: string;
  minimal_response?: boolean;
  significant_changes_only?: boolean;
}

interface SceneParams {
  action: 'list' | 'activate';
  scene_id?: string;
}

interface NotifyParams {
  message: string;
  title?: string;
  target?: string;
  data?: Record<string, any>;
}

interface AutomationParams {
  action: 'list' | 'toggle' | 'trigger';
  automation_id?: string;
}

interface AddonParams {
  action: 'list' | 'info' | 'install' | 'uninstall' | 'start' | 'stop' | 'restart';
  slug?: string;
  version?: string;
}

interface PackageParams {
  action: 'list' | 'install' | 'uninstall' | 'update';
  category: 'integration' | 'plugin' | 'theme' | 'python_script' | 'appdaemon' | 'netdaemon';
  repository?: string;
  version?: string;
}

interface AutomationConfigParams {
  action: 'create' | 'update' | 'delete' | 'duplicate';
  automation_id?: string;
  config?: {
    alias: string;
    description?: string;
    mode?: 'single' | 'parallel' | 'queued' | 'restart';
    trigger: any[];
    condition?: any[];
    action: any[];
  };
}

async function main() {
  const hass = await get_hass();
  const logger: ILogger = (hass as any).logger;

  // Add the list devices tool
  const listDevicesTool = {
    name: 'list_devices',
    description: 'List all available Home Assistant devices',
    parameters: z.object({}).describe('No parameters required'),
    execute: async () => {
      try {
        const response = await fetch(`${HASS_HOST}/api/states`, {
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch devices: ${response.statusText}`);
        }

        const states = await response.json() as HassState[];
        const devices: Record<string, HassState[]> = {};

        // Group devices by domain
        states.forEach(state => {
          const [domain] = state.entity_id.split('.');
          if (!devices[domain]) {
            devices[domain] = [];
          }
          devices[domain].push(state);
        });

        return {
          success: true,
          devices
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  server.addTool(listDevicesTool);
  tools.push(listDevicesTool);

  // Add the Home Assistant control tool
  const controlTool = {
    name: 'control',
    description: 'Control Home Assistant devices and services',
    parameters: z.object({
      command: z.enum([...commonCommands, ...coverCommands, ...climateCommands])
        .describe('The command to execute'),
      entity_id: z.string().describe('The entity ID to control'),
      // Common parameters
      state: z.string().optional().describe('The desired state for the entity'),
      // Light parameters
      brightness: z.number().min(0).max(255).optional()
        .describe('Brightness level for lights (0-255)'),
      color_temp: z.number().optional()
        .describe('Color temperature for lights'),
      rgb_color: z.tuple([z.number(), z.number(), z.number()]).optional()
        .describe('RGB color values'),
      // Cover parameters
      position: z.number().min(0).max(100).optional()
        .describe('Position for covers (0-100)'),
      tilt_position: z.number().min(0).max(100).optional()
        .describe('Tilt position for covers (0-100)'),
      // Climate parameters
      temperature: z.number().optional()
        .describe('Target temperature for climate devices'),
      target_temp_high: z.number().optional()
        .describe('Target high temperature for climate devices'),
      target_temp_low: z.number().optional()
        .describe('Target low temperature for climate devices'),
      hvac_mode: z.enum(['off', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only']).optional()
        .describe('HVAC mode for climate devices'),
      fan_mode: z.enum(['auto', 'low', 'medium', 'high']).optional()
        .describe('Fan mode for climate devices'),
      humidity: z.number().min(0).max(100).optional()
        .describe('Target humidity for climate devices')
    }),
    execute: async (params: CommandParams) => {
      try {
        const domain = params.entity_id.split('.')[0] as keyof typeof DomainSchema.Values;

        if (!Object.values(DomainSchema.Values).includes(domain)) {
          throw new Error(`Unsupported domain: ${domain}`);
        }

        const service = params.command;
        const serviceData: Record<string, any> = {
          entity_id: params.entity_id
        };

        // Handle domain-specific parameters
        switch (domain) {
          case 'light':
            if (params.brightness !== undefined) {
              serviceData.brightness = params.brightness;
            }
            if (params.color_temp !== undefined) {
              serviceData.color_temp = params.color_temp;
            }
            if (params.rgb_color !== undefined) {
              serviceData.rgb_color = params.rgb_color;
            }
            break;

          case 'cover':
            if (service === 'set_position' && params.position !== undefined) {
              serviceData.position = params.position;
            }
            if (service === 'set_tilt_position' && params.tilt_position !== undefined) {
              serviceData.tilt_position = params.tilt_position;
            }
            break;

          case 'climate':
            if (service === 'set_temperature') {
              if (params.temperature !== undefined) {
                serviceData.temperature = params.temperature;
              }
              if (params.target_temp_high !== undefined) {
                serviceData.target_temp_high = params.target_temp_high;
              }
              if (params.target_temp_low !== undefined) {
                serviceData.target_temp_low = params.target_temp_low;
              }
            }
            if (service === 'set_hvac_mode' && params.hvac_mode !== undefined) {
              serviceData.hvac_mode = params.hvac_mode;
            }
            if (service === 'set_fan_mode' && params.fan_mode !== undefined) {
              serviceData.fan_mode = params.fan_mode;
            }
            if (service === 'set_humidity' && params.humidity !== undefined) {
              serviceData.humidity = params.humidity;
            }
            break;

          case 'switch':
          case 'contact':
            // These domains only support basic operations (turn_on, turn_off, toggle)
            break;

          default:
            throw new Error(`Unsupported operation for domain: ${domain}`);
        }

        // Call Home Assistant service
        try {
          const response = await fetch(`${HASS_HOST}/api/services/${domain}/${service}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serviceData),
          });

          if (!response.ok) {
            throw new Error(`Failed to execute ${service} for ${params.entity_id}: ${response.statusText}`);
          }

          return {
            success: true,
            message: `Successfully executed ${service} for ${params.entity_id}`
          };
        } catch (error) {
          throw new Error(`Failed to execute ${service} for ${params.entity_id}: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  };
  server.addTool(controlTool);
  tools.push(controlTool);

  // Add the history tool
  const historyTool = {
    name: 'get_history',
    description: 'Get state history for Home Assistant entities',
    parameters: z.object({
      entity_id: z.string().describe('The entity ID to get history for'),
      start_time: z.string().optional().describe('Start time in ISO format. Defaults to 24 hours ago'),
      end_time: z.string().optional().describe('End time in ISO format. Defaults to now'),
      minimal_response: z.boolean().optional().describe('Return minimal response to reduce data size'),
      significant_changes_only: z.boolean().optional().describe('Only return significant state changes'),
    }),
    execute: async (params: HistoryParams) => {
      try {
        const now = new Date();
        const startTime = params.start_time ? new Date(params.start_time) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const endTime = params.end_time ? new Date(params.end_time) : now;

        // Build query parameters
        const queryParams = new URLSearchParams({
          filter_entity_id: params.entity_id,
          minimal_response: String(!!params.minimal_response),
          significant_changes_only: String(!!params.significant_changes_only),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        });

        const response = await fetch(`${HASS_HOST}/api/history/period/${startTime.toISOString()}?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        const history = await response.json();
        return {
          success: true,
          history,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  server.addTool(historyTool);
  tools.push(historyTool);

  // Add the scenes tool
  const sceneTool = {
    name: 'scene',
    description: 'Manage and activate Home Assistant scenes',
    parameters: z.object({
      action: z.enum(['list', 'activate']).describe('Action to perform with scenes'),
      scene_id: z.string().optional().describe('Scene ID to activate (required for activate action)'),
    }),
    execute: async (params: SceneParams) => {
      try {
        if (params.action === 'list') {
          const response = await fetch(`${HASS_HOST}/api/states`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch scenes: ${response.statusText}`);
          }

          const states = (await response.json()) as HassState[];
          const scenes = states.filter((state) => state.entity_id.startsWith('scene.'));

          return {
            success: true,
            scenes: scenes.map((scene) => ({
              entity_id: scene.entity_id,
              name: scene.attributes.friendly_name || scene.entity_id.split('.')[1],
              description: scene.attributes.description,
            })),
          };
        } else if (params.action === 'activate') {
          if (!params.scene_id) {
            throw new Error('Scene ID is required for activate action');
          }

          const response = await fetch(`${HASS_HOST}/api/services/scene/turn_on`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              entity_id: params.scene_id,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to activate scene: ${response.statusText}`);
          }

          return {
            success: true,
            message: `Successfully activated scene ${params.scene_id}`,
          };
        }

        throw new Error('Invalid action specified');
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  server.addTool(sceneTool);
  tools.push(sceneTool);

  // Add the notification tool
  const notifyTool = {
    name: 'notify',
    description: 'Send notifications through Home Assistant',
    parameters: z.object({
      message: z.string().describe('The notification message'),
      title: z.string().optional().describe('The notification title'),
      target: z.string().optional().describe('Specific notification target (e.g., mobile_app_phone)'),
      data: z.record(z.any()).optional().describe('Additional notification data'),
    }),
    execute: async (params: NotifyParams) => {
      try {
        const service = params.target ? `notify.${params.target}` : 'notify.notify';
        const [domain, service_name] = service.split('.');

        const response = await fetch(`${HASS_HOST}/api/services/${domain}/${service_name}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: params.message,
            title: params.title,
            data: params.data,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send notification: ${response.statusText}`);
        }

        return {
          success: true,
          message: 'Notification sent successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  server.addTool(notifyTool);
  tools.push(notifyTool);

  // Add the automation tool
  const automationTool = {
    name: 'automation',
    description: 'Manage Home Assistant automations',
    parameters: z.object({
      action: z.enum(['list', 'toggle', 'trigger']).describe('Action to perform with automation'),
      automation_id: z.string().optional().describe('Automation ID (required for toggle and trigger actions)'),
    }),
    execute: async (params: AutomationParams) => {
      try {
        if (params.action === 'list') {
          const response = await fetch(`${HASS_HOST}/api/states`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch automations: ${response.statusText}`);
          }

          const states = (await response.json()) as HassState[];
          const automations = states.filter((state) => state.entity_id.startsWith('automation.'));

          return {
            success: true,
            automations: automations.map((automation) => ({
              entity_id: automation.entity_id,
              name: automation.attributes.friendly_name || automation.entity_id.split('.')[1],
              state: automation.state,
              last_triggered: automation.attributes.last_triggered,
            })),
          };
        } else {
          if (!params.automation_id) {
            throw new Error('Automation ID is required for toggle and trigger actions');
          }

          const service = params.action === 'toggle' ? 'toggle' : 'trigger';
          const response = await fetch(`${HASS_HOST}/api/services/automation/${service}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              entity_id: params.automation_id,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${service} automation: ${response.statusText}`);
          }

          const responseData = await response.json() as AutomationResponse;
          return {
            success: true,
            message: `Successfully ${service}d automation ${params.automation_id}`,
            automation_id: responseData.automation_id,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  server.addTool(automationTool);
  tools.push(automationTool);

  // Add the addon tool
  const addonTool = {
    name: 'addon',
    description: 'Manage Home Assistant add-ons',
    parameters: z.object({
      action: z.enum(['list', 'info', 'install', 'uninstall', 'start', 'stop', 'restart']).describe('Action to perform with add-on'),
      slug: z.string().optional().describe('Add-on slug (required for all actions except list)'),
      version: z.string().optional().describe('Version to install (only for install action)'),
    }),
    execute: async (params: AddonParams) => {
      try {
        if (params.action === 'list') {
          const response = await fetch(`${HASS_HOST}/api/hassio/store`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch add-ons: ${response.statusText}`);
          }

          const data = await response.json() as HassAddonResponse;
          return {
            success: true,
            addons: data.data.addons.map((addon) => ({
              name: addon.name,
              slug: addon.slug,
              description: addon.description,
              version: addon.version,
              installed: addon.installed,
              available: addon.available,
              state: addon.state,
            })),
          };
        } else {
          if (!params.slug) {
            throw new Error('Add-on slug is required for this action');
          }

          let endpoint = '';
          let method = 'GET';
          const body: Record<string, any> = {};

          switch (params.action) {
            case 'info':
              endpoint = `/api/hassio/addons/${params.slug}/info`;
              break;
            case 'install':
              endpoint = `/api/hassio/addons/${params.slug}/install`;
              method = 'POST';
              if (params.version) {
                body.version = params.version;
              }
              break;
            case 'uninstall':
              endpoint = `/api/hassio/addons/${params.slug}/uninstall`;
              method = 'POST';
              break;
            case 'start':
              endpoint = `/api/hassio/addons/${params.slug}/start`;
              method = 'POST';
              break;
            case 'stop':
              endpoint = `/api/hassio/addons/${params.slug}/stop`;
              method = 'POST';
              break;
            case 'restart':
              endpoint = `/api/hassio/addons/${params.slug}/restart`;
              method = 'POST';
              break;
          }

          const response = await fetch(`${HASS_HOST}${endpoint}`, {
            method,
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            ...(Object.keys(body).length > 0 && { body: JSON.stringify(body) }),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${params.action} add-on: ${response.statusText}`);
          }

          const data = await response.json() as HassAddonInfoResponse;
          return {
            success: true,
            message: `Successfully ${params.action}ed add-on ${params.slug}`,
            data: data.data,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  server.addTool(addonTool);
  tools.push(addonTool);

  // Add the package tool
  const packageTool = {
    name: 'package',
    description: 'Manage HACS packages and custom components',
    parameters: z.object({
      action: z.enum(['list', 'install', 'uninstall', 'update']).describe('Action to perform with package'),
      category: z.enum(['integration', 'plugin', 'theme', 'python_script', 'appdaemon', 'netdaemon'])
        .describe('Package category'),
      repository: z.string().optional().describe('Repository URL or name (required for install)'),
      version: z.string().optional().describe('Version to install'),
    }),
    execute: async (params: PackageParams) => {
      try {
        const hacsBase = `${HASS_HOST}/api/hacs`;

        if (params.action === 'list') {
          const response = await fetch(`${hacsBase}/repositories?category=${params.category}`, {
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch packages: ${response.statusText}`);
          }

          const data = await response.json() as HacsResponse;
          return {
            success: true,
            packages: data.repositories,
          };
        } else {
          if (!params.repository) {
            throw new Error('Repository is required for this action');
          }

          let endpoint = '';
          const body: Record<string, any> = {
            category: params.category,
            repository: params.repository,
          };

          switch (params.action) {
            case 'install':
              endpoint = '/repository/install';
              if (params.version) {
                body.version = params.version;
              }
              break;
            case 'uninstall':
              endpoint = '/repository/uninstall';
              break;
            case 'update':
              endpoint = '/repository/update';
              break;
          }

          const response = await fetch(`${hacsBase}${endpoint}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HASS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${params.action} package: ${response.statusText}`);
          }

          return {
            success: true,
            message: `Successfully ${params.action}ed package ${params.repository}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  server.addTool(packageTool);
  tools.push(packageTool);

  // Extend the automation tool with more functionality
  const automationConfigTool = {
    name: 'automation_config',
    description: 'Advanced automation configuration and management',
    parameters: z.object({
      action: z.enum(['create', 'update', 'delete', 'duplicate']).describe('Action to perform with automation config'),
      automation_id: z.string().optional().describe('Automation ID (required for update, delete, and duplicate)'),
      config: z.object({
        alias: z.string().describe('Friendly name for the automation'),
        description: z.string().optional().describe('Description of what the automation does'),
        mode: z.enum(['single', 'parallel', 'queued', 'restart']).optional().describe('How multiple triggerings are handled'),
        trigger: z.array(z.any()).describe('List of triggers'),
        condition: z.array(z.any()).optional().describe('List of conditions'),
        action: z.array(z.any()).describe('List of actions'),
      }).optional().describe('Automation configuration (required for create and update)'),
    }),
    execute: async (params: AutomationConfigParams) => {
      try {
        switch (params.action) {
          case 'create': {
            if (!params.config) {
              throw new Error('Configuration is required for creating automation');
            }

            const response = await fetch(`${HASS_HOST}/api/config/automation/config`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(params.config),
            });

            if (!response.ok) {
              throw new Error(`Failed to create automation: ${response.statusText}`);
            }

            const responseData = await response.json() as { automation_id: string };
            return {
              success: true,
              message: 'Successfully created automation',
              automation_id: responseData.automation_id,
            };
          }

          case 'update': {
            if (!params.automation_id || !params.config) {
              throw new Error('Automation ID and configuration are required for updating automation');
            }

            const response = await fetch(`${HASS_HOST}/api/config/automation/config/${params.automation_id}`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(params.config),
            });

            if (!response.ok) {
              throw new Error(`Failed to update automation: ${response.statusText}`);
            }

            const responseData = await response.json() as { automation_id: string };
            return {
              success: true,
              automation_id: responseData.automation_id,
              message: 'Automation updated successfully'
            };
          }

          case 'delete': {
            if (!params.automation_id) {
              throw new Error('Automation ID is required for deleting automation');
            }

            const response = await fetch(`${HASS_HOST}/api/config/automation/config/${params.automation_id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to delete automation: ${response.statusText}`);
            }

            return {
              success: true,
              message: `Successfully deleted automation ${params.automation_id}`,
            };
          }

          case 'duplicate': {
            if (!params.automation_id) {
              throw new Error('Automation ID is required for duplicating automation');
            }

            // First, get the existing automation config
            const getResponse = await fetch(`${HASS_HOST}/api/config/automation/config/${params.automation_id}`, {
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
            });

            if (!getResponse.ok) {
              throw new Error(`Failed to get automation config: ${getResponse.statusText}`);
            }

            const config = await getResponse.json() as AutomationConfig;
            config.alias = `${config.alias} (Copy)`;

            // Create new automation with modified config
            const createResponse = await fetch(`${HASS_HOST}/api/config/automation/config`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${HASS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(config),
            });

            if (!createResponse.ok) {
              throw new Error(`Failed to create duplicate automation: ${createResponse.statusText}`);
            }

            const newAutomation = await createResponse.json() as AutomationResponse;
            return {
              success: true,
              message: `Successfully duplicated automation ${params.automation_id}`,
              new_automation_id: newAutomation.automation_id,
            };
          }
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  };
  server.addTool(automationConfigTool);
  tools.push(automationConfigTool);

  // Add SSE endpoint
  const subscribeEventsTool = {
    name: 'subscribe_events',
    description: 'Subscribe to Home Assistant events via Server-Sent Events (SSE)',
    parameters: z.object({
      token: z.string().describe('Authentication token (required)'),
      events: z.array(z.string()).optional().describe('List of event types to subscribe to'),
      entity_id: z.string().optional().describe('Specific entity ID to monitor for state changes'),
      domain: z.string().optional().describe('Domain to monitor (e.g., "light", "switch", etc.)'),
    }),
    execute: async (params: SSEParams) => {
      const clientId = uuidv4();

      // Set up SSE headers
      const responseHeaders = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };

      // Create SSE client
      const client = {
        id: clientId,
        send: (data: string) => {
          return {
            headers: responseHeaders,
            body: `data: ${data}\n\n`,
            keepAlive: true
          };
        }
      };

      // Add client to SSE manager with authentication
      const sseClient = sseManager.addClient(client, params.token);

      if (!sseClient || !sseClient.authenticated) {
        return {
          success: false,
          message: sseClient ? 'Authentication failed' : 'Maximum client limit reached'
        };
      }

      // Subscribe to specific events if provided
      if (params.events?.length) {
        console.log(`Client ${clientId} subscribing to events:`, params.events);
        for (const eventType of params.events) {
          sseManager.subscribeToEvent(clientId, eventType);
        }
      }

      // Subscribe to specific entity if provided
      if (params.entity_id) {
        console.log(`Client ${clientId} subscribing to entity:`, params.entity_id);
        sseManager.subscribeToEntity(clientId, params.entity_id);
      }

      // Subscribe to domain if provided
      if (params.domain) {
        console.log(`Client ${clientId} subscribing to domain:`, params.domain);
        sseManager.subscribeToDomain(clientId, params.domain);
      }

      return {
        headers: responseHeaders,
        body: `data: ${JSON.stringify({
          type: 'connection',
          status: 'connected',
          id: clientId,
          authenticated: true,
          subscriptions: {
            events: params.events || [],
            entities: params.entity_id ? [params.entity_id] : [],
            domains: params.domain ? [params.domain] : []
          },
          timestamp: new Date().toISOString()
        })}\n\n`,
        keepAlive: true
      };
    }
  };
  server.addTool(subscribeEventsTool);
  tools.push(subscribeEventsTool);

  // Add statistics endpoint
  const getSSEStatsTool = {
    name: 'get_sse_stats',
    description: 'Get SSE connection statistics',
    parameters: z.object({
      token: z.string().describe('Authentication token (required)')
    }),
    execute: async (params: { token: string }) => {
      if (params.token !== HASS_TOKEN) {
        return {
          success: false,
          message: 'Authentication failed'
        };
      }

      return {
        success: true,
        statistics: sseManager.getStatistics()
      };
    }
  };
  server.addTool(getSSEStatsTool);
  tools.push(getSSEStatsTool);

  logger.debug('[server:init]', 'Initializing MCP Server...');

  // Start the server
  await server.start();
  logger.info('[server:init]', `MCP Server started on port ${PORT}`);
  logger.info('[server:init]', 'Home Assistant server running on stdio');
  logger.info('[server:init]', 'SSE endpoints initialized');

  // Log available endpoints using our tracked tools array
  logger.info('[server:endpoints]', '\nAvailable API Endpoints:');
  tools.forEach((tool: Tool) => {
    logger.info('[server:endpoints]', `- ${tool.name}: ${tool.description}`);
  });

  // Log SSE endpoints
  logger.info('[server:endpoints]', '\nAvailable SSE Endpoints:');
  logger.info('[server:endpoints]', '- /subscribe_events');
  logger.info('[server:endpoints]', '  Parameters:');
  logger.info('[server:endpoints]', '  - token: Authentication token (required)');
  logger.info('[server:endpoints]', '  - events: List of event types to subscribe to (optional)');
  logger.info('[server:endpoints]', '  - entity_id: Specific entity ID to monitor (optional)');
  logger.info('[server:endpoints]', '  - domain: Domain to monitor (e.g., "light", "switch") (optional)');
  logger.info('[server:endpoints]', '\n- /get_sse_stats');
  logger.info('[server:endpoints]', '  Parameters:');
  logger.info('[server:endpoints]', '  - token: Authentication token (required)');

  // Log successful initialization
  logger.info('[server:init]', '\nServer initialization complete. Ready to handle requests.');

  // Start the Express server
  app.listen(PORT, () => {
    logger.info('[server:init]', `Express server listening on port ${PORT}`);
  });
}

main().catch(console.error);