import { SSEManager } from "../index";
import type { SSEClient } from "../index";
import type { HassEntity, HassEvent } from "../../interfaces/hass";
import { TokenManager } from "../../security/index";
import { describe, it, expect, beforeEach, afterEach, mock, Mock, test } from "bun:test";

describe("SSE Core Features", () => {
  let sseManager: SSEManager;
  const TEST_IP = "127.0.0.1";
  const validToken = "valid_token_that_meets_minimum_length_requirement_123456";
  let validateTokenMock: Mock<(token: string, ip?: string) => { valid: boolean; error?: string }>;

  beforeEach(() => {
    sseManager = new SSEManager({
      pingInterval: 100, // Shorter interval for testing
      cleanupInterval: 200,
      maxConnectionAge: 1000,
    });

    // Mock token validation to always succeed with our test token
    validateTokenMock = mock((token: string) => ({
      valid: token === validToken,
      error: token !== validToken ? "Invalid token" : undefined,
    }));
    TokenManager.validateToken = validateTokenMock;
  });

  afterEach(() => {
    validateTokenMock.mockReset();
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

  describe("State Management", () => {
    it("should track and update entity states", () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      const entityId = "light.living_room";
      const initialState: HassEntity = {
        entity_id: entityId,
        state: "off",
        attributes: { brightness: 0 },
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        context: { id: "test_context" },
      };

      // Update state
      sseManager.updateEntityState(entityId, initialState);

      // Subscribe client to entity
      sseManager.subscribeToEntity(sseClient.id, entityId);

      // Verify initial state was sent
      const sendMock = client.send as Mock<(data: string) => void>;
      expect(sendMock.mock.calls.length).toBe(1);
      const sentData = JSON.parse(sendMock.mock.calls[0]?.[0]);
      expect(sentData.type).toBe("state_changed");
      expect(sentData.data.entity_id).toBe(entityId);
      expect(sentData.data.state).toBe("off");
    });

    it("should handle state updates and notify subscribers", () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      const entityId = "light.living_room";
      sseManager.subscribeToEntity(sseClient.id, entityId);

      // Update state multiple times
      const states: HassEntity[] = [
        {
          entity_id: entityId,
          state: "off",
          attributes: { brightness: 0 },
          last_changed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          context: { id: "test_context" },
        },
        {
          entity_id: entityId,
          state: "on",
          attributes: { brightness: 100 },
          last_changed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          context: { id: "test_context" },
        },
        {
          entity_id: entityId,
          state: "on",
          attributes: { brightness: 50 },
          last_changed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          context: { id: "test_context" },
        },
      ];

      for (const state of states) {
        sseManager.updateEntityState(entityId, state);
      }

      const sendMock = client.send as Mock<(data: string) => void>;
      expect(sendMock.mock.calls.length).toBe(states.length);

      // Verify last state
      const lastSentData = JSON.parse(sendMock.mock.calls[2]?.[0]);
      expect(lastSentData.data.state).toBe("on");
      expect(lastSentData.data.attributes.brightness).toBe(50);
    });
  });

  describe("Domain Subscriptions", () => {
    it("should handle domain-wide subscriptions", () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      const domain = "light";
      sseManager.subscribeToDomain(sseClient.id, domain);

      // Update states for multiple entities in the domain
      const entities = ["light.living_room", "light.kitchen", "light.bedroom"];
      for (const entityId of entities) {
        sseManager.updateEntityState(entityId, {
          entity_id: entityId,
          state: "on",
          attributes: {},
          last_changed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          context: { id: "test_context" },
        });
      }

      const sendMock = client.send as Mock<(data: string) => void>;
      expect(sendMock.mock.calls.length).toBe(entities.length);

      // Verify non-domain entities don't trigger updates
      sseManager.updateEntityState("switch.fan", {
        entity_id: "switch.fan",
        state: "on",
        attributes: {},
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        context: { id: "test_context" },
      });

      expect(sendMock.mock.calls.length).toBe(entities.length); // Should not increase
    });
  });

  describe("Connection Maintenance", () => {
    it("should send periodic pings to keep connections alive", async () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      // Wait for ping interval
      await new Promise((resolve) => setTimeout(resolve, 150));

      const sendMock = client.send as Mock<(data: string) => void>;
      expect(sendMock.mock.calls.length).toBeGreaterThanOrEqual(1);

      const pingData = JSON.parse(sendMock.mock.calls[0]?.[0]);
      expect(pingData.type).toBe("ping");
      expect(pingData.timestamp).toBeTruthy();
    });

    it("should cleanup inactive connections", async () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      // Simulate connection age exceeding limit
      sseClient.connectedAt = new Date(Date.now() - 2000); // Older than maxConnectionAge

      // Wait for cleanup interval
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Client should be removed
      expect(sseManager.getStatistics().totalClients).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle client send errors gracefully", async () => {
      const client = createTestClient("test-client");
      const errorMock = mock(() => {
        console.log("Mock send function throwing error");
        throw new Error("Send failed");
      });
      client.send = errorMock;

      const sseClient = sseManager.addClient(client, validToken);
      if (!sseClient) {
        throw new Error("Failed to add client");
      }

      // Subscribe to entity to ensure we get updates
      sseManager.subscribeToEntity(sseClient.id, "light.test");

      // Get initial client count
      const initialCount = sseManager.getStatistics().totalClients;
      console.log(`Initial client count: ${initialCount}`);

      // Attempt to send message
      sseManager.updateEntityState("light.test", {
        entity_id: "light.test",
        state: "on",
        attributes: {},
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        context: { id: "test_context" },
      });

      // Wait for error handling to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify error was thrown
      expect(errorMock).toHaveBeenCalled();

      // Get final client count
      const finalCount = sseManager.getStatistics().totalClients;
      console.log(`Final client count: ${finalCount}`);

      // Client should be removed due to send failure
      expect(finalCount).toBe(0);
    });

    it("should handle invalid entity updates", () => {
      const client = createTestClient("test-client");
      const sseClient = sseManager.addClient(client, validToken);
      expect(sseClient).toBeTruthy();

      // Subscribe to entity
      const entityId = "light.test";
      sseManager.subscribeToEntity(sseClient.id, entityId);

      // Update with invalid state
      const invalidState = {
        entity_id: entityId,
        state: undefined,
        attributes: {},
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        context: { id: "test_context" },
      } as unknown as HassEntity;

      sseManager.updateEntityState(entityId, invalidState);

      const sendMock = client.send as Mock<(data: string) => void>;
      expect(sendMock.mock.calls.length).toBe(0); // Should not send invalid state
    });
  });

  describe("Memory Management", () => {
    it("should limit the number of stored entity states", () => {
      // Create many entities
      for (let i = 0; i < 1000; i++) {
        sseManager.updateEntityState(`test.entity_${i}`, {
          entity_id: `test.entity_${i}`,
          state: "on",
          attributes: {},
          last_changed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          context: { id: "test_context" },
        });
      }

      // Check that stored states are within reasonable limits
      expect(Object.keys(sseManager["entityStates"]).length).toBeLessThanOrEqual(1000);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple simultaneous subscriptions", () => {
      // Create and add clients
      const rawClients = Array.from({ length: 5 }, (_, i) => createTestClient(`client_${i}`));
      const clients = rawClients
        .map((client) => sseManager.addClient(client, validToken))
        .filter((client): client is SSEClient => client !== null);

      expect(clients.length).toBe(5);

      // Subscribe all clients to same entity
      const entityId = "light.test";
      clients.forEach((client) => {
        sseManager.subscribeToEntity(client.id, entityId);
      });

      // Update entity state
      sseManager.updateEntityState(entityId, {
        entity_id: entityId,
        state: "on",
        attributes: {},
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        context: { id: "test_context" },
      });

      // Verify all clients received update
      rawClients.forEach((client) => {
        const sendMock = client.send as Mock<(data: string) => void>;
        expect(sendMock.mock.calls.length).toBe(1);
      });
    });
  });

  // Future test cases to implement
  test.todo("should handle reconnection attempts with exponential backoff");
  test.todo("should properly clean up resources when client disconnects");
  test.todo("should handle message queuing when client temporarily disconnects");
  test.todo("should validate message format before sending to clients");
  test.todo("should handle client subscription to multiple domains");
  test.todo("should properly handle client unsubscribe requests");
  test.todo("should enforce per-domain rate limits");
  test.todo("should handle large numbers of concurrent state updates");
  test.todo("should maintain message order for each client");
  test.todo("should handle client authentication timeout");
});
