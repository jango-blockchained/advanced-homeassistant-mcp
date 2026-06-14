/**
 * Lock tools for Home Assistant
 *
 * Split into:
 * - `locks` (read-only): list, get
 * - `locks_activate`: lock, unlock, open  (destructive — unlocks physical doors)
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { get_hass } from "../../hass/index.js";
import { Tool } from "../../types/index.js";

class HomeAssistantLockService {
  async getLocks(): Promise<Record<string, unknown>[]> {
    try {
      const hass = await get_hass();
      const states = await hass.getStates();
      return states
        .filter((state) => state.entity_id.startsWith("lock."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
        }));
    } catch (error) {
      logger.error("Failed to get locks from HA:", error);
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
        attributes: state.attributes,
      };
    } catch (error) {
      logger.error(`Failed to get lock ${entity_id} from HA:`, error);
      return null;
    }
  }

  async callService(
    service: string,
    entity_id: string,
    data: Record<string, unknown> = {},
  ): Promise<boolean> {
    try {
      const hass = await get_hass();
      await hass.callService("lock", service, { entity_id, ...data });
      return true;
    } catch (error) {
      logger.error(`Failed to call service ${service} on ${entity_id}:`, error);
      return false;
    }
  }
}

const haLockService = new HomeAssistantLockService();

const locksReadSchema = z.object({
  action: z.enum(["list", "get"]).describe("Read action"),
  entity_id: z.string().optional().describe("Lock entity_id (required for 'get')"),
});

const locksActivateSchema = z.object({
  action: z.enum(["lock", "unlock", "open"]).describe("Activation action"),
  entity_id: z.string().describe("Lock entity_id"),
  code: z.string().optional().describe("Optional PIN/code"),
});

type LocksReadParams = z.infer<typeof locksReadSchema>;
type LocksActivateParams = z.infer<typeof locksActivateSchema>;

async function executeLocksRead(params: LocksReadParams): Promise<string> {
  if (params.action === "list") {
    const locks = await haLockService.getLocks();
    return JSON.stringify({ success: true, locks, count: locks.length }, null, 2);
  }
  if (!params.entity_id) {
    return JSON.stringify({ success: false, error: "entity_id is required for get action" });
  }
  const lock = await haLockService.getLock(params.entity_id);
  if (!lock) {
    return JSON.stringify({ success: false, error: `Lock ${params.entity_id} not found` });
  }
  return JSON.stringify({ success: true, lock }, null, 2);
}

async function executeLocksActivate(params: LocksActivateParams): Promise<string> {
  try {
    // Verify entity exists before calling service
    const existingLock = await haLockService.getLock(params.entity_id);
    if (!existingLock) {
      return JSON.stringify({
        success: false,
        error: `Lock ${params.entity_id} not found`,
      });
    }

    const serviceData = params.code ? { code: params.code } : {};
    const success = await haLockService.callService(params.action, params.entity_id, serviceData);

    if (!success) {
      return JSON.stringify({
        success: false,
        message: `Failed to execute ${params.action} on ${params.entity_id}`,
      });
    }

    // Read back state after service call to verify
    const updatedLock = await haLockService.getLock(params.entity_id);
    return JSON.stringify({
      success: true,
      message: `Successfully executed ${params.action} on ${params.entity_id}`,
      state: updatedLock,
    });
  } catch (error) {
    logger.error("Error in lock activate tool:", error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const locksTool: Tool = {
  name: "locks",
  description: "List all locks or get the state of a specific lock.",
  annotations: {
    title: "Locks Inventory",
    description: "Read-only access to lock entities",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: locksReadSchema,
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      locks: z.array(
        z.object({
          entity_id: z.string(),
          state: z.string(),
          attributes: z.record(z.unknown()),
        }),
      ),
      count: z.number(),
    }),
    z.object({
      success: z.literal(true),
      lock: z.object({
        entity_id: z.string(),
        state: z.string(),
        attributes: z.record(z.unknown()),
      }),
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
    }),
  ]),
  execute: executeLocksRead,
};

export const locksActivateTool: Tool = {
  name: "locks_activate",
  description:
    "Lock, unlock, or open (unlatch) physical locks. Unlocking is a security-sensitive operation.",
  annotations: {
    title: "Locks Activate",
    description: "Actuate physical locks (security-sensitive)",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: locksActivateSchema,
  outputSchema: z.union([
    z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
    }),
  ]),
  execute: executeLocksActivate,
};
