/**
 * WebSocket Manager - Singleton for Home Assistant WebSocket connections
 *
 * Use get_hass_ws() for operations that require WebSocket (like traces).
 * The REST-based get_hass() from index.ts is still used for most operations.
 */

import { HomeAssistantWebSocketClient } from "./websocket-client.js";
import { logger } from "../utils/logger.js";

let wsInstance: HomeAssistantWebSocketClient | null = null;

export async function get_hass_ws(): Promise<HomeAssistantWebSocketClient> {
  if (!wsInstance) {
    const host = process.env.HASS_HOST ?? "http://localhost:8123";
    const url = process.env.HASS_SOCKET_URL || host.replace(/^http/, "ws") + "/api/websocket";
    const token = process.env.HASS_TOKEN;

    if (!token) {
      throw new Error("HASS_TOKEN is required for WebSocket connection");
    }

    logger.info(`Initializing Home Assistant WebSocket connection to: ${url}`);
    wsInstance = new HomeAssistantWebSocketClient(url, token);
    await wsInstance.connect();
    logger.info("Successfully connected to Home Assistant via WebSocket");
  }
  return wsInstance;
}

/**
 * Disconnect and reset the WebSocket singleton.
 * Useful for cleanup or reconnection scenarios.
 */
export async function disconnect_hass_ws(): Promise<void> {
  if (wsInstance) {
    await wsInstance.disconnect();
    wsInstance = null;
    logger.info("Disconnected Home Assistant WebSocket connection");
  }
}
