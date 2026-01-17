
import { z } from "zod";
import { Tool } from "../../types/index.js";
import { get_hass } from "../../hass/index.js";
import { logger } from "../../utils/logger.js";
import { LightManager } from "../../helpers/light-manager.js";

const LightShowcaseParamsSchema = z.object({
    target: z.string().describe("Area name (e.g. 'Wohnzimmer') or specific Entity ID"),
    loops: z.number().min(1).default(1).describe("Number of full showcase loops to run"),
});

type LightShowcaseParams = z.infer<typeof LightShowcaseParamsSchema>;

export const lightShowcaseTool: Tool = {
    name: "light_showcase",
    description: "Run a choreographed light showcase that calls various moods and custom palettes to demonstrate system capabilities.",
    parameters: LightShowcaseParamsSchema,
    annotations: {
        title: "Light Showcase",
        description: "Demo mode: Cycles through Sunrise, Forest, Ocean, Romance, Cyberpunk, and Chill",
        destructiveHint: false,
        idempotentHint: false,
    },
    execute: async (params: LightShowcaseParams) => {
        const { target, loops } = params;
        const hass = await get_hass();
        const allStates = await hass.getStates();

        // 1. Resolve Target
        let targetLights: any[] = [];
        const directEntity = allStates.find(s => s.entity_id === target && s.entity_id.startsWith("light."));
        if (directEntity) {
            targetLights.push(directEntity);
        } else {
            const lowerTarget = target.toLowerCase();
            targetLights = allStates.filter(s => {
                if (!s.entity_id.startsWith("light.")) return false;
                const areaId = (s.attributes as any).area_id;
                const friendlyName = (s.attributes as any).friendly_name || "";
                if (areaId && (areaId === lowerTarget || areaId.toLowerCase().includes(lowerTarget))) return true;
                if (friendlyName.toLowerCase().includes(lowerTarget)) return true;
                return false;
            });
        }

        if (targetLights.length === 0) {
            return JSON.stringify({ success: false, error: `No lights found for target '${target}'` });
        }

        logger.info(`Starting Showcase V2 on ${targetLights.length} lights (${loops} loops)`);

        // Helper to apply a palette/mood
        const runStage = async (name: string, palette: string[], strategy: "random" | "round_robin", transition: number, durationMs: number) => {
            logger.info(`Showcase Stage: ${name}`);

            const promises = targetLights.map(async (light, index) => {
                let colorHex: string;
                if (strategy === "round_robin") {
                    colorHex = palette[index % palette.length];
                } else {
                    colorHex = palette[Math.floor(Math.random() * palette.length)];
                }

                // Hex to RGB
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorHex);
                const rgb = result ? [
                    parseInt(result[1], 16),
                    parseInt(result[2], 16),
                    parseInt(result[3], 16)
                ] as [number, number, number] : [255, 255, 255] as [number, number, number];

                await LightManager.applyLightState(light, {
                    rgb_color: rgb,
                    brightness_pct: 80,
                    transition: transition
                });
            });

            await Promise.all(promises);
            await new Promise(resolve => setTimeout(resolve, durationMs));
        };

        const runMood = async (name: string, kelvin: number, brightness: number, transition: number, durationMs: number) => {
            logger.info(`Showcase Stage: ${name}`);
            const promises = targetLights.map(async (light) => {
                await LightManager.applyLightState(light, {
                    color_temp_kelvin: kelvin,
                    brightness_pct: brightness,
                    transition: transition
                });
            });
            await Promise.all(promises);
            await new Promise(resolve => setTimeout(resolve, durationMs));
        };

        try {
            for (let i = 0; i < loops; i++) {
                // 1. Sunrise (Warm Colors)
                await runStage("Sunrise", ["#FF4500", "#FF8C00", "#FFD700"], "round_robin", 3, 5000);

                // 2. Daylight (Clean)
                await runStage("Daylight", ["#FFFFFF", "#87CEEB"], "random", 2, 4000);

                // 3. Forest (Green/Gold) - NEW
                await runStage("Forest", ["#228B22", "#32CD32", "#FFD700"], "round_robin", 3, 5000);

                // 4. Ocean (Cool Blues/Greens) - Updated with Turquoise
                await runStage("Ocean", ["#00008B", "#008B8B", "#00FFFF", "#40E0D0"], "round_robin", 3, 5000);

                // 5. Romance (Red/Pink/Purple) - NEW
                await runStage("Romance", ["#8B0000", "#FF1493", "#800080"], "random", 3, 5000);

                // 6. Cyberpunk (Neon) - Slowed Down (2s transition, 5s hold)
                await runStage("Cyberpunk", ["#FF00FF", "#00FFFF", "#800080"], "random", 2, 5000);

                // 7. Relax (Warm White End)
                await runMood("Relax", 2700, 40, 4, 2000);
            }

            return JSON.stringify({
                success: true,
                message: `Showcase V2 completed successfully on ${targetLights.length} lights.`
            });

        } catch (err: any) {
            return JSON.stringify({ success: false, error: err.message });
        }
    },
};
