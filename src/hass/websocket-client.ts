import WebSocket from "ws";
import { EventEmitter } from "events";
import type { HassWebSocketClient, HassState, HassServiceCall, TraceListResult, TraceResult, TraceContext } from "./types.js";
import { logger } from "../utils/logger.js";

export class HomeAssistantWebSocketClient extends EventEmitter implements HassWebSocketClient {
  public url: string;
  public token: string;
  public socket: WebSocket | null = null;
  private connected = false;
  private messageId = 1;
  private pendingRequests = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: any) => void }
  >();
  private subscriptions = new Map<number, (data: any) => void>();

  constructor(url: string, token: string) {
    super();
    this.url = url;
    this.token = token;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.on("open", () => {
          logger.info("WebSocket connection opened");
          this.authenticate().then(resolve).catch(reject);
        });

        this.socket.on("message", (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            logger.error("Failed to parse WebSocket message:", error);
          }
        });

        this.socket.on("error", (error) => {
          logger.error("WebSocket error:", error);
          reject(error);
        });

        this.socket.on("close", (code, reason) => {
          logger.info(`WebSocket connection closed: ${code} - ${reason}`);
          this.connected = false;
          this.emit("disconnected");
        });
      } catch (error) {
        logger.error("Failed to create WebSocket connection:", error);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    // Reject all pending requests
    for (const { reject } of this.pendingRequests.values()) {
      reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
  }

  private async authenticate(): Promise<void> {
    const authMessage = {
      type: "auth",
      access_token: this.token,
    };

    return new Promise((resolve, reject) => {
      const authHandler = (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "auth_ok") {
            this.connected = true;
            this.emit("connected");
            this.socket?.removeListener("message", authHandler);
            resolve();
          } else if (message.type === "auth_invalid") {
            this.socket?.removeListener("message", authHandler);
            reject(new Error("Authentication failed"));
          }
        } catch (error) {
          logger.error("Failed to parse auth message:", error);
        }
      };

      this.socket?.on("message", authHandler);

      // Send auth message
      this.socket?.send(JSON.stringify(authMessage));

      // Timeout after 10 seconds
      setTimeout(() => {
        this.socket?.removeListener("message", authHandler);
        reject(new Error("Authentication timeout"));
      }, 10000);
    });
  }

  async send(message: any): Promise<any> {
    if (!this.connected || !this.socket) {
      throw new Error("WebSocket not connected");
    }

    const id = this.messageId++;
    const fullMessage = { id, ...message };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.socket!.send(JSON.stringify(fullMessage));

      // Timeout after 30 seconds
      setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("Request timeout"));
      }, 30000);
    });
  }

  private handleMessage(message: any): void {
    // Handle responses to our requests
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.success === false) {
        reject(new Error(message.error?.message || "Request failed"));
      } else {
        resolve(message.result);
      }
    }

    // Handle subscriptions
    if (message.type === "event") {
      const subscription = this.subscriptions.get(message.id);
      if (subscription) {
        subscription(message.event);
      }
    }

    // Emit all messages for external listeners
    this.emit("message", message);
  }

  subscribe(callback: (data: any) => void): () => void {
    let subscriptionId: number | null = null;

    // Subscribe to all state changes
    this.send({
      type: "subscribe_events",
      event_type: "state_changed",
    })
      .then((result) => {
        if (result && typeof result === "object" && "id" in result) {
          subscriptionId = result.id as number;
          this.subscriptions.set(subscriptionId, callback);
          logger.debug(`WebSocket subscription created with ID: ${subscriptionId}`);
        }
      })
      .catch((error) => {
        logger.error("Failed to subscribe to events:", error);
      });

    // Return unsubscribe function that properly cleans up
    return () => {
      if (subscriptionId !== null) {
        this.send({
          type: "unsubscribe_events",
          subscription: subscriptionId,
        })
          .then(() => {
            this.subscriptions.delete(subscriptionId!);
            logger.debug(`WebSocket subscription ${subscriptionId} removed`);
          })
          .catch((error) => {
            logger.error(`Failed to unsubscribe from WebSocket events:`, error);
            // Manually clean up even if unsubscribe fails
            this.subscriptions.delete(subscriptionId!);
          });
      }
    };
  }

  // Convenience methods for common operations
  async getStates(): Promise<HassState[]> {
    const result = await this.send({ type: "get_states" });
    return result;
  }

  async getState(entityId: string): Promise<HassState> {
    const result = await this.send({
      type: "get_state",
      entity_id: entityId,
    });
    return result;
  }

  async callService(domain: string, service: string, serviceData?: any): Promise<void> {
    await this.send({
      type: "call_service",
      domain,
      service,
      service_data: serviceData || {},
    });
  }

  // Trace operations (WebSocket only - these don't exist in REST API)
  async listTraces(domain: string = "automation", itemId?: string): Promise<TraceListResult[]> {
    return this.send({
      type: "trace/list",
      domain,
      ...(itemId && { item_id: itemId }),
    });
  }

  async getTrace(domain: string, itemId: string, runId: string): Promise<TraceResult> {
    return this.send({
      type: "trace/get",
      domain,
      item_id: itemId,
      run_id: runId,
    });
  }

  async listTraceContexts(domain?: string, itemId?: string): Promise<TraceContext[]> {
    return this.send({
      type: "trace/contexts",
      ...(domain && { domain }),
      ...(itemId && { item_id: itemId }),
    });
  }
}
