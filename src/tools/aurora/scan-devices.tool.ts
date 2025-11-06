/**
 * Aurora Scan Devices Tool
 * Scans Home Assistant for available light devices
 */

import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { Tool } from "../../types/index.js";
import { getAuroraManager } from "./manager.js";

const scanDevicesSchema = z.object({
  area: z.string().optional().describe("Filter devices by area/room (optional)"),
  capability: z.enum(["color", "color_temp", "brightness"]).optional().describe("Filter by capability (optional)"),
});

type ScanDevicesParams = z.infer<typeof scanDevicesSchema>;

async function executeScanDevices(args: ScanDevicesParams): Promise<unknown> {
  try {
    logger.info("Scanning for Aurora-compatible light devices");
    
    const manager = await getAuroraManager();
    const result = await manager.handleScanDevices({
      area: args.area,
      capability: args.capability,
    });

    logger.info(`Found ${result.devices.length} devices`);

    return {
      success: true,
      devices: result.devices.map(d => ({
        entity_id: d.entityId,
        name: d.name,
        area: d.area,
        manufacturer: d.manufacturer,
        model: d.model,
        capabilities: d.capabilities,
      })),
      statistics: result.statistics,
    };
  } catch (error) {
    logger.error("Failed to scan devices:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const auroraScanDevicesTool: Tool = {
  name: "aurora_scan_devices",
  description: "Scan Home Assistant for available light devices that can be used with Aurora",
  parameters: scanDevicesSchema,
  execute: executeScanDevices,
};
