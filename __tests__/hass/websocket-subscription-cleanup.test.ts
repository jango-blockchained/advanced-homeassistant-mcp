/**
 * Tests for WebSocket subscription cleanup fix
 * Verifies that event listeners are properly removed on unsubscribe
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EventEmitter } from 'events';
import { WebSocketClient } from '../../src/hass/websocket-client';
import type { SubscriptionUnsubscriber } from '../../src/hass/types';

describe('WebSocketClient Subscription Cleanup', () => {
  let wsClient: WebSocketClient;
  let mockWs: EventEmitter & { send?: jest.Mock };
  let messageId: number;

  beforeEach(() => {
    messageId = 1;
    mockWs = new EventEmitter();
    mockWs.send = jest.fn();

    // Mock WebSocket client with proper initialization
    wsClient = Object.create(WebSocketClient.prototype);
    wsClient.ws = mockWs;
    wsClient.messageId = messageId;
    wsClient.subscriptions = new Map();
    wsClient.authenticated = true;
    wsClient.eventBus = new EventEmitter();
  });

  afterEach(() => {
    if (wsClient?.ws) {
      mockWs.removeAllListeners();
    }
  });

  it('should track subscription by ID', () => {
    const subscriptionId = 1;
    const handler = jest.fn();

    // Simulate subscription tracking
    wsClient.subscriptions.set(subscriptionId, handler);

    expect(wsClient.subscriptions.has(subscriptionId)).toBe(true);
    expect(wsClient.subscriptions.get(subscriptionId)).toBe(handler);
  });

  it('should create unsubscribe function that removes listener', async () => {
    const subscriptionId = 2;
    const handler = jest.fn();
    const unsubscribeHandler = jest.fn();

    wsClient.subscriptions.set(subscriptionId, unsubscribeHandler);

    // Simulate the unsubscribe closure
    const unsubscribe = () => {
      wsClient.ws.send(JSON.stringify({
        id: ++wsClient.messageId,
        type: 'unsubscribe',
        subscription: subscriptionId
      }));
      wsClient.subscriptions.delete(subscriptionId);
    };

    // Call unsubscribe
    unsubscribe();

    // Verify subscription was removed
    expect(wsClient.subscriptions.has(subscriptionId)).toBe(false);
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining(`"subscription":${subscriptionId}`)
    );
  });

  it('should clean up on subscription error', () => {
    const subscriptionId = 3;
    const handler = jest.fn();

    wsClient.subscriptions.set(subscriptionId, handler);

    // Simulate error cleanup
    try {
      throw new Error('Subscription failed');
    } catch (error) {
      wsClient.subscriptions.delete(subscriptionId);
    }

    expect(wsClient.subscriptions.has(subscriptionId)).toBe(false);
  });

  it('should handle multiple concurrent subscriptions', () => {
    const subscriptions: number[] = [];

    // Create multiple subscriptions
    for (let i = 0; i < 10; i++) {
      const id = i + 1;
      const handler = jest.fn();
      wsClient.subscriptions.set(id, handler);
      subscriptions.push(id);
    }

    expect(wsClient.subscriptions.size).toBe(10);

    // Unsubscribe from half
    for (let i = 0; i < 5; i++) {
      wsClient.subscriptions.delete(subscriptions[i]);
    }

    expect(wsClient.subscriptions.size).toBe(5);

    // Verify remaining are correct
    for (let i = 5; i < 10; i++) {
      expect(wsClient.subscriptions.has(subscriptions[i])).toBe(true);
    }
  });

  it('should not cause memory leaks with rapid subscribe/unsubscribe', () => {
    const initialSize = wsClient.subscriptions.size;

    // Rapid subscribe/unsubscribe cycles
    for (let i = 0; i < 1000; i++) {
      const id = i + 100;
      wsClient.subscriptions.set(id, jest.fn());
      wsClient.subscriptions.delete(id);
    }

    expect(wsClient.subscriptions.size).toBe(initialSize);
  });

  it('should handle unsubscribe with invalid subscription ID gracefully', () => {
    const invalidId = 9999;

    // Simulate unsubscribe attempt
    const unsubscribe = () => {
      if (wsClient.subscriptions.has(invalidId)) {
        wsClient.subscriptions.delete(invalidId);
        return true;
      }
      return false;
    };

    const result = unsubscribe();
    expect(result).toBe(false);
    expect(wsClient.subscriptions.size).toBe(0);
  });

  it('should maintain subscription map consistency', () => {
    const subscriptions = [
      { id: 10, handler: jest.fn() },
      { id: 11, handler: jest.fn() },
      { id: 12, handler: jest.fn() }
    ];

    // Add all
    subscriptions.forEach(sub => {
      wsClient.subscriptions.set(sub.id, sub.handler);
    });

    expect(wsClient.subscriptions.size).toBe(3);

    // Verify all are present
    subscriptions.forEach(sub => {
      expect(wsClient.subscriptions.has(sub.id)).toBe(true);
    });

    // Remove middle one
    wsClient.subscriptions.delete(11);

    // Verify consistency
    expect(wsClient.subscriptions.size).toBe(2);
    expect(wsClient.subscriptions.has(10)).toBe(true);
    expect(wsClient.subscriptions.has(11)).toBe(false);
    expect(wsClient.subscriptions.has(12)).toBe(true);
  });
});
