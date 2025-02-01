import { CreateApplication, TServiceParams, ServiceFunction, AlsExtension, GetApisResult, ILogger, InternalDefinition, TContext, TInjectedConfig, TLifecycleBase, TScheduler } from "@digital-alchemy/core";
import { Area, Backup, CallProxy, Configure, Device, EntityManager, EventsService, FetchAPI, FetchInternals, Floor, IDByExtension, Label, LIB_HASS, ReferenceService, Registry, WebsocketAPI, Zone } from "@digital-alchemy/hass";
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
  baseUrl: string;
  token: string;
  wsClient: HassWebSocketClient | undefined;
  services: HassServices;
  als: AlsExtension;
  context: TContext;
  event: EventEmitter<[never]>;
  internal: InternalDefinition;
  lifecycle: TLifecycleBase;
  logger: ILogger;
  scheduler: TScheduler;
  config: TInjectedConfig;
  params: TServiceParams;
  hass: GetApisResult<{
    area: typeof Area;
    backup: typeof Backup;
    call: typeof CallProxy;
    configure: typeof Configure;
    device: typeof Device;
    entity: typeof EntityManager;
    events: typeof EventsService;
    fetch: typeof FetchAPI;
    floor: typeof Floor;
    idBy: typeof IDByExtension;
    internals: typeof FetchInternals;
    label: typeof Label;
    refBy: typeof ReferenceService;
    registry: typeof Registry;
    socket: typeof WebsocketAPI;
    zone: typeof Zone;
  }>;
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

export interface HassConfig {
  host: string;
  token: string;
}

const CONFIG: Record<string, HassConfig> = {
  development: {
    host: process.env.HASS_HOST || 'http://localhost:8123',
    token: process.env.HASS_TOKEN || ''
  },
  production: {
    host: process.env.HASS_HOST || '',
    token: process.env.HASS_TOKEN || ''
  },
  test: {
    host: 'http://localhost:8123',
    token: 'test_token'
  }
};

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

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.emit('open');
        const authMessage: HomeAssistant.AuthMessage = {
          type: 'auth',
          access_token: this.token
        };
        this.ws?.send(JSON.stringify(authMessage));
      });

      this.ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message);
        } catch (error) {
          this.emit('error', new Error('Failed to parse message'));
        }
      });

      this.ws.on('close', () => {
        this.emit('disconnected');
        if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, this.options.reconnectDelay);
        }
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'auth_ok':
        this.emit('auth_ok');
        break;
      case 'auth_invalid':
        this.emit('auth_invalid');
        break;
      case 'result':
        // Handle command results
        break;
      case 'event':
        if (message.event) {
          this.emit('event', message.event);
          const subscription = this.subscriptions.get(message.id);
          if (subscription) {
            subscription(message.event.data);
          }
        }
        break;
      default:
        this.emit('error', new Error(`Unknown message type: ${message.type}`));
    }
  }

  async subscribeEvents(callback: (data: any) => void, eventType?: string): Promise<number> {
    const id = this.messageId++;
    const message = {
      id,
      type: 'subscribe_events',
      event_type: eventType
    };

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.subscriptions.set(id, callback);
      this.ws.send(JSON.stringify(message));
      resolve(id);
    });
  }

  async unsubscribeEvents(subscriptionId: number): Promise<void> {
    const message = {
      id: this.messageId++,
      type: 'unsubscribe_events',
      subscription: subscriptionId
    };

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.ws.send(JSON.stringify(message));
      this.subscriptions.delete(subscriptionId);
      resolve();
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export class HassInstanceImpl implements HassInstance {
  public readonly baseUrl: string;
  public readonly token: string;
  public wsClient: HassWebSocketClient | undefined;

  public services!: HassServices;
  public als!: AlsExtension;
  public context!: TContext;
  public event!: EventEmitter<[never]>;
  public internal!: InternalDefinition;
  public lifecycle!: TLifecycleBase;
  public logger!: ILogger;
  public scheduler!: TScheduler;
  public config!: TInjectedConfig;
  public params!: TServiceParams;
  public hass!: GetApisResult<{
    area: typeof Area;
    backup: typeof Backup;
    call: typeof CallProxy;
    configure: typeof Configure;
    device: typeof Device;
    entity: typeof EntityManager;
    events: typeof EventsService;
    fetch: typeof FetchAPI;
    floor: typeof Floor;
    idBy: typeof IDByExtension;
    internals: typeof FetchInternals;
    label: typeof Label;
    refBy: typeof ReferenceService;
    registry: typeof Registry;
    socket: typeof WebsocketAPI;
    zone: typeof Zone;
  }>;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.initialize();
  }

  private initialize() {
    // Initialize all required properties with proper type instantiation
    this.services = {} as HassServices;
    this.als = {} as AlsExtension;
    this.context = {} as TContext;
    this.event = new EventEmitter();
    this.internal = {} as InternalDefinition;
    this.lifecycle = {} as TLifecycleBase;
    this.logger = {} as ILogger;
    this.scheduler = {} as TScheduler;
    this.config = {} as TInjectedConfig;
    this.params = {} as TServiceParams;
    this.hass = {} as GetApisResult<any>;
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