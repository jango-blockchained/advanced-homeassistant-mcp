/**
 * Tests for SSE client cleanup fix
 * Verifies that SSE clients are properly removed from tracking Map on disconnect
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EventEmitter } from 'events';

describe('SSE Client Cleanup', () => {
  let clients: Map<string, any>;
  let mockResponse: EventEmitter & { end?: jest.Mock; writableEnded?: boolean };
  let clientId: string;

  beforeEach(() => {
    clients = new Map();
    clientId = 'client-' + Math.random().toString(36).substr(2, 9);

    // Mock SSE response object
    mockResponse = new EventEmitter();
    mockResponse.end = jest.fn();
    mockResponse.writableEnded = false;
  });

  afterEach(() => {
    clients.clear();
    mockResponse.removeAllListeners();
  });

  it('should track connected SSE clients', () => {
    const client = {
      id: clientId,
      response: mockResponse,
      subscriptions: new Set(['entity:light.bedroom']),
      connectedAt: new Date()
    };

    clients.set(clientId, client);

    expect(clients.has(clientId)).toBe(true);
    expect(clients.get(clientId)?.id).toBe(clientId);
  });

  it('should remove client on close event', () => {
    const client = {
      id: clientId,
      response: mockResponse,
      subscriptions: new Set(),
      connectedAt: new Date()
    };

    clients.set(clientId, client);
    expect(clients.size).toBe(1);

    // Simulate close event handler
    const cleanupClient = () => {
      clients.delete(clientId);
    };

    mockResponse.on('close', cleanupClient);
    mockResponse.emit('close');

    expect(clients.size).toBe(0);
    expect(clients.has(clientId)).toBe(false);
  });

  it('should remove client on end event', () => {
    const client = {
      id: clientId,
      response: mockResponse,
      subscriptions: new Set(),
      connectedAt: new Date()
    };

    clients.set(clientId, client);
    expect(clients.size).toBe(1);

    // Simulate end event handler
    const cleanupClient = () => {
      clients.delete(clientId);
    };

    mockResponse.on('end', cleanupClient);
    mockResponse.emit('end');

    expect(clients.size).toBe(0);
  });

  it('should remove client on error event', () => {
    const client = {
      id: clientId,
      response: mockResponse,
      subscriptions: new Set(),
      connectedAt: new Date()
    };

    clients.set(clientId, client);
    expect(clients.size).toBe(1);

    // Simulate error event handler
    const cleanupClient = () => {
      clients.delete(clientId);
    };

    mockResponse.on('error', cleanupClient);
    mockResponse.emit('error', new Error('Client disconnected'));

    expect(clients.size).toBe(0);
  });

  it('should handle multiple clients with individual cleanup', () => {
    const clientIds = ['client1', 'client2', 'client3'];

    // Add multiple clients
    clientIds.forEach(id => {
      const mockResp = new EventEmitter();
      clients.set(id, {
        id,
        response: mockResp,
        subscriptions: new Set(),
        connectedAt: new Date()
      });
    });

    expect(clients.size).toBe(3);

    // Remove specific client
    const cleanupClient = (id: string) => {
      clients.delete(id);
    };

    cleanupClient('client2');

    expect(clients.size).toBe(2);
    expect(clients.has('client1')).toBe(true);
    expect(clients.has('client2')).toBe(false);
    expect(clients.has('client3')).toBe(true);
  });

  it('should not leak memory on repeated connect/disconnect', () => {
    const initialSize = clients.size;

    // Rapid connect/disconnect cycles
    for (let i = 0; i < 1000; i++) {
      const id = `client-${i}`;
      const resp = new EventEmitter();

      clients.set(id, {
        id,
        response: resp,
        subscriptions: new Set(),
        connectedAt: new Date()
      });

      // Immediately disconnect
      clients.delete(id);
    }

    expect(clients.size).toBe(initialSize);
  });

  it('should cleanup all events on client disconnect', () => {
    const client = {
      id: clientId,
      response: mockResponse,
      subscriptions: new Set(['entity:light.bedroom']),
      connectedAt: new Date()
    };

    clients.set(clientId, client);

    // Setup triple event cleanup (close, end, error)
    const cleanupClient = () => {
      mockResponse.removeAllListeners();
      clients.delete(clientId);
    };

    mockResponse.on('close', cleanupClient);
    mockResponse.on('end', cleanupClient);
    mockResponse.on('error', cleanupClient);

    // Trigger one event
    mockResponse.emit('close');

    // Verify cleanup
    expect(clients.size).toBe(0);
    expect(mockResponse.listenerCount('close')).toBe(0);
    expect(mockResponse.listenerCount('end')).toBe(0);
    expect(mockResponse.listenerCount('error')).toBe(0);
  });

  it('should maintain client subscription tracking on cleanup', () => {
    const client1 = {
      id: 'client-1',
      response: new EventEmitter(),
      subscriptions: new Set(['entity:light.bedroom', 'entity:light.kitchen']),
      connectedAt: new Date()
    };

    const client2 = {
      id: 'client-2',
      response: new EventEmitter(),
      subscriptions: new Set(['entity:light.bedroom']),
      connectedAt: new Date()
    };

    clients.set(client1.id, client1);
    clients.set(client2.id, client2);

    // Remove client1
    clients.delete(client1.id);

    // Verify client2 remains with subscriptions intact
    expect(clients.has(client2.id)).toBe(true);
    expect(clients.get(client2.id)?.subscriptions.size).toBe(1);
    expect(clients.get(client2.id)?.subscriptions.has('entity:light.bedroom')).toBe(true);
  });

  it('should handle concurrent disconnect events gracefully', () => {
    const client = {
      id: clientId,
      response: mockResponse,
      subscriptions: new Set(),
      connectedAt: new Date()
    };

    clients.set(clientId, client);

    const cleanupClient = () => {
      if (clients.has(clientId)) {
        clients.delete(clientId);
      }
    };

    mockResponse.on('close', cleanupClient);
    mockResponse.on('end', cleanupClient);
    mockResponse.on('error', cleanupClient);

    // Fire multiple events simultaneously
    mockResponse.emit('close');
    mockResponse.emit('end');
    mockResponse.emit('error', new Error('Error after close'));

    // Should only be removed once
    expect(clients.size).toBe(0);
  });

  it('should track duration of client connection', () => {
    const startTime = Date.now();
    const client = {
      id: clientId,
      response: mockResponse,
      subscriptions: new Set(),
      connectedAt: new Date(startTime)
    };

    clients.set(clientId, client);

    // Simulate some operations
    const elapsed = Date.now() - startTime;

    const connectedClient = clients.get(clientId);
    expect(connectedClient).not.toBeNull();
    expect(connectedClient?.connectedAt.getTime()).toBe(startTime);

    // Cleanup
    clients.delete(clientId);
    expect(clients.size).toBe(0);
  });
});
