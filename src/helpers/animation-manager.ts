
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

interface ActiveAnimation {
    id: string;
    type: string; // e.g., "showcase", "custom"
    target: string;
    intervalMs: number;
    timer: NodeJS.Timeout;
    startTime: number;
}

export class AnimationManager {
    private static instance: AnimationManager;
    private animations: Map<string, ActiveAnimation> = new Map();

    private constructor() { }

    public static getInstance(): AnimationManager {
        if (!AnimationManager.instance) {
            AnimationManager.instance = new AnimationManager();
        }
        return AnimationManager.instance;
    }

    /**
     * Starts a new background animation loop.
     * @param type Descriptor of the animation type
     * @param target Target entity or area name
     * @param intervalMs How often to run keyframes (approx)
     * @param tickFn Async function to execute on each tick
     */
    public startAnimation(
        type: string,
        target: string,
        intervalMs: number,
        tickFn: () => Promise<void>
    ): string {
        const id = uuidv4().substring(0, 8); // Short ID for readability

        // Wrapper to handle async execution and errors without crashing loop
        const wrapper = async () => {
            try {
                await tickFn();
            } catch (err: any) {
                logger.error(`Animation ${id} error: ${err.message}`);
                // Optionally stop animation on critical error?
                // For now, we keep trying.
            }
        };

        const timer = setInterval(wrapper, intervalMs);

        this.animations.set(id, {
            id,
            type,
            target,
            intervalMs,
            timer,
            startTime: Date.now(),
        });

        logger.info(`Started animation ${id} (${type}) on ${target}`);
        return id;
    }

    public stopAnimation(id: string): boolean {
        const anim = this.animations.get(id);
        if (!anim) return false;

        clearInterval(anim.timer);
        this.animations.delete(id);
        logger.info(`Stopped animation ${id}`);
        return true;
    }

    public stopAll(): number {
        const count = this.animations.size;
        this.animations.forEach((anim) => clearInterval(anim.timer));
        this.animations.clear();
        logger.info(`Stopped all ${count} animations`);
        return count;
    }

    public listAnimations(): Omit<ActiveAnimation, "timer">[] {
        return Array.from(this.animations.values()).map(({ timer, ...rest }) => rest);
    }
}
