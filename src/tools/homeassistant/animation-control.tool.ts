
import { z } from "zod";
import { Tool } from "../../types/index.js";
import { get_hass } from "../../hass/index.js";
import { logger } from "../../utils/logger.js";
import { AnimationManager } from "../../helpers/animation-manager.js";
import { LightManager } from "../../helpers/light-manager.js";

const AnimationActionSchema = z.enum(["start", "stop", "list", "stop_all"]);

// Config for starting an animation
const AnimationConfigSchema = z.object({
    target: z.string().describe("Target Area or Entity"),
    type: z.enum(["showcase", "custom"]).default("showcase"),
    // Custom type params
    colors: z.array(z.string()).optional().describe("For 'custom': Palette of colors"),
    strategy: z.enum(["random", "round_robin"]).optional().default("random"),
    interval_sec: z.number().optional().default(5).describe("Time between changes (seconds)"),
});

const AnimationControlParamsSchema = z.object({
    action: AnimationActionSchema,
    config: AnimationConfigSchema.optional().describe("Required for 'start' action"),
    animation_id: z.string().optional().describe("Required for 'stop' action"),
});

type AnimationControlParams = z.infer<typeof AnimationControlParamsSchema>;

export const animationControlTool: Tool = {
    name: "animation_control",
    description: "Start, stop, and manage background light animations (Endless loops).",
    parameters: AnimationControlParamsSchema,
    annotations: {
        title: "Animation Control",
        description: "Manage background light animations",
        destructiveHint: false,
        idempotentHint: false,
    },
    execute: async (params: AnimationControlParams) => {
        const manager = AnimationManager.getInstance();

        if (params.action === "list") {
            const active = manager.listAnimations();
            return JSON.stringify({
                success: true,
                running_count: active.length,
                animations: active
            }, null, 2);
        }

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

        if (params.action === "start") {
            if (!params.config) {
                return JSON.stringify({ success: false, error: "config required for start action" });
            }

            const { target, type, colors, strategy, interval_sec } = params.config;
            const hass = await get_hass();
            const allStates = await hass.getStates();

            // Target Resolution
            let targetLights: any[] = [];
            const lowerTarget = target.toLowerCase();
            targetLights = allStates.filter(s => {
                if (!s.entity_id.startsWith("light.")) return false;
                const areaId = (s.attributes as any).area_id;
                const friendlyName = (s.attributes as any).friendly_name || "";
                if (areaId && (areaId === lowerTarget || areaId.toLowerCase().includes(lowerTarget))) return true;
                if (friendlyName.toLowerCase().includes(lowerTarget)) return true;
                // Direct entity match
                if (s.entity_id === target) return true;
                return false;
            });

            if (targetLights.length === 0) {
                return JSON.stringify({ success: false, error: `No lights found for target '${target}'` });
            }

            // Logic Construction
            let tickFn: () => Promise<void>;

            if (type === "showcase") {
                // Endless Showcase: Cycle through moods
                // State to track current stage across ticks? 
                // Actually, AnimationManager runs a function periodically.
                // If we want a sequenced showcase (Sunrise -> Ocean...), we need state.

                let stageIndex = 0;
                const stages = [
                    { name: "Sunrise", colors: ["#FF4500", "#FF8C00", "#FFD700"], strategy: "round_robin" },
                    { name: "Daylight", colors: ["#FFFFFF", "#87CEEB"], strategy: "random" },
                    { name: "Ocean", colors: ["#00008B", "#008B8B", "#00FFFF"], strategy: "round_robin" },
                    { name: "Cyberpunk", colors: ["#FF00FF", "#00FFFF", "#800080"], strategy: "random" },
                    { name: "Relax", kelvin: 2700, brightness: 40 }
                ];

                tickFn = async () => {
                    const stage = stages[stageIndex];
                    logger.info(`Animation Tick: ${stage.name}`);

                    if ((stage as any).colors) {
                        // Color Stage
                        const s = stage as any;
                        const promises = targetLights.map(async (light, i) => {
                            let hex: string;
                            if (s.strategy === "round_robin") hex = s.colors[i % s.colors.length];
                            else hex = s.colors[Math.floor(Math.random() * s.colors.length)];

                            // Quick Hex Parse
                            const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                            const rgb = res ? [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16)] : [255, 255, 255];

                            // Apply
                            await LightManager.applyLightState(light, {
                                rgb_color: rgb as [number, number, number],
                                brightness_pct: 80,
                                transition: (interval_sec || 5) - 1 // Transition slightly shorter than interval
                            });
                        });
                        await Promise.all(promises);
                    } else {
                        // Kelvin Stage
                        const s = stage as any;
                        const promises = targetLights.map(async (light) => {
                            await LightManager.applyLightState(light, {
                                color_temp_kelvin: s.kelvin,
                                brightness_pct: s.brightness,
                                transition: (interval_sec || 5) - 1
                            });
                        });
                        await Promise.all(promises);
                    }

                    // Advance Stage
                    stageIndex = (stageIndex + 1) % stages.length;
                };
            } else {
                // Custom Type (Single Palette Loop)
                if (!colors || colors.length === 0) {
                    return JSON.stringify({ success: false, error: "Colors required for custom type" });
                }

                // Pre-parse colors
                const rgbPalette = colors.map(hex => {
                    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return res ? [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16)] : null;
                }).filter(c => c !== null) as [number, number, number][];

                tickFn = async () => {
                    const promises = targetLights.map(async (light, i) => {
                        let rgb: [number, number, number];
                        if (strategy === "round_robin") {
                            // To make round robin 'move', need a shift factor based on time/tick?
                            // Ideally yes. Let's use a random shift or increment.
                            // But simple round robin is static if index is static.
                            // Let's use Random for custom endless to make it alive, OR shift the offset.
                            // For now: Random is safer for "animation".
                            rgb = rgbPalette[Math.floor(Math.random() * rgbPalette.length)];
                        } else {
                            rgb = rgbPalette[Math.floor(Math.random() * rgbPalette.length)];
                        }

                        await LightManager.applyLightState(light, {
                            rgb_color: rgb,
                            transition: (interval_sec || 5) - 1
                        });
                    });
                    await Promise.all(promises);
                };
            }

            const id = manager.startAnimation(type, target, (interval_sec || 5) * 1000, tickFn);
            return JSON.stringify({
                success: true,
                message: `Started ${type} animation on ${targetLights.length} lights`,
                animation_id: id
            });
        }

        return JSON.stringify({ success: false, error: "Invalid action" });
    },
};
