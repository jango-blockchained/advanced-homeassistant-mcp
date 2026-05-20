/**
 * Tests for HomeAssistantWebSocketClient subscription lifecycle.
 *
 * Verifies the subscribe/unsubscribe path in src/hass/websocket-client.ts:
 * the subscription map gains an entry on successful subscribe, and loses it
 * after the unsubscribe callback runs (and the corresponding result arrives).
 */

import { describe, expect, test, beforeEach, mock } from "bun:test";
import { EventEmitter } from "events";

class FakeSocket extends EventEmitter {
  send = mock((_: string) => undefined);
  close = mock(() => undefined);
  readyState = 1;

  // Convenience: deliver a frame as if it came from the server.
  deliver(message: object): void {
    this.emit("message", Buffer.from(JSON.stringify(message)));
  }
}

// Track every constructed socket; tests use the most recent one. Pushing
// `this` into a module-scope array keeps eslint's no-this-alias rule happy
// (vs. the more obvious `lastSocket = this` capture pattern).
const sockets: FakeSocket[] = [];
class TrackedSocket extends FakeSocket {
  constructor(_url: string) {
    super();
    sockets.push(this);
  }
}
const lastSocket = (): FakeSocket => {
  const s = sockets.at(-1);
  if (!s) throw new Error("no socket constructed yet");
  return s;
};

// `void` rather than `await` — the factory is sync so the actual return is
// void, but the union return type would otherwise trip the floating-promise
// lint. Bun hoists mock.module to before static imports.
void mock.module("ws", () => ({
  default: TrackedSocket,
  WebSocket: TrackedSocket,
}));

import { HomeAssistantWebSocketClient } from "../../src/hass/websocket-client";

interface SubscriptionsBag {
  subscriptions: Map<number, (data: unknown) => void>;
  pendingRequests: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>;
}

interface ServerFrame {
  id: number;
  type?: string;
  event_type?: string;
}

// Read the most recent JSON frame the source sent over the socket.
const lastSentFrame = (): ServerFrame => {
  const lastArgs = lastSocket().send.mock.calls.at(-1);
  if (!lastArgs) throw new Error("no send call recorded");
  return JSON.parse(lastArgs[0]) as ServerFrame;
};

async function connectClient(): Promise<{
  client: InstanceType<typeof HomeAssistantWebSocketClient>;
  socket: FakeSocket;
  bag: SubscriptionsBag;
}> {
  const client = new HomeAssistantWebSocketClient("ws://localhost:8123/api/websocket", "tok");
  const connectPromise = client.connect();
  // Source flow: connect() opens the socket, then authenticate() registers a
  // one-shot message handler and sends the auth frame. We replay auth_ok.
  // The socket is created synchronously in `new WebSocket(url)`.
  // The "open" event triggers authenticate().
  lastSocket().emit("open");
  // authenticate() synchronously calls socket.send and registers a listener.
  lastSocket().deliver({ type: "auth_ok" });
  await connectPromise;
  // The class-internal Maps are private; cast for direct inspection in tests.
  const bag = client as unknown as SubscriptionsBag;
  return { client, socket: lastSocket(), bag };
}

describe("HomeAssistantWebSocketClient subscription cleanup", () => {
  beforeEach(() => {
    sockets.length = 0;
  });

  test("subscribe records the subscription in the internal map", async () => {
    const { client, socket, bag } = await connectClient();
    const callback = mock((_: unknown) => undefined);

    const unsubscribe = client.subscribe(callback);
    // The subscribe() call sends `{type:"subscribe_events", event_type:"state_changed"}`
    // and resolves on a result frame containing { id }.
    const subscribeFrame = lastSentFrame();
    expect(subscribeFrame).toMatchObject({ type: "subscribe_events", event_type: "state_changed" });
    socket.deliver({ id: subscribeFrame.id, success: true, result: { id: 42 } });

    // Yield so the .then() in subscribe() runs and registers the subscription.
    await new Promise((r) => setImmediate(r));
    expect(bag.subscriptions.has(42)).toBe(true);

    // Sanity: an event for that subscription id reaches the callback.
    socket.deliver({ id: 42, type: "event", event: { entity_id: "light.x" } });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ entity_id: "light.x" });

    unsubscribe();
    const unsubscribeFrame = lastSentFrame();
    socket.deliver({ id: unsubscribeFrame.id, success: true });
    await new Promise((r) => setImmediate(r));
    expect(bag.subscriptions.has(42)).toBe(false);
  });

  test("unsubscribe still cleans up the map even if the server reports failure", async () => {
    const { client, socket, bag } = await connectClient();
    const unsubscribe = client.subscribe(() => undefined);
    const subscribeFrame = lastSentFrame();
    socket.deliver({ id: subscribeFrame.id, success: true, result: { id: 7 } });
    await new Promise((r) => setImmediate(r));
    expect(bag.subscriptions.has(7)).toBe(true);

    unsubscribe();
    const unsubscribeFrame = lastSentFrame();
    // Server returns failure — the source's catch branch must still delete locally.
    socket.deliver({
      id: unsubscribeFrame.id,
      success: false,
      error: { message: "no such subscription" },
    });
    await new Promise((r) => setImmediate(r));
    expect(bag.subscriptions.has(7)).toBe(false);
  });

  test("rapid subscribe/unsubscribe cycles do not leak entries", async () => {
    const { client, socket, bag } = await connectClient();

    for (let i = 0; i < 50; i++) {
      const unsubscribe = client.subscribe(() => undefined);
      const subFrame = lastSentFrame();
      socket.deliver({ id: subFrame.id, success: true, result: { id: 1000 + i } });
      await new Promise((r) => setImmediate(r));

      unsubscribe();
      const unsubFrame = lastSentFrame();
      socket.deliver({ id: unsubFrame.id, success: true });
      await new Promise((r) => setImmediate(r));
    }

    expect(bag.subscriptions.size).toBe(0);
  });

  test("disconnect rejects all pending requests", async () => {
    const { client, bag } = await connectClient();

    // Issue a request that the server never answers.
    const pending = client.send({ type: "ping" });
    expect(bag.pendingRequests.size).toBe(1);

    await client.disconnect();
    // bun-types incorrectly types `expect(promise).rejects.toThrow(...)` as
    // synchronous; awaiting it trips await-thenable. Verify the rejection
    // shape directly via .catch instead.
    let caught: Error | undefined;
    await pending.catch((err: unknown) => {
      caught = err as Error;
    });
    expect(caught?.message).toBe("Connection closed");
    expect(bag.pendingRequests.size).toBe(0);
  });
});
