/**
 * Maintenance Tool for Home Assistant
 *
 * Provides recursive maintenance tasks similar to Spook add-on:
 * - Clean up orphaned (verwaiste) devices
 * - Analyze light usage patterns
 * - Monitor energy consumption
 * - Device health checks
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Define the schema for maintenance tool parameters
const maintenanceSchema = z.object({
  action: z
    .enum([
      "find_orphaned_devices",
      "analyze_light_usage",
      "analyze_energy_consumption",
      "cleanup_orphaned_entities",
      "device_health_check",
      "find_unused_automations",
      "find_unavailable_entities",
    ])
    .describe("The maintenance action to perform"),
  days: z
    .number()
    .min(1)
    .max(365)
    .optional()
    .default(30)
    .describe("Number of days to analyze for usage patterns"),
  cleanup: z
    .boolean()
    .optional()
    .default(false)
    .describe("Actually perform cleanup (default: false, only report)"),
  entity_filter: z
    .string()
    .optional()
    .describe("Filter entities by domain (e.g., 'light', 'sensor')"),
});

type MaintenanceParams = z.infer<typeof maintenanceSchema>;

interface OrphanedDevice {
  entity_id: string;
  state: string;
  last_updated?: string;
  friendly_name: string;
  reason: string;
}

interface LightUsageAnalysis {
  total_lights: number;
  currently_on: number;
  currently_off: number;
  unavailable: number;
  lights_by_room: Record<string, { total: number; on: number; off: number; unavailable: number }>;
  never_used: Array<{
    entity_id: string;
    friendly_name: string;
    last_changed?: string;
    days_inactive: number | string;
  }>;
  high_usage: unknown[];
  recommendations: string[];
}

interface EnergyItem {
  entity_id: string;
  friendly_name: string;
  value: number;
  unit: string;
  device_class: string;
}

interface DeviceHealthInfo {
  entity_id: string;
  friendly_name: string;
  battery_level: number;
}

// Maintenance service class
class HomeAssistantMaintenanceService {
  /**
   * Find orphaned devices that are unavailable or not responding
   */
  async findOrphanedDevices(): Promise<OrphanedDevice[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();

      const orphanedDevices = states.filter((state) => {
        const unavailable = state.state === "unavailable" || state.state === "unknown";
        const notUpdatedRecently =
          (state.last_updated ?? "").length > 0 &&
          new Date(state.last_updated ?? "").getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000;

        return unavailable || notUpdatedRecently;
      });

      return orphanedDevices.map((device) => ({
        entity_id: device.entity_id,
        state: device.state,
        last_updated: device.last_updated,
        friendly_name: (device.attributes.friendly_name as string | undefined) ?? device.entity_id,
        reason:
          device.state === "unavailable"
            ? "unavailable"
            : device.state === "unknown"
              ? "unknown"
              : "not_updated",
      }));
    } catch (error) {
      logger.error("Failed to find orphaned devices:", error);
      throw error;
    }
  }

  /**
   * Analyze light usage patterns
   */
  async analyzeLightUsage(days: number = 30): Promise<LightUsageAnalysis> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      const lights = states.filter((s) => s.entity_id.startsWith("light."));

      const analysis: LightUsageAnalysis = {
        total_lights: lights.length,
        currently_on: lights.filter((l) => l.state === "on").length,
        currently_off: lights.filter((l) => l.state === "off").length,
        unavailable: lights.filter((l) => l.state === "unavailable").length,
        lights_by_room: {},
        never_used: [],
        high_usage: [],
        recommendations: [],
      };

      // Group by area/room
      for (const light of lights) {
        const area = ((light.attributes.area_id as string | undefined) ?? "") || "unassigned";
        if (!analysis.lights_by_room[area]) {
          analysis.lights_by_room[area] = {
            total: 0,
            on: 0,
            off: 0,
            unavailable: 0,
          };
        }
        analysis.lights_by_room[area].total++;
        if (light.state === "on") analysis.lights_by_room[area].on++;
        if (light.state === "off") analysis.lights_by_room[area].off++;
        if (light.state === "unavailable") analysis.lights_by_room[area].unavailable++;
      }

      // Find lights that are never used (always off or unavailable)
      analysis.never_used = lights
        .filter((l) => {
          const lastChanged =
            (l.last_changed ?? "").length > 0 ? new Date(l.last_changed ?? "") : null;
          const daysSinceChange = lastChanged
            ? (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24)
            : Infinity;
          return daysSinceChange > days;
        })
        .map((l) => ({
          entity_id: l.entity_id,
          friendly_name: (l.attributes.friendly_name as string | undefined) ?? l.entity_id,
          last_changed: l.last_changed,
          days_inactive:
            (l.last_changed ?? "").length > 0
              ? Math.floor(
                  (Date.now() - new Date(l.last_changed ?? "").getTime()) / (1000 * 60 * 60 * 24),
                )
              : "unknown",
        }));

      // Generate recommendations
      if (analysis.never_used.length > 0) {
        analysis.recommendations.push(
          `${analysis.never_used.length} lights haven't been used in ${days} days. Consider removing or checking them.`,
        );
      }
      if (analysis.unavailable > 0) {
        analysis.recommendations.push(
          `${analysis.unavailable} lights are unavailable. Check their connections.`,
        );
      }
      if (analysis.currently_on > analysis.total_lights * 0.3) {
        analysis.recommendations.push(
          `${analysis.currently_on} lights (${Math.round((analysis.currently_on / analysis.total_lights) * 100)}%) are currently on. Consider creating automations to turn them off.`,
        );
      }

      return analysis;
    } catch (error) {
      logger.error("Failed to analyze light usage:", error);
      throw error;
    }
  }

  /**
   * Analyze energy consumption
   */
  async analyzeEnergyConsumption(_days: number = 30): Promise<{
    total_sensors: number;
    power_sensors: number;
    energy_sensors: number;
    current_consumption: EnergyItem[];
    high_consumers: EnergyItem[];
    recommendations: string[];
  }> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();

      // Find energy sensors
      const energySensors = states.filter(
        (s) =>
          s.entity_id.includes("energy") ||
          s.entity_id.includes("power") ||
          s.attributes.unit_of_measurement === "W" ||
          s.attributes.unit_of_measurement === "kWh" ||
          s.attributes.device_class === "energy" ||
          s.attributes.device_class === "power",
      );

      const currentConsumption: EnergyItem[] = [];

      // Analyze current consumption
      for (const sensor of energySensors) {
        const value = parseFloat(sensor.state);
        if (!isNaN(value) && value > 0) {
          currentConsumption.push({
            entity_id: sensor.entity_id,
            friendly_name:
              (sensor.attributes.friendly_name as string | undefined) ?? sensor.entity_id,
            value: value,
            unit: (sensor.attributes.unit_of_measurement as string | undefined) ?? "",
            device_class: (sensor.attributes.device_class as string | undefined) ?? "",
          });
        }
      }

      // Find high consumers (over 100W for power, over 1kWh for energy)
      const highConsumers = currentConsumption
        .filter(
          (item) =>
            (item.unit === "W" && item.value > 100) || (item.unit === "kWh" && item.value > 1),
        )
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const analysis = {
        total_sensors: energySensors.length,
        power_sensors: energySensors.filter((s) => s.attributes.unit_of_measurement === "W").length,
        energy_sensors: energySensors.filter((s) => s.attributes.unit_of_measurement === "kWh")
          .length,
        current_consumption: currentConsumption,
        high_consumers: highConsumers,
        recommendations: [] as string[],
      };

      // Generate recommendations
      if (analysis.high_consumers.length > 0) {
        analysis.recommendations.push(
          `Found ${analysis.high_consumers.length} high energy consumers. Consider creating automations to manage them.`,
        );
      }
      if (analysis.power_sensors === 0) {
        analysis.recommendations.push(
          "No power sensors found. Consider adding energy monitoring devices to track consumption.",
        );
      }

      return analysis;
    } catch (error) {
      logger.error("Failed to analyze energy consumption:", error);
      throw error;
    }
  }

  /**
   * Find unavailable entities
   */
  async findUnavailableEntities(entityFilter?: string): Promise<
    Array<{
      entity_id: string;
      state: string;
      friendly_name: string;
      domain: string;
      last_updated?: string;
    }>
  > {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();

      let unavailable = states.filter((s) => s.state === "unavailable" || s.state === "unknown");

      if (entityFilter !== undefined && entityFilter.length > 0) {
        unavailable = unavailable.filter((s) => s.entity_id.startsWith(entityFilter + "."));
      }

      return unavailable.map((entity) => ({
        entity_id: entity.entity_id,
        state: entity.state,
        friendly_name: (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id,
        domain: entity.entity_id.split(".")[0],
        last_updated: entity.last_updated,
      }));
    } catch (error) {
      logger.error("Failed to find unavailable entities:", error);
      throw error;
    }
  }

  /**
   * Device health check
   */
  async deviceHealthCheck(): Promise<{
    total_entities: number;
    healthy: number;
    unavailable: number;
    unknown: number;
    battery_low: DeviceHealthInfo[];
    offline_devices: Array<{ entity_id: string; friendly_name: string; domain: string }>;
    by_domain: Record<string, { total: number; healthy: number; issues: number }>;
    issues: string[];
  }> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();

      const health = {
        total_entities: states.length,
        healthy: 0,
        unavailable: 0,
        unknown: 0,
        battery_low: [] as DeviceHealthInfo[],
        offline_devices: [] as Array<{ entity_id: string; friendly_name: string; domain: string }>,
        by_domain: {} as Record<string, { total: number; healthy: number; issues: number }>,
        issues: [] as string[],
      };

      for (const state of states) {
        const domain = state.entity_id.split(".")[0];

        // Count by domain
        if (!health.by_domain[domain]) {
          health.by_domain[domain] = { total: 0, healthy: 0, issues: 0 };
        }
        health.by_domain[domain].total++;

        // Check state
        if (state.state === "unavailable") {
          health.unavailable++;
          health.by_domain[domain].issues++;
          health.offline_devices.push({
            entity_id: state.entity_id,
            friendly_name:
              (state.attributes.friendly_name as string | undefined) ?? state.entity_id,
            domain: domain,
          });
        } else if (state.state === "unknown") {
          health.unknown++;
          health.by_domain[domain].issues++;
        } else {
          health.healthy++;
          health.by_domain[domain].healthy++;
        }

        // Check battery level
        if (state.attributes.battery_level !== undefined) {
          const batteryLevel = parseFloat(state.attributes.battery_level as string);
          if (!isNaN(batteryLevel) && batteryLevel < 20) {
            health.battery_low.push({
              entity_id: state.entity_id,
              friendly_name:
                (state.attributes.friendly_name as string | undefined) ?? state.entity_id,
              battery_level: batteryLevel,
            });
          }
        }
      }

      // Generate issues
      if (health.unavailable > 0) {
        health.issues.push(
          `${health.unavailable} entities are unavailable (${Math.round((health.unavailable / health.total_entities) * 100)}%)`,
        );
      }
      if (health.unknown > 0) {
        health.issues.push(`${health.unknown} entities have unknown state`);
      }
      if (health.battery_low.length > 0) {
        health.issues.push(`${health.battery_low.length} devices have low battery (<20%)`);
      }

      return health;
    } catch (error) {
      logger.error("Failed to perform device health check:", error);
      throw error;
    }
  }
}

