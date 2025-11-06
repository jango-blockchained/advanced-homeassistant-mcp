/**
 * Aurora Manager Singleton
 * Provides centralized access to the AuroraManager instance
 */

import { AuroraManager } from "../../aurora/handlers.js";
import { get_hass } from "../../hass/index.js";
import { logger } from "../../utils/logger.js";

let auroraManagerInstance: AuroraManager | null = null;

/**
 * Get or create the Aurora manager instance
 */
export async function getAuroraManager(): Promise<AuroraManager> {
  if (!auroraManagerInstance) {
    try {
      const hass = await get_hass();
      auroraManagerInstance = new AuroraManager(hass);
      logger.info("Aurora manager initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Aurora manager:", error);
      throw new Error(`Failed to initialize Aurora manager: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return auroraManagerInstance;
}

/**
 * Reset the Aurora manager (useful for testing)
 */
export function resetAuroraManager(): void {
  if (auroraManagerInstance) {
    auroraManagerInstance.clear();
    auroraManagerInstance = null;
    logger.info("Aurora manager reset");
  }
}
