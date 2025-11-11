import type { Mock } from "bun:test";

export interface SSEClient {
  id: string;
  ip: string;
  connectedAt: Date;
  send: Mock<(data: string) => void>;
  rateLimit: {
    count: number;
    lastReset: number;
  };
  connectionTime: number;
}

export interface HassEventData {
  [key: string]: unknown;
}

export interface SSEEvent {
  event_type: string;
  data: HassEventData;
  origin: string;
  time_fired: string;
  context: {
    id: string;
    [key: string]: unknown;
  };
}

export interface SSEMessage {
  type: string;
  data?: unknown;
  error?: string;
}

export interface SSEManagerConfig {
  maxClients?: number;
  pingInterval?: number;
  cleanupInterval?: number;
  maxConnectionAge?: number;
  rateLimitWindow?: number;
  maxRequestsPerWindow?: number;
}

export type MockSendFn = (data: string) => void;
export type MockSend = Mock<MockSendFn>;

export type ValidateTokenFn = (token: string, ip?: string) => { valid: boolean; error?: string };
export type MockValidateToken = Mock<ValidateTokenFn>;

// Type guard for mock functions
export function isMockFunction(value: unknown): value is Mock<unknown> {
  return typeof value === "function" && "mock" in value;
}

// Safe type assertion for mock objects
export function asMockFunction<T extends (...args: any[]) => any>(value: unknown): Mock<T> {
  if (!isMockFunction(value)) {
    throw new Error("Value is not a mock function");
  }
  return value as Mock<T>;
}
