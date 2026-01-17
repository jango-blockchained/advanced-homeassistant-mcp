
import { z } from "zod";
import { Tool } from "../../types/index.js";
import { get_hass } from "../../hass/index.js";
import { logger } from "../../utils/logger.js";

// Schema for a single animation step
const AnimationStepSchema = z.object({
    rgb_color: z.tuple([z.number(), z.number(), z.number()]).optional(),
    brightness: z.number().min(0).max(255).optional(),
    duration: z.number().min(0.1).describe("Duration of this step in seconds"),
    transition: z.number().min(0).optional().describe("Transition time to reach this state"),
});

const LightAnimationParamsSchema = z.object({
    entity_id: z.string().describe("The light entity to animate"),
    sequence: z.array(AnimationStepSchema).min(1).describe("Sequence of states to cycle through"),
    loops: z.number().min(1).default(1).describe("Number of times to repeat the sequence"),
});

type LightAnimationParams = z.infer<typeof LightAnimationParamsSchema>;

export const lightAnimationTool: Tool = {
    name: "light_animation",
    description: "Execute custom light animation sequences (e.g., police lights, alerts) on any RGB light.",
    parameters: LightAnimationParamsSchema,
    annotations: {
        title: "Light Animation",
        description: "Run custom animation sequences on lights",
        destructiveHint: false,
        idempotentHint: false,
    },
    execute: async (params: LightAnimationParams) => {
        const { entity_id, sequence, loops } = params;
        const hass = await get_hass();

        logger.info(`Starting animation on ${entity_id} (${loops} loops, ${sequence.length} steps)`);

        try {
            for (let i = 0; i < loops; i++) {
                for (const step of sequence) {
                    const serviceData: any = { entity_id };

                    if (step.rgb_color) serviceData.rgb_color = step.rgb_color;
                    if (step.brightness !== undefined) serviceData.brightness = step.brightness;
                    if (step.transition !== undefined) serviceData.transition = step.transition;

                    // Execute turn_on
                    await hass.callService("light", "turn_on", serviceData);

                    // Wait for duration
                    const waitTime = step.duration * 1000;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }

            return JSON.stringify({
                success: true,
                message: `Completed animation on ${entity_id} (${loops} loops)`
            });

        } catch (err: any) {
            logger.error(`Animation failed: ${err.message}`);
            return JSON.stringify({
                success: false,
                error: err.message
            });
        }
    },
};
