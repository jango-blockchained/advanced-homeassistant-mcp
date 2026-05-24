/**
 * Smart Scenarios Tool for Home Assistant
 *
 * Detects and manages common smart home scenarios:
 * - Nobody home detection (turn off lights, reduce climate)
 * - Window open with heating detection
 * - Motion-based lighting
 * - Energy saving modes
 * - Night mode scenarios
 * - Weather-based climate control
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../../utils/logger.js";
import { get_hass, call_service } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Read-only detection actions
const smartScenariosReadSchema = z.object({
  action: z
    .enum(["detect_scenarios", "detect_issues"])
    .describe("The detection action to perform"),
});

// Mutating apply actions (actuate devices, send notifications)
const smartScenariosActivateSchema = z.object({
  action: z
    .enum(["apply_nobody_home", "apply_window_heating_check"])
    .describe("The scenario to apply"),
  rooms: z.array(z.string()).optional().describe("Specific rooms/areas to apply scenario to"),
  temperature_reduction: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe("Temperature reduction in degrees for climate control (default: 3)"),
  enable_notifications: z
    .boolean()
    .optional()
    .default(true)
    .describe("Send notifications about actions taken"),
  mode: z
    .enum(["detect", "apply", "auto"])
    .optional()
    .default("apply")
    .describe("For apply_window_heating_check: 'apply' executes, 'detect' reports only"),
});

type SmartScenariosReadParams = z.infer<typeof smartScenariosReadSchema>;
type SmartScenariosParams = z.infer<typeof smartScenariosActivateSchema>;

interface ScenarioDetection {
  scenario_type: string;
  detected: boolean;
  entities_affected: string[];
  current_state: string;
  recommended_action: string;
  automation_config?: Record<string, unknown>;
}

interface ScenarioAction {
  action: string;
  entity_id: string;
  reason?: string;
  from?: number;
  to?: number;
}

// Smart Scenarios service class
class SmartScenariosService {
  /**
   * Detect if nobody is home
   */
  async detectNobodyHome(): Promise<ScenarioDetection> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();

      // Find person entities and device trackers
      const personEntities = states.filter((s) => s.entity_id.startsWith("person."));
      const deviceTrackers = states.filter((s) => s.entity_id.startsWith("device_tracker."));
      const presenceSensors = states.filter(
        (s) => s.entity_id.includes("presence") || s.entity_id.includes("occupancy"),
      );

      // Check if anyone is home
      const anyoneHome =
        [
          ...personEntities.filter((p) => p.state === "home"),
          ...deviceTrackers.filter((d) => d.state === "home"),
          ...presenceSensors.filter((p) => p.state === "on" || p.state === "detected"),
        ].length > 0;

      const nobodyHome = !anyoneHome;

      // Find lights that are currently on
      const lightsOn = states.filter((s) => s.entity_id.startsWith("light.") && s.state === "on");

      // Find climate devices that are heating/cooling
      const climateActive = states.filter(
        (s) =>
          s.entity_id.startsWith("climate.") &&
          (s.state === "heat" || s.state === "cool" || s.state === "heat_cool"),
      );

      return {
        scenario_type: "nobody_home",
        detected: nobodyHome,
        entities_affected: [
          ...lightsOn.map((l) => l.entity_id),
          ...climateActive.map((c) => c.entity_id),
        ],
        current_state: nobodyHome
          ? `Nobody home detected. ${lightsOn.length} lights on, ${climateActive.length} climate devices active.`
          : "Someone is home.",
        recommended_action: nobodyHome
          ? "Turn off all lights and reduce climate to eco mode"
          : "No action needed",
        automation_config: nobodyHome
          ? this.generateNobodyHomeAutomation(lightsOn, climateActive)
          : undefined,
      };
    } catch (error) {
      logger.error("Failed to detect nobody home scenario:", error);
      throw error;
    }
  }

  /**
   * Detect window open with heating
   */
  async detectWindowHeatingConflict(): Promise<ScenarioDetection[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();

      // Find window/door sensors
      const windowSensors = states.filter(
        (s) =>
          (s.entity_id.includes("window") || s.entity_id.includes("door")) &&
          (s.attributes.device_class === "window" ||
            s.attributes.device_class === "door" ||
            s.attributes.device_class === "opening") &&
          (s.state === "on" || s.state === "open"),
      );

      // Find climate devices that are heating
      const climateHeating = states.filter(
        (s) =>
          s.entity_id.startsWith("climate.") &&
          (s.state === "heat" || s.state === "auto") &&
          s.attributes.current_temperature < s.attributes.temperature,
      );

      const conflicts: ScenarioDetection[] = [];

      // Check for conflicts by room/area
      for (const climate of climateHeating) {
        const climateArea =
          ((climate.attributes.area_id as string | undefined) ?? "") ||
          this.extractArea(climate.entity_id);

        // Find windows in the same area
        const windowsInArea = windowSensors.filter((w) => {
          const windowArea =
            ((w.attributes.area_id as string | undefined) ?? "") || this.extractArea(w.entity_id);
          return windowArea === climateArea;
        });

        if (windowsInArea.length > 0) {
          conflicts.push({
            scenario_type: "window_heating_conflict",
            detected: true,
            entities_affected: [climate.entity_id, ...windowsInArea.map((w) => w.entity_id)],
            current_state: `Window open in ${climateArea} while heating is active (target: ${climate.attributes.temperature}°C, current: ${climate.attributes.current_temperature}°C)`,
            recommended_action: `Turn off climate.${climate.entity_id.split(".")[1]} while window is open`,
            automation_config: this.generateWindowHeatingAutomation(climate, windowsInArea),
          });
        }
      }

      return conflicts;
    } catch (error) {
      logger.error("Failed to detect window heating conflicts:", error);
      throw error;
    }
  }

  /**
   * Detect energy saving opportunities
   */
  async detectEnergySavingOpportunities(): Promise<ScenarioDetection[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();

      const opportunities: ScenarioDetection[] = [];

      // Find lights on during daytime
      const currentHour = new Date().getHours();
      const isDaytime = currentHour >= 8 && currentHour <= 18;

      if (isDaytime) {
        const lightsOn = states.filter((s) => s.entity_id.startsWith("light.") && s.state === "on");

        if (lightsOn.length > 0) {
          opportunities.push({
            scenario_type: "daytime_lights",
            detected: true,
            entities_affected: lightsOn.map((l) => l.entity_id),
            current_state: `${lightsOn.length} lights on during daytime`,
            recommended_action: "Consider using daylight sensors or turning off unnecessary lights",
            automation_config: this.generateDaylightAutomation(lightsOn),
          });
        }
      }

      // Find devices in standby consuming power
      const powerSensors = states.filter(
        (s) => s.attributes.device_class === "power" && s.attributes.unit_of_measurement === "W",
      );

      const standbyDevices = powerSensors.filter((s) => {
        const power = parseFloat(s.state);
        return !isNaN(power) && power > 0 && power < 10; // Standby typically 0-10W
      });

      if (standbyDevices.length > 0) {
        opportunities.push({
          scenario_type: "standby_power",
          detected: true,
          entities_affected: standbyDevices.map((d) => d.entity_id),
          current_state: `${standbyDevices.length} devices consuming standby power`,
          recommended_action: "Use smart plugs to completely turn off devices when not in use",
        });
      }

      // Find climate devices set too high/low
      const climateDevices = states.filter((s) => s.entity_id.startsWith("climate."));

      for (const climate of climateDevices) {
        const targetTemp = climate.attributes.temperature as number | undefined;
        const currentTemp = climate.attributes.current_temperature as number | undefined;

        if (targetTemp !== undefined && currentTemp !== undefined) {
          const isHeating = climate.state === "heat" && targetTemp > 23;
          const isCooling = climate.state === "cool" && targetTemp < 20;

          if (isHeating || isCooling) {
            opportunities.push({
              scenario_type: "inefficient_climate",
              detected: true,
              entities_affected: [climate.entity_id],
              current_state: `${climate.entity_id} set to ${targetTemp}°C (${climate.state})`,
              recommended_action: isHeating
                ? "Reduce heating target to 20-22°C to save energy"
                : "Increase cooling target to 24-26°C to save energy",
            });
          }
        }
      }

      return opportunities;
    } catch (error) {
      logger.error("Failed to detect energy saving opportunities:", error);
      throw error;
    }
  }

  /**
   * Apply nobody home scenario
   */
  async applyNobodyHomeScenario(params: SmartScenariosParams): Promise<{
    success: boolean;
    actions_taken: ScenarioAction[];
    message: string;
  }> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();

      const actions: ScenarioAction[] = [];

      // Turn off all lights
      const lightsOn = states.filter((s) => s.entity_id.startsWith("light.") && s.state === "on");

      for (const light of lightsOn) {
        if (!params.rooms || this.isInRooms(light, params.rooms)) {
          await call_service("light", "turn_off", { entity_id: light.entity_id });
          actions.push({ action: "turned_off", entity_id: light.entity_id });
        }
      }

      // Set climate to eco mode or reduce temperature
      const climateDevices = states.filter((s) => s.entity_id.startsWith("climate."));

      for (const climate of climateDevices) {
        if (!params.rooms || this.isInRooms(climate, params.rooms)) {
          const currentTemp = climate.attributes.temperature as number | undefined;

          // Check if eco_mode preset is available
          const presets = (climate.attributes.preset_modes as string[] | undefined) || [];
          if (Array.isArray(presets) && presets.includes("eco")) {
            await call_service("climate", "set_preset_mode", {
              entity_id: climate.entity_id,
              preset_mode: "eco",
            });
            actions.push({ action: "set_eco_mode", entity_id: climate.entity_id });
          } else if (currentTemp !== undefined) {
            // Reduce temperature
            const newTemp = currentTemp - (params.temperature_reduction || 3);
            await call_service("climate", "set_temperature", {
              entity_id: climate.entity_id,
              temperature: newTemp,
            });
            actions.push({
              action: "reduced_temperature",
              entity_id: climate.entity_id,
              from: currentTemp,
              to: newTemp,
            });
          }
        }
      }

      // Send notification if enabled
      if (params.enable_notifications) {
        await call_service("notify", "notify", {
          message: `Nobody home mode activated. Turned off ${lightsOn.length} lights and adjusted ${climateDevices.length} climate devices.`,
          title: "🏠 Smart Home: Nobody Home",
        });
      }

      return {
        success: true,
        actions_taken: actions,
        message: `Applied nobody home scenario. Affected ${actions.length} entities.`,
      };
    } catch (error) {
      logger.error("Failed to apply nobody home scenario:", error);
      throw error;
    }
  }

  /**
   * Apply window heating check
   */
  async applyWindowHeatingCheck(params: SmartScenariosParams): Promise<{
    conflicts_found: number;
    conflicts: ScenarioDetection[];
    actions_taken: ScenarioAction[];
    mode: string;
  }> {
    try {
      const conflicts = await this.detectWindowHeatingConflict();
      const actions: ScenarioAction[] = [];

      if (params.mode === "apply") {
        for (const conflict of conflicts) {
          // Turn off climate devices
          const climateEntity = conflict.entities_affected.find((e) => e.startsWith("climate."));
          if (climateEntity !== undefined && climateEntity.length > 0) {
            await call_service("climate", "turn_off", { entity_id: climateEntity });
            actions.push({
              action: "turned_off_climate",
              entity_id: climateEntity,
              reason: "window_open",
            });
          }
        }

        if (params.enable_notifications && conflicts.length > 0) {
          await call_service("notify", "notify", {
            message: `Turned off ${actions.length} climate devices due to open windows.`,
            title: "🪟 Smart Home: Window/Heating Conflict",
          });
        }
      }

      return {
        conflicts_found: conflicts.length,
        conflicts: conflicts,
        actions_taken: actions,
        mode: params.mode ?? "detect",
      };
    } catch (error) {
      logger.error("Failed to apply window heating check:", error);
      throw error;
    }
  }

  // Helper methods
  private extractArea(entityId: string): string {
    // Try to extract area from entity_id naming convention
    // e.g., climate.living_room -> living_room
    const parts = entityId.split(".");
    if (parts.length > 1) {
      return parts[1].replace(/_/g, " ");
    }
    return "unknown";
  }

  private isInRooms(
    entity: { entity_id: string; attributes: Record<string, unknown> },
    rooms: string[],
  ): boolean {
    const area =
      ((entity.attributes.area_id as string | undefined) ?? "") ||
      this.extractArea(entity.entity_id);
    return rooms.some((room) => area.toLowerCase().includes(room.toLowerCase()));
  }

  // Automation generation helpers
  private generateNobodyHomeAutomation(
    lights: Array<{ entity_id: string }>,
    climate: Array<{ entity_id: string }>,
  ): Record<string, unknown> {
    return {
      alias: "Nobody Home - Auto Actions",
      description: "Automatically turn off lights and reduce climate when nobody is home",
      trigger: [
        {
          platform: "state",
          entity_id: "zone.home",
          to: "0",
          for: { minutes: 5 },
        },
      ],
      condition: [],
      action: [
        {
          service: "light.turn_off",
          target: {
            entity_id: lights.map((l) => l.entity_id),
          },
        },
        {
          service: "climate.set_preset_mode",
          target: {
            entity_id: climate.map((c) => c.entity_id),
          },
          data: {
            preset_mode: "eco",
          },
        },
        {
          service: "notify.notify",
          data: {
            message: "Nobody home mode activated",
            title: "Smart Home",
          },
        },
      ],
      mode: "single",
    };
  }

  private generateWindowHeatingAutomation(
    climate: { entity_id: string },
    windows: Array<{ entity_id: string }>,
  ): Record<string, unknown> {
    return {
      alias: `Window Open Climate Control - ${this.extractArea(climate.entity_id)}`,
      description: "Turn off heating when window opens, restore when closed",
      trigger: windows.map((w) => ({
        platform: "state",
        entity_id: w.entity_id,
        to: "on",
      })),
      condition: [
        {
          condition: "state",
          entity_id: climate.entity_id,
          state: ["heat", "auto"],
        },
      ],
      action: [
        {
          service: "climate.turn_off",
          target: {
            entity_id: climate.entity_id,
          },
        },
        {
          wait_for_trigger: windows.map((w) => ({
            platform: "state",
            entity_id: w.entity_id,
            to: "off",
            for: { minutes: 2 },
          })),
          timeout: { hours: 4 },
        },
        {
          service: "climate.turn_on",
          target: {
            entity_id: climate.entity_id,
          },
        },
      ],
      mode: "restart",
    };
  }

  private generateDaylightAutomation(
    lights: Array<{ entity_id: string }>,
  ): Record<string, unknown> {
    return {
      alias: "Daylight Savings - Turn off lights",
      description: "Turn off lights during bright daylight hours",
      trigger: [
        {
          platform: "sun",
          event: "sunrise",
          offset: "+01:00:00",
        },
      ],
      condition: [],
      action: [
        {
          service: "light.turn_off",
          target: {
            entity_id: lights.map((l) => l.entity_id),
          },
        },
      ],
      mode: "single",
    };
  }
}

