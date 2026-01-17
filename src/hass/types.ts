import type { WebSocket } from "ws";

export interface HassInstanceImpl {
  baseUrl: string;
  token: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStates(): Promise<any[]>;
  callService(domain: string, service: string, data?: any): Promise<void>;
  fetchStates(): Promise<any[]>;
  fetchState(entityId: string): Promise<any>;
  subscribeEvents(callback: (event: any) => void, eventType?: string): Promise<number>;
  unsubscribeEvents(subscriptionId: number): Promise<void>;
}

export interface HassWebSocketClient {
  url: string;
  token: string;
  socket: WebSocket | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: any): Promise<void>;
  subscribe(callback: (data: any) => void): () => void;
}

export interface HassState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HassServiceCall {
  domain: string;
  service: string;
  target?: {
    entity_id?: string | string[];
    device_id?: string | string[];
    area_id?: string | string[];
  };
  service_data?: Record<string, any>;
}

export interface HassEvent {
  event_type: string;
  data: any;
  origin: string;
  time_fired: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export type MockFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: Parameters<T>[];
    results: { type: "return" | "throw"; value: any }[];
    instances: any[];
    mockImplementation(fn: T): MockFunction<T>;
    mockReturnValue(value: ReturnType<T>): MockFunction<T>;
    mockResolvedValue(value: Awaited<ReturnType<T>>): MockFunction<T>;
    mockRejectedValue(value: any): MockFunction<T>;
    mockReset(): void;
  };
};

// Trace types for WebSocket API
export interface TraceListResult {
  item_id: string;
  run_id: string;
  state: string;
  timestamp: { start: string; finish: string | null };
  domain: string;
  last_step: string | null;
  error?: string;
}

export interface TraceResult {
  trace: Record<string, TraceStep[]>;
  context: { id: string; parent_id: string | null; user_id: string | null };
  script_execution: string;
  config: Record<string, any>;
  blueprint_inputs?: Record<string, any>;
}

export interface TraceStep {
  path: string;
  timestamp: string;
  result?: any;
  changed_variables?: Record<string, any>;
}

export interface TraceContext {
  run_id: string;
  domain: string;
  item_id: string;
}
