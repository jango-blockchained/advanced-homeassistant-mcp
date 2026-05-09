import { describe, expect, test, beforeEach, mock } from "bun:test";
import { EventEmitter } from "events";

// Hoisted: replace the `ws` module before importing the source.
class FakeWebSocket extends EventEmitter {
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState = FakeWebSocket.OPEN;
  send = mock((_: string) => undefined);
  close = mock(() => {
    this.readyState = FakeWebSocket.CLOSED;
  });
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: { error?: Error; message?: string }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(url: string) {
    super();
    this.url = url;
    sockets.push(this);
  }
}

// Track every constructed socket; tests grab the most recent one. Pushing
// `this` into a module-scope array (rather than aliasing `this` to a
// `lastSocket` variable inside the constructor) keeps eslint's
// no-this-alias rule happy.
const sockets: FakeWebSocket[] = [];
const lastSocket = (): FakeWebSocket => {
  const s = sockets.at(-1);
  if (!s) throw new Error("no socket constructed yet");
  return s;
};

// `void` rather than `await` — mock.module's factory is sync so the actual
// return is void, but the union return type would otherwise trip the
// floating-promise lint. Bun hoists mock.module to before static imports.
void mock.module("ws", () => ({
  default: FakeWebSocket,
  WebSocket: FakeWebSocket,
}));

import { HassWebSocketClient } from "../../src/websocket/client";

describe("HassWebSocketClient", () => {
  let client: InstanceType<typeof HassWebSocketClient>;

  beforeEach(() => {
    sockets.length = 0;
    client = new HassWebSocketClient("ws://localhost:8123/api/websocket", "test-token");
  });

  test("connect/auth/disconnect lifecycle", async () => {
    expect(client.isConnected()).toBe(false);
    expect(client.isAuthenticated()).toBe(false);

    const connectPromise = client.connect();
    lastSocket().onopen!();
    await connectPromise;

    expect(client.isConnected()).toBe(true);
    expect(lastSocket().send).toHaveBeenCalledWith(
      JSON.stringify({ type: "auth", access_token: "test-token" }),
    );

    lastSocket().onmessage!({ data: JSON.stringify({ type: "auth_ok" }) });
    expect(client.isAuthenticated()).toBe(true);

    client.disconnect();
    expect(lastSocket().close).toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
    expect(client.isAuthenticated()).toBe(false);
  });

  test("calling connect twice while open is a no-op", async () => {
    const connect1 = client.connect();
    lastSocket().onopen!();
    await connect1;

    const sentBefore = lastSocket().send.mock.calls.length;
    await client.connect(); // socket already open → returns immediately
    expect(lastSocket().send.mock.calls.length).toBe(sentBefore);
  });
});
