import { z } from "zod";
import { Tool } from "../../types/index.js";
import { get_hass } from "../../hass/index.js";
import { logger } from "../../utils/logger.js";
import { LightManager } from "../../helpers/light-manager.js";

const MoodSchema = z.enum(["chill", "nightly", "focus", "romantic", "party", "cyberpunk", "default"]);
type Mood = z.infer<typeof MoodSchema>;

const StrategySchema = z.enum(["random", "round_robin", "dominant"]);
type Strategy = z.infer<typeof StrategySchema>;

const LightScenarioParamsSchema = z.object({
    target: z.string().describe("Area name (e.g. 'Wohnzimmer') or specific Entity ID"),
    mood: MoodSchema.optional().describe("The mood/scenario to apply"),
    colors: z.array(z.string()).optional().describe("Custom palette of hex colors (e.g. ['#FF0000', '#0000FF']) or RGB tuples"),
    strategy: StrategySchema.optional().default("random").describe("Distribution strategy for custom colors"),
});

type LightScenarioParams = z.infer<typeof LightScenarioParamsSchema>;

export const lightScenarioTool: Tool = {
    name: "light_scenario",
    description: "Apply ambient lighting moods (Chill, Nightly, Focus, etc.) to a specific area or light.",
    parameters: LightScenarioParamsSchema,
    annotations: {
        title: "Light Scenarios",
        description: "Set the mood of a room with one command",
        destructiveHint: false,
        idempotentHint: true,
    },
    execute: async (params: LightScenarioParams) => {
        const { target, mood } = params;
        const hass = await get_hass();
        const allStates = await hass.getStates();

        // 1. Resolve Target
        // Strategy: 
        // - Check if target is an exact entity_id
        // - Check if target matches an area_id (in attributes)
        // - Fuzzy match friendly_name or area_id

        let targetLights: any[] = [];

        // Case A: Exact Entity ID
        const directEntity = allStates.find(s => s.entity_id === target && s.entity_id.startsWith("light."));
        if (directEntity) {
            targetLights.push(directEntity);
        } else {
            // Case B: Search Area / Name
            const lowerTarget = target.toLowerCase();

            targetLights = allStates.filter(s => {
                if (!s.entity_id.startsWith("light.")) return false;

                const areaId = (s.attributes as any).area_id;
                const friendlyName = (s.attributes as any).friendly_name || "";

                // Check Area ID (exact or loose)
                if (areaId && (areaId === lowerTarget || areaId.toLowerCase().includes(lowerTarget))) return true;

                // Check Friendly Name (loose)
                if (friendlyName.toLowerCase().includes(lowerTarget)) return true;

                return false;
            });
        }

        if (targetLights.length === 0) {
            return JSON.stringify({
                success: false,
                error: `No lights found matching target '${target}'. Try a stronger Area name or specific Entity ID.`
            });
        }

        // 2. Determine Settings based on Mood OR Custom Colors
        const settingsList: any[] = [];
        let message = "";

        // Helper to parse hex to [r,g,b]
        const hexToRgb = (hex: string): [number, number, number] | null => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ] : null;
        };

        if (params.colors && params.colors.length > 0) {
            // Custom Palette Mode
            const palette = params.colors.map(c => {
                if (c.startsWith("#")) return hexToRgb(c);
                // Assume [r,g,b] array passed as string? Zod schema says string. 
                // If user passes JSON string of array, we might need to parse.
                // But Zod array(string) means ["#FF", "#00"] which is fine.
                return null;
            }).filter(c => c !== null) as [number, number, number][];

            if (palette.length === 0) {
                return JSON.stringify({ success: false, error: "No valid hex colors provided in palette." });
            }

            message = `Applying custom palette (${palette.length} colors) to ${targetLights.length} lights via ${params.strategy}`;

            targetLights.forEach((light, index) => {
                let color: [number, number, number];

                if (params.strategy === "round_robin") {
                    color = palette[index % palette.length];
                } else {
                    // Random (default)
                    color = palette[Math.floor(Math.random() * palette.length)];
                }

                settingsList.push({
                    entity: light,
                    state: {
                        rgb_color: color,
                        brightness_pct: 80,
                        transition: 2
                    }
                });
            });

        } else if (mood) {
            // Mood Mode (Legacy + Enhanced)
            let commonState: any = {};
            // Using a flag for palette based moods
            let moodPalette: [number, number, number][] | null = null;

            switch (mood) {
                case "chill":
                    commonState = { color_temp_kelvin: 2700, brightness_pct: 40, transition: 3 };
                    message = `Setting ${targetLights.length} lights to Chill`;
                    break;
                case "nightly":
                    commonState = { color_temp_kelvin: 2000, brightness_pct: 10, transition: 5 };
                    message = `Setting ${targetLights.length} lights to Nightly`;
                    break;
                case "focus":
                    commonState = { color_temp_kelvin: 4000, brightness_pct: 100, transition: 1 };
                    message = `Setting ${targetLights.length} lights to Focus`;
                    break;
                case "romantic":
                    commonState = { rgb_color: [128, 0, 128], brightness_pct: 30, transition: 3 };
                    message = `Setting ${targetLights.length} lights to Romantic`;
                    break;
                case "party":
                    commonState = { rgb_color: [255, 165, 0], brightness_pct: 80, effect: "colorloop" };
                    message = `Setting ${targetLights.length} lights to Party`;
                    break;
                case "cyberpunk":
                    moodPalette = [
                        [0, 255, 255],   // Cyan
                        [255, 0, 255],   // Magenta
                        [128, 0, 128],   // Purple
                        [0, 0, 255]      // Blue
                    ];
                    message = `Setting ${targetLights.length} lights to Cyberpunk`;
                    break;
                case "default":
                    commonState = { color_temp_kelvin: 3000, brightness_pct: 80, transition: 1 };
                    message = `Resetting ${targetLights.length} lights to Default`;
                    break;
            }

            if (moodPalette) {
                targetLights.forEach(light => {
                    const color = moodPalette![Math.floor(Math.random() * moodPalette!.length)];
                    settingsList.push({
                        entity: light,
                        state: {
                            rgb_color: color,
                            brightness_pct: 80,
                            transition: 2
                        }
                    });
                });
            } else {
                targetLights.forEach(light => {
                    settingsList.push({ entity: light, state: commonState });
                });
            }
        } else {
            return JSON.stringify({ success: false, error: "Must provide either 'mood' or 'colors'." });
        }

        // 3. Apply Settings via LightManager
        try {
            const results = await Promise.all(settingsList.map(async (item) => {
                await LightManager.applyLightState(item.entity, item.state);
                return item.entity.entity_id;
            }));

            return JSON.stringify({
                success: true,
                message: message,
                affected_entities: results
            });

        } catch (error: any) {
            return JSON.stringify({
                success: false,
                error: `Failed to apply scenario: ${error.message}`
            });
        }
    },
};
