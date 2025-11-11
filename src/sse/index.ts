import { EventEmitter } from "events";
import { HassEntity, HassEvent } from "../interfaces/hass.js";
import { TokenManager } from "../security/index.js";
import { logger } from "../utils/logger.js";

// Constants
const DEFAULT_MAX_CLIENTS = 1000;
const DEFAULT_PING_INTERVAL = 30000; // 30 seconds
const DEFAULT_CLEANUP_INTERVAL = 60000; // 1 minute
const DEFAULT_MAX_CONNECTION_AGE = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_RATE_LIMIT = {
  MAX_MESSAGES: 100, // messages
  WINDOW_MS: 60000, // 1 minute
  BURST_LIMIT: 10, // max messages per second
};

interface RateLimit {
  count: number;
  lastReset: number;
  burstCount: number;
  lastBurstReset: number;
}

export interface SSEClient {
  id: string;
  ip: string;
  connectedAt: Date;
  lastPingAt?: Date;
  subscriptions: Set<string>;
  authenticated: boolean;
  send: (data: string) => void;
  rateLimit: RateLimit;
  connectionTime: number;
}

interface ClientStats {
  id: string;
  ip: string;
  connectedAt: Date;
  lastPingAt?: Date;
  subscriptionCount: number;
  connectionDuration: number;
  messagesSent: number;
  lastActivity: Date;
}

export class SSEManager extends EventEmitter {
  private clients: Map<string, SSEClient> = new Map();
  private static instance: SSEManager | null = null;
  private entityStates: Map<string, HassEntity> = new Map();
  private readonly maxClients: number;
  private readonly pingInterval: number;
  private readonly cleanupInterval: number;
  private readonly maxConnectionAge: number;
  private readonly rateLimit: typeof DEFAULT_RATE_LIMIT;

  constructor(
    options: {
      maxClients?: number;
      pingInterval?: number;
      cleanupInterval?: number;
      maxConnectionAge?: number;
      rateLimit?: Partial<typeof DEFAULT_RATE_LIMIT>;
    } = {},
  ) {
    super();
    this.maxClients = options.maxClients || DEFAULT_MAX_CLIENTS;
    this.pingInterval = options.pingInterval || DEFAULT_PING_INTERVAL;
    this.cleanupInterval = options.cleanupInterval || DEFAULT_CLEANUP_INTERVAL;
    this.maxConnectionAge = options.maxConnectionAge || DEFAULT_MAX_CONNECTION_AGE;
    this.rateLimit = { ...DEFAULT_RATE_LIMIT, ...options.rateLimit };

    logger.info("Initializing SSE Manager...");
    this.startMaintenanceTasks();
  }

