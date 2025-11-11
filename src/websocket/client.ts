import WebSocket from "ws";
import { EventEmitter } from "events";

interface HassMessage {
  type: string;
  id?: number;
  [key: string]: any;
}

interface HassAuthMessage extends HassMessage {
  type: "auth";
  access_token: string;
}

interface HassEventMessage extends HassMessage {
  type: "event";
  event: {
    event_type: string;
    data: any;
  };
}

interface HassSubscribeMessage extends HassMessage {
  type: "subscribe_events";
  event_type?: string;
}

interface HassUnsubscribeMessage extends HassMessage {
  type: "unsubscribe_events";
  subscription: number;
}

interface HassResultMessage extends HassMessage {
  type: "result";
  success: boolean;
  error?: string;
}

export class HassWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private authenticated = false;
  private messageId = 1;
  private subscriptions = new Map<number, (data: any) => void>();
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(url: string, token: string) {
    super();
    this.url = url;
    this.token = token;
  }

  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.emit("connect");
          this.authenticate();
          resolve();
        };

        this.ws.onclose = () => {
          this.authenticated = false;
          this.emit("disconnect");
          this.handleReconnect();
        };

        this.ws.onerror = (event: WebSocket.ErrorEvent) => {
          const error = event.error || new Error(event.message || "WebSocket error");
          this.emit("error", error);
          if (!this.authenticated) {
            reject(error);
          }
        };

        this.ws.onmessage = (event: WebSocket.MessageEvent) => {
          if (typeof event.data === "string") {
            this.handleMessage(event.data);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.authenticated = false;
    }
  }

  private authenticate(): void {
    const authMessage: HassAuthMessage = {
      type: "auth",
      access_token: this.token,
    };
    this.send(authMessage);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as HassMessage;

      switch (message.type) {
        case "auth_ok":
          this.authenticated = true;
          this.emit("authenticated", message);
          break;

        case "auth_invalid":
          this.authenticated = false;
          this.emit("auth_failed", message);
          this.disconnect();
          break;

        case "event":
          this.handleEvent(message as HassEventMessage);
          break;

        case "result": {
          const resultMessage = message as HassResultMessage;
          if (resultMessage.success) {
            this.emit("result", resultMessage);
          } else {
            this.emit("error", new Error(resultMessage.error || "Unknown error"));
          }
          break;
        }

        default:
          this.emit("error", new Error(`Unknown message type: ${message.type}`));
      }
    } catch (error) {
      this.emit("error", error);
    }
  }

  private handleEvent(message: HassEventMessage): void {
    this.emit("event", message.event);
    const callback = this.subscriptions.get(message.id || 0);
    if (callback) {
      callback(message.event.data);
    }
  }

  public async subscribeEvents(
    eventType: string | undefined,
    callback: (data: any) => void,
  ): Promise<number> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const id = this.messageId++;
    const message: HassSubscribeMessage = {
      id,
      type: "subscribe_events",
      event_type: eventType,
    };

    return new Promise((resolve, reject) => {
      const handleResult = (result: HassResultMessage) => {
        if (result.id === id) {
          this.removeListener("result", handleResult);
          this.removeListener("error", handleError);

          if (result.success) {
            this.subscriptions.set(id, callback);
            resolve(id);
          } else {
            reject(new Error(result.error || "Failed to subscribe"));
          }
        }
      };

      const handleError = (error: Error) => {
        this.removeListener("result", handleResult);
        this.removeListener("error", handleError);
        reject(error);
      };

      this.on("result", handleResult);
      this.on("error", handleError);

      this.send(message);
    });
  }

  public async unsubscribeEvents(subscription: number): Promise<boolean> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const message: HassUnsubscribeMessage = {
      id: this.messageId++,
      type: "unsubscribe_events",
      subscription,
    };

    return new Promise((resolve, reject) => {
      const handleResult = (result: HassResultMessage) => {
        if (result.id === message.id) {
          this.removeListener("result", handleResult);
          this.removeListener("error", handleError);

          if (result.success) {
            this.subscriptions.delete(subscription);
            resolve(true);
          } else {
            reject(new Error(result.error || "Failed to unsubscribe"));
          }
        }
      };

      const handleError = (error: Error) => {
        this.removeListener("result", handleResult);
        this.removeListener("error", handleError);
        reject(error);
      };

      this.on("result", handleResult);
      this.on("error", handleError);

      this.send(message);
    });
  }

  private send(message: HassMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(message));
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(
        () => {
          this.connect().catch(() => {});
        },
        1000 * Math.pow(2, this.reconnectAttempts),
      );
    }
  }
}