// Singleton instance
const smartScenariosService = new SmartScenariosService();

async function executeSmartScenariosRead(params: SmartScenariosReadParams): Promise<string> {
  logger.debug(`Executing smart scenarios read action: ${params.action}`);
  try {
    if (params.action === "detect_scenarios") {
      const nobodyHome = await smartScenariosService.detectNobodyHome();
      const windowConflicts = await smartScenariosService.detectWindowHeatingConflict();
      const energySaving = await smartScenariosService.detectEnergySavingOpportunities();

      return JSON.stringify(
        {
          action: params.action,
          timestamp: new Date().toISOString(),
          scenarios: {
            nobody_home: nobodyHome,
            window_heating_conflicts: windowConflicts,
            energy_saving_opportunities: energySaving,
          },
          summary: {
            total_issues: 1 + windowConflicts.length + energySaving.length,
            nobody_home_detected: nobodyHome.detected,
            window_conflicts: windowConflicts.length,
            energy_opportunities: energySaving.length,
          },
        },
        null,
        2,
      );
    }

    // detect_issues
    const windowConflicts = await smartScenariosService.detectWindowHeatingConflict();
    const energySaving = await smartScenariosService.detectEnergySavingOpportunities();
    return JSON.stringify(
      {
        action: params.action,
        timestamp: new Date().toISOString(),
        issues: [...windowConflicts, ...energySaving],
        total_issues: windowConflicts.length + energySaving.length,
      },
      null,
      2,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`smart_scenarios read failed: ${message}`);
    throw new UserError(message);
  }
}