  private startMaintenanceTasks(): void {
    // Send periodic pings to keep connections alive
    setInterval(() => {
      this.clients.forEach((client) => {
        if (!this.isRateLimited(client)) {
          try {
            client.send(
              JSON.stringify({
                type: "ping",
                timestamp: new Date().toISOString(),
              }),
            );
            client.lastPingAt = new Date();
          } catch (error) {
            logger.error(`Failed to ping client ${client.id}:`, error);
            this.removeClient(client.id);
          }
        }
      });
    }, this.pingInterval);

    // Cleanup inactive or expired connections
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, clientId) => {
        const connectionAge = now - client.connectedAt.getTime();
        const lastPingAge = client.lastPingAt ? now - client.lastPingAt.getTime() : 0;

        if (connectionAge > this.maxConnectionAge || lastPingAge > this.pingInterval * 2) {
          logger.info(`Removing inactive client ${clientId}`);
          this.removeClient(clientId);
        }
      });
    }, this.cleanupInterval);
  }

  static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  addClient(
    client: Omit<SSEClient, "authenticated" | "subscriptions" | "rateLimit">,
    token: string,
  ): SSEClient | null {
    // Validate token
    const validationResult = TokenManager.validateToken(token, client.ip);
    if (!validationResult.valid) {
      logger.warn(
        `Invalid token for client ${client.id} from IP ${client.ip}: ${validationResult.error}`,
      );
      return null;
    }

    // Check client limit
    if (this.clients.size >= this.maxClients) {
      logger.warn(`Maximum client limit (${this.maxClients}) reached`);
      return null;
    }

    // Create new client with authentication and subscriptions
    const newClient: SSEClient = {
      ...client,
      authenticated: true,
      subscriptions: new Set(),
      lastPingAt: new Date(),
      rateLimit: {
        count: 0,
        lastReset: Date.now(),
        burstCount: 0,
        lastBurstReset: Date.now(),
      },
    };

    this.clients.set(client.id, newClient);
    logger.info(`New client ${client.id} connected from IP ${client.ip}`);

    return newClient;
  }

  private isRateLimited(client: SSEClient): boolean {
    const now = Date.now();

    // Reset window counters if needed
    if (now - client.rateLimit.lastReset >= this.rateLimit.WINDOW_MS) {
      client.rateLimit.count = 0;
      client.rateLimit.lastReset = now;
    }

    // Reset burst counters if needed (every second)
    if (now - client.rateLimit.lastBurstReset >= 1000) {
      client.rateLimit.burstCount = 0;
      client.rateLimit.lastBurstReset = now;
    }

    // Check both window and burst limits
    return (
      client.rateLimit.count >= this.rateLimit.MAX_MESSAGES ||
      client.rateLimit.burstCount >= this.rateLimit.BURST_LIMIT
    );
  }

  private updateRateLimit(client: SSEClient): void {
    const now = Date.now();
    client.rateLimit.count++;
    client.rateLimit.burstCount++;

    // Update timestamps if needed
    if (now - client.rateLimit.lastReset >= this.rateLimit.WINDOW_MS) {
      client.rateLimit.lastReset = now;
      client.rateLimit.count = 1;
    }

    if (now - client.rateLimit.lastBurstReset >= 1000) {
      client.rateLimit.lastBurstReset = now;
      client.rateLimit.burstCount = 1;
    }
  }

  removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      logger.info(`SSE client disconnected: ${clientId}`);
      this.emit("client_disconnected", {
        clientId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  subscribeToEntity(clientId: string, entityId: string): void {
    const client = this.clients.get(clientId);
    if (!client?.authenticated) {
      logger.warn(
        `Unauthenticated client ${clientId} attempted to subscribe to entity: ${entityId}`,
      );
      return;
    }

    client.subscriptions.add(`entity:${entityId}`);
    logger.info(`Client ${clientId} subscribed to entity: ${entityId}`);

    // Send current state if available
    const currentState = this.entityStates.get(entityId);
    if (currentState && !this.isRateLimited(client)) {
      this.sendToClient(client, {
        type: "state_changed",
        data: {
          entity_id: currentState.entity_id,
          state: currentState.state,
          attributes: currentState.attributes,
          last_changed: currentState.last_changed,
          last_updated: currentState.last_updated,
        },
      });
    }
  }

  subscribeToDomain(clientId: string, domain: string): void {
    const client = this.clients.get(clientId);
    if (!client?.authenticated) {
      logger.warn(`Unauthenticated client ${clientId} attempted to subscribe to domain: ${domain}`);
      return;
    }

    client.subscriptions.add(`domain:${domain}`);
    logger.info(`Client ${clientId} subscribed to domain: ${domain}`);

    // Send current states for all entities in domain
    this.entityStates.forEach((state, entityId) => {
      if (entityId.startsWith(`${domain}.`) && !this.isRateLimited(client)) {
        this.sendToClient(client, {
          type: "state_changed",
          data: {
            entity_id: state.entity_id,
            state: state.state,
            attributes: state.attributes,
            last_changed: state.last_changed,
            last_updated: state.last_updated,
          },
        });
      }
    });
  }

  subscribeToEvent(clientId: string, eventType: string): void {
    const client = this.clients.get(clientId);
    if (!client?.authenticated) {
      logger.warn(
        `Unauthenticated client ${clientId} attempted to subscribe to event: ${eventType}`,
      );
      return;
    }

    client.subscriptions.add(`event:${eventType}`);
    logger.info(`Client ${clientId} subscribed to event: ${eventType}`);
  }

  broadcastStateChange(entity: HassEntity): void {
    // Update stored state
    this.entityStates.set(entity.entity_id, entity);

    const domain = entity.entity_id.split(".")[0];
    const message = {
      type: "state_changed",
      data: {
        entity_id: entity.entity_id,
        state: entity.state,
        attributes: entity.attributes,
        last_changed: entity.last_changed,
        last_updated: entity.last_updated,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Broadcasting state change for ${entity.entity_id}`);

    // Serialize message once for all clients (performance optimization)
    let serializedMessage: string | null = null;

    // Send to relevant subscribers only
    this.clients.forEach((client) => {
      if (!client.authenticated || this.isRateLimited(client)) return;

      if (
        client.subscriptions.has(`entity:${entity.entity_id}`) ||
        client.subscriptions.has(`domain:${domain}`) ||
        client.subscriptions.has("event:state_changed")
      ) {
        // Lazy-serialize message on first send
        if (serializedMessage === null) {
          serializedMessage = JSON.stringify(message);
        }
        this.sendToClientPreSerialized(client, serializedMessage);
      }
    });
  }

  broadcastEvent(event: HassEvent): void {
    const message = {
      type: event.event_type,
      data: event.data,
      origin: event.origin,
      time_fired: event.time_fired,
      context: event.context,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Broadcasting event: ${event.event_type}`);

    // Serialize message once for all clients (performance optimization)
    let serializedMessage: string | null = null;

    // Send to relevant subscribers only
    this.clients.forEach((client) => {
      if (!client.authenticated || this.isRateLimited(client)) return;

      if (client.subscriptions.has(`event:${event.event_type}`)) {
        // Lazy-serialize message on first send
        if (serializedMessage === null) {
          serializedMessage = JSON.stringify(message);
        }
        this.sendToClientPreSerialized(client, serializedMessage);
      }
    });
  }

  updateEntityState(entityId: string, state: HassEntity): void {
    if (!state || typeof state.state === "undefined") {
      logger.warn(`Invalid state update for entity ${entityId}`);
      return;
    }

    // Update state in memory
    this.entityStates.set(entityId, state);

    // Notify subscribed clients
    this.clients.forEach((client) => {
      if (!client.authenticated || this.isRateLimited(client)) {
        return;
      }

      const [domain] = entityId.split(".");
      if (
        client.subscriptions.has(`entity:${entityId}`) ||
        client.subscriptions.has(`domain:${domain}`)
      ) {
        this.sendToClient(client, {
          type: "state_changed",
          data: {
            entity_id: state.entity_id,
            state: state.state,
            attributes: state.attributes,
            last_changed: state.last_changed,
            last_updated: state.last_updated,
          },
        });
      }
    });
  }

  getStatistics(): { totalClients: number; authenticatedClients: number } {
    let authenticatedCount = 0;
    this.clients.forEach((client) => {
      if (client.authenticated) {
        authenticatedCount++;
      }
    });

    return {
      totalClients: this.clients.size,
      authenticatedClients: authenticatedCount,
    };
  }

  /**
   * Send pre-serialized data to client (optimization to avoid multiple JSON.stringify calls)
   */
  private sendToClientPreSerialized(client: SSEClient, serializedData: string): void {
    try {
      logger.info(`Attempting to send data to client ${client.id}`);
      client.send(serializedData);
      this.updateRateLimit(client);
    } catch (error) {
      logger.error(`Failed to send data to client ${client.id}:`, error);
      logger.info(`Removing client ${client.id} due to send error`);
      this.removeClient(client.id);
      logger.info(`Client count after removal: ${this.clients.size}`);
    }
  }

  private sendToClient(client: SSEClient, data: any): void {
    try {
      logger.info(`Attempting to send data to client ${client.id}`);
      client.send(JSON.stringify(data));
      this.updateRateLimit(client);
    } catch (error) {
      logger.error(`Failed to send data to client ${client.id}:`, error);
      logger.info(`Removing client ${client.id} due to send error`);
      this.removeClient(client.id);
      logger.info(`Client count after removal: ${this.clients.size}`);
    }
  }
}

export const sseManager = SSEManager.getInstance();