// Singleton instance
const maintenanceService = new HomeAssistantMaintenanceService();

// Execute maintenance logic
async function executeMaintenanceLogic(params: MaintenanceParams): Promise<string> {
  logger.debug(`Executing maintenance action: ${params.action}`);

  switch (params.action) {
    case "find_orphaned_devices": {
      const orphaned = await maintenanceService.findOrphanedDevices();
      return JSON.stringify(
        {
          action: params.action,
          total_found: orphaned.length,
          devices: orphaned,
          recommendation:
            orphaned.length > 0
              ? `Found ${orphaned.length} orphaned devices. Review and consider removing them from your configuration.`
              : "No orphaned devices found. Your system is clean!",
        },
        null,
        2,
      );
    }

    case "analyze_light_usage": {
      const analysis = await maintenanceService.analyzeLightUsage(params.days);
      return JSON.stringify(
        {
          action: params.action,
          analysis_period_days: params.days,
          ...analysis,
        },
        null,
        2,
      );
    }

    case "analyze_energy_consumption": {
      const analysis = await maintenanceService.analyzeEnergyConsumption(params.days);
      return JSON.stringify(
        {
          action: params.action,
          analysis_period_days: params.days,
          ...analysis,
        },
        null,
        2,
      );
    }

    case "find_unavailable_entities": {
      const unavailable = await maintenanceService.findUnavailableEntities(params.entity_filter);
      return JSON.stringify(
        {
          action: params.action,
          filter: params.entity_filter || "all",
          total_found: unavailable.length,
          entities: unavailable,
          recommendation:
            unavailable.length > 0
              ? `Found ${unavailable.length} unavailable entities. Check their connections and configuration.`
              : "All entities are available!",
        },
        null,
        2,
      );
    }

    case "device_health_check": {
      const health = await maintenanceService.deviceHealthCheck();
      return JSON.stringify(
        {
          action: params.action,
          timestamp: new Date().toISOString(),
          ...health,
        },
        null,
        2,
      );
    }

    case "cleanup_orphaned_entities": {
      if (!params.cleanup) {
        throw new UserError(
          "Cleanup not enabled. Set 'cleanup: true' to actually remove entities. " +
            "Run 'find_orphaned_devices' first to see what would be removed.",
        );
      }
      // For now, just return what would be cleaned up
      const orphaned = await maintenanceService.findOrphanedDevices();
      return JSON.stringify(
        {
          action: params.action,
          warning:
            "Automatic cleanup not yet implemented. Please remove entities manually through Home Assistant UI.",
          entities_to_remove: orphaned,
        },
        null,
        2,
      );
    }

    case "find_unused_automations": {
      throw new UserError(
        "Finding unused automations requires automation history analysis. This feature is planned for a future update.",
      );
    }

    default:
      throw new UserError(`Unknown action: ${params.action}`);
  }
}

// Export the tool
export const maintenanceTool: Tool = {
  name: "maintenance",
  description:
    "Perform maintenance tasks: find orphaned devices, analyze light usage and energy consumption, device health checks",
  parameters: maintenanceSchema,
  execute: executeMaintenanceLogic,
};

// Export class for compatibility
export class MaintenanceTool extends BaseTool {
  constructor() {
    super({
      name: maintenanceTool.name,
      description: maintenanceTool.description,
      parameters: maintenanceSchema,
      metadata: {
        category: "maintenance",
        version: "1.0.0",
        tags: ["maintenance", "cleanup", "analysis", "health"],
      },
    });
  }

  public async execute(params: MaintenanceParams, context: MCPContext): Promise<string> {
    logger.debug(`Executing MaintenanceTool with params: ${JSON.stringify(params)}`);
    try {
      const validatedParams = this.validateParams(params);
      return await executeMaintenanceLogic(validatedParams);
    } catch (error) {
      logger.error(`Error in MaintenanceTool: ${String(error)}`);
      throw error;
    }
  }
}
