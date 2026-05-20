// Hoisted: must run before importing the source so the `ws` module
// is replaced before HassWebSocketClient resolves the WebSocket constructor.
import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { EventEmitter } from "events";

class FakeWebSocket extends EventEmitter {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.OPEN;
  url: string;
  send = mock((_data: string) => undefined);
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
// `lastSocket` variable) keeps the constructor body free of the
// no-this-alias pattern eslint flags.
const sockets: FakeWebSocket[] = [];
const lastSocket = (): FakeWebSocket => {
  const s = sockets.at(-1);
  if (!s) throw new Error("no socket constructed yet");
  return s;
};

// mock.module's signature returns `void | Promise<void>`. The factory here
// is synchronous so the actual return is void, but the linter sees the
// union type and flags a floating promise — `void` operator suppresses
// that without changing runtime behavior. Bun hoists mock.module to before
// static imports, so the source's `import WebSocket from "ws"` will see
// the replacement.
void mock.module("ws", () => ({
  default: FakeWebSocket,
  WebSocket: FakeWebSocket,
}));

import { HassWebSocketClient } from "../../src/websocket/client";

describe("HassWebSocketClient event handling", () => {
  let client: InstanceType<typeof HassWebSocketClient>;

  beforeEach(() => {
    sockets.length = 0;
    client = new HassWebSocketClient("ws://localhost:8123/api/websocket", "test-token");
  });

  afterEach(() => {
    client.disconnect();
  });

  test("connect resolves on socket open and sends auth message", async () => {
    const connectPromise = client.connect();
    // Source: ws.onopen → authenticate() → ws.send({type:"auth",...}) → resolve()
    lastSocket().onopen!();
    await connectPromise;
    expect(client.isConnected()).toBe(true);

    expect(lastSocket().send).toHaveBeenCalledWith(
      JSON.stringify({ type: "auth", access_token: "test-token" }),
    );
  });

  test("auth_ok sets authenticated and emits 'authenticated'", async () => {
    const connectPromise = client.connect();
    lastSocket().onopen!();
    await connectPromise;

    const authEvent = new Promise((resolve) => client.once("authenticated", resolve));
    lastSocket().onmessage!({ data: JSON.stringify({ type: "auth_ok" }) });

    await authEvent;
    expect(client.isAuthenticated()).toBe(true);
  });

  test("auth_invalid emits 'auth_failed' and disconnects", async () => {
    const connectPromise = client.connect();
    lastSocket().onopen!();
    await connectPromise;

    const authFailed = new Promise((resolve) => client.once("auth_failed", resolve));
    lastSocket().onmessage!({
      data: JSON.stringify({ type: "auth_invalid", message: "bad token" }),
    });

    const failure = await authFailed;
    expect(failure).toMatchObject({ type: "auth_invalid", message: "bad token" });
    expect(client.isAuthenticated()).toBe(false);
    expect(lastSocket().close).toHaveBeenCalled();
  });

  test("connect emits 'error' when ws.onerror fires before authentication", async () => {
    const errorPromise = new Promise<Error>((resolve) =>
      client.once("error", (err: Error) => resolve(err)),
    );
    // connect rejects synchronously through onerror; swallow the rejection
    const connectPromise = client.connect().catch(() => undefined);
    lastSocket().onerror!({ error: new Error("Connection failed") });

    const err = await errorPromise;
    expect(err.message).toBe("Connection failed");
    await connectPromise;
  });

  test("close event clears authenticated state and emits 'disconnect'", async () => {
    const connectPromise = client.connect();
    lastSocket().onopen!();
    await connectPromise;

    const disconnected = new Promise((resolve) => client.once("disconnect", resolve));
    lastSocket().onclose!();

    await disconnected;
    expect(client.isAuthenticated()).toBe(false);
  });

  // Helper: read the most recent JSON frame the source sent over the socket.
  // Centralizes the JSON.parse(...) so each call site doesn't have to deal
  // with the Promise<string> typing of mock.calls.at(-1)?.[0].
  const lastSentFrame = (): { id: number; type: string; [k: string]: unknown } => {
    const lastArgs = lastSocket().send.mock.calls.at(-1);
    if (!lastArgs) throw new Error("no send call recorded");
    return JSON.parse(lastArgs[0]) as { id: number; type: string; [k: string]: unknown };
  };

  test("event messages dispatch to subscribed callback", async () => {
    const connectPromise = client.connect();
    lastSocket().onopen!();
    await connectPromise;
    lastSocket().onmessage!({ data: JSON.stringify({ type: "auth_ok" }) });

    // Subscribe — the source sends a request and waits for a matching `result`.
    const callback = mock((_data: unknown) => undefined);
    const subscribePromise = client.subscribeEvents("state_changed", callback);

    // Replay the result for the subscribe message id (id 1; messageId starts at 1)
    const subscribeMessage = lastSentFrame();
    lastSocket().onmessage!({
      data: JSON.stringify({ type: "result", id: subscribeMessage.id, success: true }),
    });
    const subscriptionId = await subscribePromise;
    expect(subscriptionId).toBe(subscribeMessage.id);

    // Now deliver an event with the same id so the callback fires.
    const eventData = { entity_id: "light.test", new_state: { state: "on" } };
    lastSocket().onmessage!({
      data: JSON.stringify({
        id: subscriptionId,
        type: "event",
        event: { event_type: "state_changed", data: eventData },
      }),
    });

    expect(callback).toHaveBeenCalledWith(eventData);
  });

  test("unsubscribeEvents removes subscription on result success", async () => {
    const connectPromise = client.connect();
    lastSocket().onopen!();
    await connectPromise;
    lastSocket().onmessage!({ data: JSON.stringify({ type: "auth_ok" }) });

    const subscribePromise = client.subscribeEvents("state_changed", () => undefined);
    const subscribeMessage = lastSentFrame();
    lastSocket().onmessage!({
      data: JSON.stringify({ type: "result", id: subscribeMessage.id, success: true }),
    });
    const subscriptionId = await subscribePromise;

    const unsubPromise = client.unsubscribeEvents(subscriptionId);
    const unsubMessage = lastSentFrame();
    expect(unsubMessage).toMatchObject({ type: "unsubscribe_events", subscription: subscriptionId });

    lastSocket().onmessage!({
      data: JSON.stringify({ type: "result", id: unsubMessage.id, success: true }),
    });
    // bun-types incorrectly types `expect(promise).resolves.toBe(...)` as
    // synchronous, so awaiting it trips await-thenable. Awaiting the
    // underlying promise and asserting on its value sidesteps the bad
    // declaration without losing test fidelity.
    expect(await unsubPromise).toBe(true);
  });
});
