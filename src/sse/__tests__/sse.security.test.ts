import { SSEManager } from "../index";
import { TokenManager } from "../../security/index";
import type { SSEClient } from "../types";
import { describe, it, expect, beforeEach, afterEach, mock, Mock } from "bun:test";

describe("SSE Security Features", () => {
  const TEST_IP = "127.0.0.1";
  const validToken = "valid_token";
  let sseManager: SSEManager;
  let validateTokenMock: Mock<(token: string, ip: string) => { valid: boolean; error?: string }>;
  // Capture the real implementation so afterEach can put it back. Without
  // this, the assignment to TokenManager.validateToken below leaks into
  // other test files in the same bun process and breaks security tests.
  // Bind to TokenManager so the static method's `this`-using callees
  // (recordFailedAttempt, isRateLimited) resolve correctly post-restore.
  const originalValidateToken = TokenManager.validateToken.bind(TokenManager);

  beforeEach(() => {
    sseManager = new SSEManager({
      maxClients: 2,
      rateLimit: {
        MAX_MESSAGES: 2,
        WINDOW_MS: 1000,
        // BURST_LIMIT is OR'd with MAX_MESSAGES inside isRateLimited, so a
        // BURST_LIMIT of 1 would dominate and we'd see only one send go
        // through. Set it above MAX_MESSAGES so the test exercises the
        // window cap, which is what these tests are about.
        BURST_LIMIT: 10,
      },
    });

    validateTokenMock = mock((token: string) => ({
      valid: token === validToken,
      error: token !== validToken ? "Invalid token" : undefined,
    }));
    TokenManager.validateToken = validateTokenMock;
  });

  afterEach(() => {
    TokenManager.validateToken = originalValidateToken;
  });

  function createTestClient(
    id: string,
  ): Omit<SSEClient, "authenticated" | "subscriptions" | "rateLimit"> {
    return {
      id,
      ip: TEST_IP,
      connectedAt: new Date(),
      connectionTime: Date.now(),
      send: mock((data: string) => {}),
    };
  }

  describe("Client Authentication", () => {
    it("should authenticate valid clients", () => {
      const client = createTestClient("test-client-1");
      const result = sseManager.addClient(client, validToken);

      expect(result).toBeTruthy();
      expect(validateTokenMock).toHaveBeenCalledWith(validToken, TEST_IP);
      expect(result?.authenticated).toBe(true);
    });

    it("should reject invalid tokens", () => {
      const client = createTestClient("test-client-2");
      const result = sseManager.addClient(client, "invalid_token");

      expect(result).toBeNull();
      expect(validateTokenMock).toHaveBeenCalledWith("invalid_token", TEST_IP);
    });

    it("should enforce maximum client limit", () => {
      // Add max number of clients
      const client1 = createTestClient("test-client-0");
      const client2 = createTestClient("test-client-1");
      const client3 = createTestClient("test-client-2");

      expect(sseManager.addClient(client1, validToken)).toBeTruthy();
      expect(sseManager.addClient(client2, validToken)).toBeTruthy();
      expect(sseManager.addClient(client3, validToken)).toBeNull();
    });
  });

  describe("Client Management", () => {
    it("should track client connections", () => {
      const client = createTestClient("test-client");
      sseManager.addClient(client, validToken);

      const stats = sseManager.getStatistics();
      expect(stats.totalClients).toBe(1);
      expect(stats.authenticatedClients).toBe(1);
    });

    it("should remove disconnected clients", () => {
      const client = createTestClient("test-client");
      sseManager.addClient(client, validToken);
      sseManager.removeClient("test-client");

      const stats = sseManager.getStatistics();
      expect(stats.totalClients).toBe(0);
    });

    it("should cleanup inactive clients", async () => {
      // Stand up a fresh manager with a fast cleanup interval. We need the
      // ping interval to STAY large — pings touch lastPingAt and would
      // perpetually rescue the client from the cleanup sweep otherwise.
      const fastManager = new SSEManager({
        maxClients: 2,
        pingInterval: 60_000,
        cleanupInterval: 100,
        rateLimit: { MAX_MESSAGES: 100, WINDOW_MS: 1000, BURST_LIMIT: 100 },
      });

      const client = createTestClient("test-client");
      const added = fastManager.addClient(client, validToken)!;
      // Make the client look stale: lastPingAt older than 2 * pingInterval.
      added.lastPingAt = new Date(Date.now() - 10 * 60_000);

      await new Promise((resolve) => setTimeout(resolve, 250));

      const stats = fastManager.getStatistics();
      expect(stats.totalClients).toBe(0);
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits for message sending", () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      // Send messages up to the limit
      sseManager["sendToClient"](sseClient!, {
        type: "test",
        data: { value: "first" },
      });
      sseManager["sendToClient"](sseClient!, {
        type: "test",
        data: { value: "second" },
      });

      // Next message should be rate limited
      sseManager["sendToClient"](sseClient!, {
        type: "test",
        data: { value: "overflow" },
      });

      const sendMock = client.send as Mock<(data: string) => void>;
      expect(sendMock.mock.calls.length).toBe(2);
    });

    it("should reset rate limits after window expires", async () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      // Send messages up to the limit
      sseManager["sendToClient"](sseClient!, {
        type: "test",
        data: { value: "first" },
      });
      sseManager["sendToClient"](sseClient!, {
        type: "test",
        data: { value: "second" },
      });

      // Wait for rate limit window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be able to send messages again
      sseManager["sendToClient"](sseClient!, {
        type: "test",
        data: { value: "new message" },
      });

      const sendMock = client.send as Mock<(data: string) => void>;
      expect(sendMock.mock.calls.length).toBe(3);
    });
  });

  describe("Event Broadcasting", () => {
    it("should only send events to authenticated clients", () => {
      const client1 = createTestClient("client1");
      const client2 = createTestClient("client2");

      const sseClient1 = sseManager.addClient(client1, validToken);
      const sseClient2 = sseManager.addClient(client2, "invalid_token");

      expect(sseClient1).toBeTruthy();
      expect(sseClient2).toBeNull();

      sseClient1!.subscriptions.add("event:test_event");

      const event = {
        event_type: "test_event",
        data: { value: "test" },
        origin: "test",
        time_fired: new Date().toISOString(),
        context: { id: "test" },
      };

      sseManager.broadcastEvent(event);

      const client1SendMock = client1.send as Mock<(data: string) => void>;
      const client2SendMock = client2.send as Mock<(data: string) => void>;

      expect(client1SendMock.mock.calls.length).toBe(1);
      expect(client2SendMock.mock.calls.length).toBe(0);
    });

    it("should respect subscription filters", () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      sseClient!.subscriptions.add("event:test_event");

      // Send matching event
      sseManager.broadcastEvent({
        event_type: "test_event",
        data: { value: "test" },
        origin: "test",
        time_fired: new Date().toISOString(),
        context: { id: "test" },
      });

      // Send non-matching event
      sseManager.broadcastEvent({
        event_type: "other_event",
        data: { value: "test" },
        origin: "test",
        time_fired: new Date().toISOString(),
        context: { id: "test" },
      });

      const sendMock = client.send as Mock<(data: string) => void>;
      expect(sendMock.mock.calls.length).toBe(1);
    });
  });
});
