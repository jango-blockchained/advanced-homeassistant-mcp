
import { get_hass } from "../hass/index.js";
import { logger } from "../utils/logger.js";

interface LightState {
    rgb_color?: [number, number, number];
    color_temp_kelvin?: number;
    brightness_pct?: number;
    transition?: number;
    effect?: string;
    [key: string]: any;
}

export class LightManager {
    /**
     * Safe color to Temperature mapping
     * Simplistic heuristic: 
     * - High Blue/Green components -> Cool White
     * - High Red component -> Warm White
     */
    private static mapColorToTemp(rgb: [number, number, number]): number {
        const [r, g, b] = rgb;
        // Simple heuristic
        if (b > r && b > g) return 6000; // Blue dominant -> Cool
        if (g > r && g > b) return 4000; // Green dominant -> Natural/Cool
        return 2700; // Red dominant or mixed -> Warm
    }

    /**
     * Applies the desired state to a light entity, adapting to its capabilities.
     */
    static async applyLightState(entity: any, state: LightState): Promise<void> {
        const hass = await get_hass();
        const serviceData: any = { entity_id: entity.entity_id };

        const attrs = entity.attributes || {};
        const modes = attrs.supported_color_modes || [];

        // Capability flags
        const supportsColor = modes.some((m: string) => ["hs", "xy", "rgb", "rgbw", "rgbww"].includes(m));
        const supportsTemp = modes.includes("color_temp");
        const supportsBrightness = modes.includes("brightness") || (modes.length > 0 && !modes.includes("onoff"));

        // 1. Handle Brightness (Applicable to almost all except on/off switches, but even they might ignore it gracefully)
        if (state.brightness_pct !== undefined) {
            if (supportsBrightness) {
                serviceData.brightness_pct = state.brightness_pct;
            }
        }

        // 2. Handle Color / Temp
        if (state.rgb_color) {
            if (supportsColor) {
                // Native Color Support
                serviceData.rgb_color = state.rgb_color;
            } else if (supportsTemp) {
                // Fallback: Map Color to Temp
                serviceData.color_temp_kelvin = this.mapColorToTemp(state.rgb_color);
                logger.debug(`Degrading Color ${state.rgb_color} to Temp ${serviceData.color_temp_kelvin}K for ${entity.entity_id}`);
            } else {
                // No color or temp support (Dimmer/Switch only) - Change nothing regarding color
                logger.debug(`Ignoring color for ${entity.entity_id} (Not supported)`);
            }
        } else if (state.color_temp_kelvin) {
            if (supportsTemp) {
                serviceData.color_temp_kelvin = state.color_temp_kelvin;
            } else if (supportsColor) {
                // Fallback: Map Temp to Color? (Not strictly needed as HA usually handles Kelvin on RGB lights, but explicit check implies control)
                // We'll trust HA's built-in handling or just let it fall through. 
                // Most RGB drivers accept temp.
                serviceData.color_temp_kelvin = state.color_temp_kelvin;
            }
        }

        // 3. Handle Transition
        if (state.transition !== undefined) {
            // We generally send it. Most integrations ignore it if unsupported without error.
            serviceData.transition = state.transition;
        }

        // 4. Handle Effect
        if (state.effect !== undefined) {
            if (attrs.effect_list && attrs.effect_list.includes(state.effect)) {
                serviceData.effect = state.effect;
            } else {
                logger.debug(`Ignoring effect '${state.effect}' for ${entity.entity_id} (Not in effect_list)`);
            }
        }

        // Execute
        await hass.callService("light", "turn_on", serviceData);
    }
}
