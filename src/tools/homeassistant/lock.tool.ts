/**
 * Lock Control Tool for Home Assistant
 *
 * This tool allows controlling locks in Home Assistant.
 * Supports locking, unlocking, and opening locks.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

// Real Home Assistant API service
class HomeAssistantLockService {
    async getLocks(): Promise<Record<string, unknown>[]> {
        try {
            const hass = await get_hass();
            const states = await hass.getStates();
            return states
                .filter(state => state.entity_id.startsWith('lock.'))
                .map(state => ({
                    entity_id: state.entity_id,
                    state: state.state,
                    attributes: state.attributes
                }));
        } catch (error) {
            logger.error('Failed to get locks from HA:', error);
            return [];
        }
    }

    async getLock(entity_id: string): Promise<Record<string, unknown> | null> {
        try {
            const hass = await get_hass();
            const state = await hass.getState(entity_id);
            return {
                entity_id: state.entity_id,
                state: state.state,
                attributes: state.attributes
            };
        } catch (error) {
            logger.error(`Failed to get lock ${entity_id} from HA:`, error);
            return null;
        }
    }

    async callService(service: string, entity_id: string, data: Record<string, unknown> = {}): Promise<boolean> {
        try {
            const hass = await get_hass();
            const serviceData = { entity_id, ...data };
            await hass.callService('lock', service, serviceData);
            return true;
        } catch (error) {
            logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
            return false;
        }
    }
}

// Singleton instance
const haLockService = new HomeAssistantLockService();

// Define the schema for our tool parameters using Zod
const lockControlSchema = z.object({
    action: z.enum([
        "list",
        "get",
        "lock",
        "unlock",
        "open"
    ]).describe("The action to perform"),
    entity_id: z.string().optional().describe("The entity ID of the lock (required for most actions)"),
    code: z.string().optional().describe("Optional code for locks that require a PIN/code")
});

type LockControlInput = z.infer<typeof lockControlSchema>;

// Main tool execution function
async function execute(params: LockControlInput): Promise<string> {
    const { action, entity_id, code } = params;

    try {
        switch (action) {
            case "list": {
                const locks = await haLockService.getLocks();
                return JSON.stringify({
                    success: true,
                    locks: locks,
                    count: locks.length
                }, null, 2);
            }

            case "get": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: "entity_id is required for get action" });
                }
                const lock = await haLockService.getLock(entity_id);
                if (!lock) {
                    return JSON.stringify({ success: false, error: `Lock ${entity_id} not found` });
                }
                return JSON.stringify({ success: true, lock: lock }, null, 2);
            }

            case "lock":
            case "unlock":
            case "open": {
                if (!entity_id) {
                    return JSON.stringify({ success: false, error: `entity_id is required for ${action} action` });
                }
                const serviceData = code ? { code } : {};
                const success = await haLockService.callService(action, entity_id, serviceData);
                return JSON.stringify({
                    success,
                    message: success ? `Successfully executed ${action} on ${entity_id}` : `Failed to execute ${action} on ${entity_id}`
                });
            }

            default:
                return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
        }
    } catch (error) {
        logger.error("Error in lock control tool:", error);
        return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred"
        });
    }
}

// Export the tool object
export const lockControlTool: Tool = {
    name: "lock_control",
    description: "Control locks in Home Assistant. Supports locking, unlocking, and opening locks. Some locks may require a code/PIN. Actions include: list (get all locks), get (get specific lock info), lock, unlock, and open (for locks that support unlatching).",
    parameters: lockControlSchema,
    execute
};
