
import { z } from "zod";
import { Tool } from "../../types/index.js";
import { get_hass } from "../../hass/index.js";
import { logger } from "../../utils/logger.js";

const MoodSchema = z.enum(["chill", "nightly", "focus", "romantic", "party", "default"]);
type Mood = z.infer<typeof MoodSchema>;

const LightScenarioParamsSchema = z.object({
    target: z.string().describe("Area name (e.g. 'Wohnzimmer') or specific Entity ID"),
    mood: MoodSchema.describe("The mood/scenario to apply"),
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

        // 2. Determine Settings based on Mood
        const settings: any = {};
        let message = "";

        switch (mood) {
            case "chill":
                // Warm, Dim
                settings.color_temp_kelvin = 2700;
                settings.brightness_pct = 40;
                settings.transition = 3;
                message = `Setting ${targetLights.length} lights to Chill (Warm/Dim)`;
                break;
            case "nightly":
                // Very Warm, Very Dim
                settings.color_temp_kelvin = 2000;
                settings.brightness_pct = 10;
                settings.transition = 5;
                message = `Setting ${targetLights.length} lights to Nightly (Ultra Warm/Low)`;
                break;
            case "focus":
                // Cool, Bright
                settings.color_temp_kelvin = 4000;
                settings.brightness_pct = 100;
                settings.transition = 1;
                message = `Setting ${targetLights.length} lights to Focus (Cool/Bright)`;
                break;
            case "romantic":
                // Deep Red/Purple, Dim
                settings.rgb_color = [128, 0, 128]; // Purple
                settings.brightness_pct = 30;
                settings.transition = 3;
                message = `Setting ${targetLights.length} lights to Romantic (Purple/Dim)`;
                break;
            case "party":
                // Special: Use effect if supported, else random color
                // For now, simpler implementation: standard "Happy" color -> Orange/Yellow?
                // Actually, let's use a nice vibrant color.
                settings.rgb_color = [255, 165, 0]; // Orange
                settings.brightness_pct = 80;
                settings.effect = "colorloop"; // Try effect, devices might ignore if unsupported
                message = `Setting ${targetLights.length} lights to Party mode`;
                break;
            case "default":
                // Standard Warm White
                settings.color_temp_kelvin = 3000;
                settings.brightness_pct = 80;
                settings.transition = 1;
                message = `Resetting ${targetLights.length} lights to Default`;
                break;
        }

        // 3. Apply Settings
        try {
            const results = await Promise.all(targetLights.map(async (light) => {
                const serviceData = { ...settings, entity_id: light.entity_id };

                // Clean up unsupported attributes if possible? 
                // HA usually ignores extra params, but let's be safe if we can. 
                // Actually, we can't easily know capabilities here without checking supported_color_modes per light.
                // We will let HA handle the "best effort" application.

                await hass.callService("light", "turn_on", serviceData);
                return light.entity_id;
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