async function executeSmartScenariosActivate(params: SmartScenariosParams): Promise<string> {
  logger.debug(`Executing smart scenarios activate action: ${params.action}`);
  try {
    if (params.action === "apply_nobody_home") {
      const result = await smartScenariosService.applyNobodyHomeScenario(params);
      return JSON.stringify(result, null, 2);
    }
    if (params.action === "apply_window_heating_check") {
      const result = await smartScenariosService.applyWindowHeatingCheck(params);
      return JSON.stringify(result, null, 2);
    }
    throw new UserError(`Unknown apply action: ${(params as { action: string }).action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`smart_scenarios activate failed: ${message}`);
    throw new UserError(message);
  }
}

export const smartScenariosTool: Tool = {
  name: "smart_scenarios",
  description:
    "Detect common smart home scenarios (nobody home, window/heating conflicts, energy-saving opportunities). Read-only analysis.",
  annotations: {
    title: "Smart Scenarios Detect",
    description: "Detect smart home scenarios and energy issues",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: smartScenariosReadSchema,
  execute: executeSmartScenariosRead,
};

export const smartScenariosActivateTool: Tool = {
  name: "smart_scenarios_activate",
  description:
    "Apply smart home scenarios: turn off lights and adjust climate when nobody is home, or turn off heating when windows are open. Actuates devices and sends notifications.",
  annotations: {
    title: "Smart Scenarios Apply",
    description: "Apply smart home scenarios (actuates devices, sends notifications)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: smartScenariosActivateSchema,
  execute: executeSmartScenariosActivate,
};
