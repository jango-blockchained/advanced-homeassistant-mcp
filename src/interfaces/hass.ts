/// <reference lib="dom" />

// Home Assistant entity types
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}

export interface HassState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    description?: string;
    [key: string]: any;
  };
}

// Home Assistant instance types
export interface HassInstance {
  states: HassStates;
  services: HassServices;
  connection: HassConnection;
  subscribeEvents: (callback: (event: HassEvent) => void, eventType?: string) => Promise<number>;
  unsubscribeEvents: (subscription: number) => void;
}

export interface HassStates {
  get: () => Promise<HassEntity[]>;
  subscribe: (callback: (states: HassEntity[]) => void) => Promise<number>;
  unsubscribe: (subscription: number) => void;
}

export interface HassServices {
  get: () => Promise<Record<string, Record<string, HassService>>>;
  call: (domain: string, service: string, serviceData?: Record<string, any>) => Promise<void>;
}

export interface HassConnection {
  socket: WebSocket;
  subscribeEvents: (callback: (event: HassEvent) => void, eventType?: string) => Promise<number>;
  unsubscribeEvents: (subscription: number) => void;
}

export interface HassService {
  name: string;
  description: string;
  target?: {
    entity?: {
      domain: string[];
    };
  };
  fields: Record<
    string,
    {
      name: string;
      description: string;
      required?: boolean;
      example?: any;
      selector?: any;
    }
  >;
}

export interface HassEvent {
  event_type: string;
  data: Record<string, any>;
  origin: string;
  time_fired: string;
  context: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}
