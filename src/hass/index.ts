import { CreateApplication, TServiceParams, ServiceFunction } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { DomainSchema } from "../schemas.js";
import { HASS_CONFIG } from "../config/hass.config.js";
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import * as HomeAssistant from '../types/hass.js';

type Environments = "development" | "production" | "test";

// Define the type for Home Assistant services
type HassServiceMethod = (data: Record<string, unknown>) => Promise<void>;

type HassServices = {
  [K in keyof typeof DomainSchema.Values]: {
    [service: string]: HassServiceMethod;
  };
};

// Define the type for Home Assistant instance
interface HassInstance extends TServiceParams {
  services: HassServices;
}

// Configuration type for application with more specific constraints
type ApplicationConfiguration = {
  NODE_ENV: ServiceFunction<Environments>;
};

// Strict configuration type for Home Assistant
type HassConfiguration = {
  BASE_URL: {
    type: "string";
    description: string;
    required: true;
    default: string;
  };
  TOKEN: {
    type: "string";
    description: string;
    required: true;
    default: string;
  };
  SOCKET_URL: {
    type: "string";
    description: string;
    required: true;
    default: string;
  };
  SOCKET_TOKEN: {
    type: "string";
    description: string;
    required: true;
    default: string;
  };
};

// application
const MY_APP = CreateApplication<ApplicationConfiguration, {}>({
  configuration: {
    NODE_ENV: {
      type: "string",
      default: "development",
      enum: ["development", "production", "test"],
      description: "Code runner addon can set with it's own NODE_ENV",
    },
  },
  services: {
    NODE_ENV: () => {
      // Directly return the default value or use process.env
      return (process.env.NODE_ENV as Environments) || "development";
    }
  },
  libraries: [
    {
      ...LIB_HASS,
      configuration: {
        BASE_URL: {
          type: "string",
          description: "Home Assistant base URL",
          required: true,
          default: HASS_CONFIG.BASE_URL
        },
        TOKEN: {
          type: "string",
          description: "Home Assistant long-lived access token",
          required: true,
          default: HASS_CONFIG.TOKEN
        },
        SOCKET_URL: {
          type: "string",
          description: "Home Assistant WebSocket URL",
          required: true,
          default: HASS_CONFIG.SOCKET_URL
        },
        SOCKET_TOKEN: {
          type: "string",
          description: "Home Assistant WebSocket token",
          required: true,
          default: HASS_CONFIG.SOCKET_TOKEN
        }
      }
    }
  ],
  name: 'hass' as const
});

let hassInstance: HassInstance | null = null;

export async function get_hass(): Promise<HassInstance> {
  if (!hassInstance) {
    // Safely get configuration keys, providing an empty object as fallback
    const _sortedConfigKeys = Object.keys(MY_APP.configuration ?? {}).sort();

    const instance = await MY_APP.bootstrap();
    hassInstance = instance as HassInstance;
  }
  return hassInstance;
}

export class HassWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private subscriptions = new Map<number, (data: any) => void>();
  private reconnectAttempts = 0;
  private options: {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    reconnectDelay: number;
  };

  constructor(
    private url: string,
    private token: string,
    options: Partial<typeof HassWebSocketClient.prototype.options> = {}
  ) {
    super();
    this.options = {
      autoReconnect: true,
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      ...options
    };
  }

  // ... rest of WebSocket client implementation ...
}

export class HassInstance {
  private baseUrl: string;
  private token: string;
  private wsClient: HassWebSocketClient | null;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.wsClient = null;
  }

  async fetchStates(): Promise<HomeAssistant.Entity[]> {
    const response = await fetch(`${this.baseUrl}/api/states`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch states: ${response.statusText}`);
    }

    const data = await response.json();
    return data as HomeAssistant.Entity[];
  }

  async fetchState(entityId: string): Promise<HomeAssistant.Entity> {
    const response = await fetch(`${this.baseUrl}/api/states/${entityId}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch state: ${response.statusText}`);
    }

    const data = await response.json();
    return data as HomeAssistant.Entity;
  }

  async callService(domain: string, service: string, data: Record<string, any>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Service call failed: ${response.statusText}`);
    }
  }

  async subscribeEvents(callback: (event: HomeAssistant.Event) => void, eventType?: string): Promise<number> {
    if (!this.wsClient) {
      this.wsClient = new HassWebSocketClient(
        this.baseUrl.replace(/^http/, 'ws') + '/api/websocket',
        this.token
      );
      await this.wsClient.connect();
    }

    return this.wsClient.subscribeEvents(callback, eventType);
  }

  async unsubscribeEvents(subscriptionId: number): Promise<void> {
    if (this.wsClient) {
      await this.wsClient.unsubscribeEvents(subscriptionId);
    }
  }
}