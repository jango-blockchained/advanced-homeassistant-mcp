/**
 * Animation Control tools for Home Assistant
 *
 * Split into:
 * - `animation_control` (read-only): list running background animations
 * - `animation_control_activate`: start, stop, stop_all (all affect lights' ongoing behavior)
 */

import { z } from "zod";
import { Tool } from "../../types/index.js";
import { get_hass } from "../../hass/index.js";
import { logger } from "../../utils/logger.js";
import { AnimationManager } from "../../helpers/animation-manager.js";
import { LightManager } from "../../helpers/light-manager.js";

const AnimationConfigSchema = z.object({
  target: z.string().describe("Target Area or Entity"),
  type: z.enum(["showcase", "custom"]).default("showcase"),
  colors: z.array(z.string()).optional().describe("For 'custom': Palette of colors"),
  strategy: z.enum(["random", "round_robin"]).optional().default("random"),
  interval_sec: z.number().optional().default(5).describe("Time between changes (seconds)"),
});

const animationReadSchema = z.object({
  action: z.literal("list").describe("List currently running background animations"),
});

const animationActivateSchema = z.object({
  action: z.enum(["start", "stop", "stop_all"]).describe("Activation action"),
  config: AnimationConfigSchema.optional().describe("Required for 'start' action"),
  animation_id: z.string().optional().describe("Required for 'stop' action"),
});

type AnimationReadParams = z.infer<typeof animationReadSchema>;
type AnimationActivateParams = z.infer<typeof animationActivateSchema>;

function executeAnimationRead(_params: AnimationReadParams): Promise<string> {
  const manager = AnimationManager.getInstance();
  const active = manager.listAnimations();
  return Promise.resolve(
    JSON.stringify(
      {
        success: true,
        running_count: active.length,
        animations: active,
      },
      null,
      2,
    ),
  );
}

async function executeAnimationActivate(params: AnimationActivateParams): Promise<string> {
  const manager = AnimationManager.getInstance();

  if (params.action === "stop") {
    if (!params.animation_id) {
      return JSON.stringify({ success: false, error: "animation_id required for stop action" });
    }
    const success = manager.stopAnimation(params.animation_id);
    return JSON.stringify({ success, message: success ? "Animation stopped" : "ID not found" });
  }

  if (params.action === "stop_all") {
    const count = manager.stopAll();
    return JSON.stringify({ success: true, message: `Stopped ${count} animations` });
  }

  // start
  if (!params.config) {
    return JSON.stringify({ success: false, error: "config required for start action" });
  }

  const { target, type, colors, strategy, interval_sec } = params.config;
  const hass = await get_hass();
  const allStates = await hass.getStates();

  const lowerTarget = target.toLowerCase();
  const targetLights = allStates.filter((s) => {
    if (!s.entity_id.startsWith("light.")) return false;
    const areaId = (s.attributes as { area_id?: string }).area_id;
    const friendlyName = (s.attributes as { friendly_name?: string }).friendly_name || "";
    if (areaId && (areaId === lowerTarget || areaId.toLowerCase().includes(lowerTarget)))
      return true;
    if (friendlyName.toLowerCase().includes(lowerTarget)) return true;
    if (s.entity_id === target) return true;
    return false;
  });

  if (targetLights.length === 0) {
    return JSON.stringify({ success: false, error: `No lights found for target '${target}'` });
  }

  let tickFn: () => Promise<void>;

  if (type === "showcase") {
    let stageIndex = 0;
    const stages = [
      { name: "Sunrise", colors: ["#FF4500", "#FF8C00", "#FFD700"], strategy: "round_robin" },
      { name: "Daylight", colors: ["#FFFFFF", "#87CEEB"], strategy: "random" },
      { name: "Ocean", colors: ["#00008B", "#008B8B", "#00FFFF"], strategy: "round_robin" },
      { name: "Cyberpunk", colors: ["#FF00FF", "#00FFFF", "#800080"], strategy: "random" },
      { name: "Relax", kelvin: 2700, brightness: 40 },
    ];

    tickFn = async () => {
      const stage = stages[stageIndex];
      logger.info(`Animation Tick: ${stage.name}`);

      if ((stage as { colors?: string[] }).colors) {
        const s = stage as { colors: string[]; strategy: string };
        const promises = targetLights.map(async (light, i) => {
          let hex: string;
          if (s.strategy === "round_robin") hex = s.colors[i % s.colors.length];
          else hex = s.colors[Math.floor(Math.random() * s.colors.length)];
          const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          const rgb = res
            ? [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16)]
            : [255, 255, 255];
          await LightManager.applyLightState(light, {
            rgb_color: rgb as [number, number, number],
            brightness_pct: 80,
            transition: (interval_sec || 5) - 1,
          });
        });
        await Promise.all(promises);
      } else {
        const s = stage as { kelvin: number; brightness: number };
        const promises = targetLights.map(async (light) => {
          await LightManager.applyLightState(light, {
            color_temp_kelvin: s.kelvin,
            brightness_pct: s.brightness,
            transition: (interval_sec || 5) - 1,
          });
        });
        await Promise.all(promises);
      }
      stageIndex = (stageIndex + 1) % stages.length;
    };
  } else {
    if (!colors || colors.length === 0) {
      return JSON.stringify({ success: false, error: "Colors required for custom type" });
    }
    const rgbPalette = colors
      .map((hex) => {
        const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return res ? [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16)] : null;
      })
      .filter((c) => c !== null) as [number, number, number][];

    tickFn = async () => {
      const promises = targetLights.map(async (light) => {
        const rgb: [number, number, number] =
          strategy === "round_robin"
            ? rgbPalette[Math.floor(Math.random() * rgbPalette.length)]
            : rgbPalette[Math.floor(Math.random() * rgbPalette.length)];
        await LightManager.applyLightState(light, {
          rgb_color: rgb,
          transition: (interval_sec || 5) - 1,
        });
      });
      await Promise.all(promises);
    };
  }

  const id = manager.startAnimation(type, target, (interval_sec || 5) * 1000, tickFn);
  return JSON.stringify({
    success: true,
    message: `Started ${type} animation on ${targetLights.length} lights`,
    animation_id: id,
  });
}

export const animationControlTool: Tool = {
  name: "animation_control",
  description: "List currently running background light animations.",
  parameters: animationReadSchema,
  annotations: {
    title: "Animation Control Inventory",
    description: "Read-only list of active background animations",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  execute: executeAnimationRead,
};

export const animationControlActivateTool: Tool = {
  name: "animation_control_activate",
  description: "Start, stop, or stop-all background light animations (endless loops).",
  parameters: animationActivateSchema,
  annotations: {
    title: "Animation Control Activate",
    description: "Start/stop background animations — affects lights' ongoing behavior",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  execute: executeAnimationActivate,
};
