import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Tool, SSEParams } from "../types/index";
import { sseManager } from "../sse/index";
import { logger } from "../utils/logger";

export const subscribeEventsTool: Tool = {
  name: "subscribe_events",
  description:
    "Subscribe to Home Assistant events via Server-Sent Events (SSE) - monitor real-time device and system state changes",
  annotations: {
    title: "Event Subscription",
    description:
      "Stream real-time Home Assistant events for entity state changes and system events",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: z.object({
    token: z.string().describe("Authentication token (required)"),
    events: z.array(z.string()).optional().describe("List of event types to subscribe to"),
    entity_id: z.string().optional().describe("Specific entity ID to monitor for state changes"),
    domain: z.string().optional().describe('Domain to monitor (e.g., "light", "switch", etc.)'),
  }),
  execute: (params: SSEParams) => {
    const clientId = uuidv4();

    // Set up SSE headers
    const responseHeaders = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };

    // Create SSE client
    const client = {
      id: clientId,
      send: (data: string) => {
        return {
          headers: responseHeaders,
          body: `data: ${data}\n\n`,
          keepAlive: true,
        };
      },
    };

    // Add client to SSE manager with authentication. The local
    // `client` object is intentionally minimal (id, send); addClient
    // fills in the rest (ip, connectedAt, connectionTime) at runtime.
    // Cast through unknown to satisfy the input type.
    const sseClient = sseManager.addClient(
      client as unknown as Parameters<typeof sseManager.addClient>[0],
      params.token,
    );

    if (!sseClient || !sseClient.authenticated) {
      return Promise.resolve({
        success: false,
        message: sseClient ? "Authentication failed" : "Maximum client limit reached",
      });
    }

    // Subscribe to specific events if provided
    if (params.events?.length) {
      logger.info(`Client ${clientId} subscribing to events:`, params.events);
      for (const eventType of params.events) {
        sseManager.subscribeToEvent(clientId, eventType);
      }
    }

    // Subscribe to specific entity if provided
    if (params.entity_id) {
      logger.info(`Client ${clientId} subscribing to entity:`, params.entity_id);
      sseManager.subscribeToEntity(clientId, params.entity_id);
    }

    // Subscribe to domain if provided
    if (params.domain) {
      logger.info(`Client ${clientId} subscribing to domain:`, params.domain);
      sseManager.subscribeToDomain(clientId, params.domain);
    }

    return Promise.resolve({
      headers: responseHeaders,
      body: `data: ${JSON.stringify({
        type: "connection",
        status: "connected",
        id: clientId,
        authenticated: true,
        subscriptions: {
          events: params.events || [],
          entities: params.entity_id ? [params.entity_id] : [],
          domains: params.domain ? [params.domain] : [],
        },
        timestamp: new Date().toISOString(),
      })}\n\n`,
      keepAlive: true,
    });
  },
};
