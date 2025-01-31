import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

// Define WebSocket mock types
type WebSocketCallback = (...args: any[]) => void;
type WebSocketEventHandler = (event: string, callback: WebSocketCallback) => void;
type WebSocketSendHandler = (data: string) => void;
type WebSocketCloseHandler = () => void;

type WebSocketMock = {
    on: jest.MockedFunction<WebSocketEventHandler>;
    send: jest.MockedFunction<WebSocketSendHandler>;
    close: jest.MockedFunction<WebSocketCloseHandler>;
    readyState: number;
    OPEN: number;
};

// Mock WebSocket
jest.mock('ws', () => {
    return {
        WebSocket: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            send: jest.fn(),
            close: jest.fn(),
            readyState: 1,
            OPEN: 1,
            removeAllListeners: jest.fn()
        }))
    };
});

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Home Assistant Integration', () => {
    describe('HassWebSocketClient', () => {
        let client: any;
        const mockUrl = 'ws://localhost:8123/api/websocket';
        const mockToken = 'test_token';

        beforeEach(async () => {
            const { HassWebSocketClient } = await import('../../src/hass/index.js');
            client = new HassWebSocketClient(mockUrl, mockToken);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should create a WebSocket client with the provided URL and token', () => {
            expect(client).toBeInstanceOf(EventEmitter);
            expect(WebSocket).toHaveBeenCalledWith(mockUrl);
        });

        it('should connect and authenticate successfully', async () => {
            const mockWs = (WebSocket as jest.MockedClass<typeof WebSocket>).mock.results[0].value as unknown as WebSocketMock;
            const connectPromise = client.connect();

            // Get and call the open callback
            const openCallEntry = mockWs.on.mock.calls.find(call => call[0] === 'open');
            if (!openCallEntry) throw new Error('Open callback not found');
            const openCallback = openCallEntry[1];
            openCallback();

            // Verify authentication message
            expect(mockWs.send).toHaveBeenCalledWith(
                JSON.stringify({
                    type: 'auth',
                    access_token: mockToken
                })
            );

            // Get and call the message callback
            const messageCallEntry = mockWs.on.mock.calls.find(call => call[0] === 'message');
            if (!messageCallEntry) throw new Error('Message callback not found');
            const messageCallback = messageCallEntry[1];
            messageCallback(JSON.stringify({ type: 'auth_ok' }));

            await connectPromise;
        });

        it('should handle authentication failure', async () => {
            const mockWs = (WebSocket as jest.MockedClass<typeof WebSocket>).mock.results[0].value as unknown as WebSocketMock;
            const connectPromise = client.connect();

            // Get and call the open callback
            const openCallEntry = mockWs.on.mock.calls.find(call => call[0] === 'open');
            if (!openCallEntry) throw new Error('Open callback not found');
            const openCallback = openCallEntry[1];
            openCallback();

            // Get and call the message callback with auth failure
            const messageCallEntry = mockWs.on.mock.calls.find(call => call[0] === 'message');
            if (!messageCallEntry) throw new Error('Message callback not found');
            const messageCallback = messageCallEntry[1];
            messageCallback(JSON.stringify({ type: 'auth_invalid' }));

            await expect(connectPromise).rejects.toThrow();
        });

        it('should handle connection errors', async () => {
            const mockWs = (WebSocket as jest.MockedClass<typeof WebSocket>).mock.results[0].value as unknown as WebSocketMock;
            const connectPromise = client.connect();

            // Get and call the error callback
            const errorCallEntry = mockWs.on.mock.calls.find(call => call[0] === 'error');
            if (!errorCallEntry) throw new Error('Error callback not found');
            const errorCallback = errorCallEntry[1];
            errorCallback(new Error('Connection failed'));

            await expect(connectPromise).rejects.toThrow('Connection failed');
        });

        it('should handle message parsing errors', async () => {
            const mockWs = (WebSocket as jest.MockedClass<typeof WebSocket>).mock.results[0].value as unknown as WebSocketMock;
            const connectPromise = client.connect();

            // Get and call the open callback
            const openCallEntry = mockWs.on.mock.calls.find(call => call[0] === 'open');
            if (!openCallEntry) throw new Error('Open callback not found');
            const openCallback = openCallEntry[1];
            openCallback();

            // Get and call the message callback with invalid JSON
            const messageCallEntry = mockWs.on.mock.calls.find(call => call[0] === 'message');
            if (!messageCallEntry) throw new Error('Message callback not found');
            const messageCallback = messageCallEntry[1];

            // Should emit error event
            await expect(new Promise((resolve) => {
                client.once('error', resolve);
                messageCallback('invalid json');
            })).resolves.toBeInstanceOf(Error);
        });
    });

    describe('HassInstanceImpl', () => {
        let instance: any;
        const mockBaseUrl = 'http://localhost:8123';
        const mockToken = 'test_token';

        beforeEach(async () => {
            const { HassInstanceImpl } = await import('../../src/hass/index.js');
            instance = new HassInstanceImpl(mockBaseUrl, mockToken);
            mockFetch.mockClear();
        });

        it('should create an instance with the provided URL and token', () => {
            expect(instance.baseUrl).toBe(mockBaseUrl);
            expect(instance.token).toBe(mockToken);
        });

        it('should fetch states successfully', async () => {
            const mockStates = [
                {
                    entity_id: 'light.living_room',
                    state: 'on',
                    attributes: {}
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStates
            } as Response);

            const states = await instance.fetchStates();
            expect(states).toEqual(mockStates);
            expect(mockFetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/api/states`,
                expect.objectContaining({
                    headers: {
                        Authorization: `Bearer ${mockToken}`,
                        'Content-Type': 'application/json'
                    }
                })
            );
        });

        it('should fetch single entity state successfully', async () => {
            const mockState = {
                entity_id: 'light.living_room',
                state: 'on',
                attributes: {}
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockState
            } as Response);

            const state = await instance.fetchState('light.living_room');
            expect(state).toEqual(mockState);
            expect(mockFetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/api/states/light.living_room`,
                expect.objectContaining({
                    headers: {
                        Authorization: `Bearer ${mockToken}`,
                        'Content-Type': 'application/json'
                    }
                })
            );
        });

        it('should call service successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            await instance.callService('light', 'turn_on', { entity_id: 'light.living_room' });
            expect(mockFetch).toHaveBeenCalledWith(
                `${mockBaseUrl}/api/services/light/turn_on`,
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${mockToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ entity_id: 'light.living_room' })
                })
            );
        });
    });

    describe('get_hass', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
            process.env.HASS_HOST = 'http://localhost:8123';
            process.env.HASS_TOKEN = 'test_token';
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should return a development instance by default', async () => {
            const { get_hass } = await import('../../src/hass/index.js');
            const instance = await get_hass();
            expect(instance.baseUrl).toBe('http://localhost:8123');
            expect(instance.token).toBe('test_token');
        });

        it('should return a test instance when specified', async () => {
            const { get_hass } = await import('../../src/hass/index.js');
            const instance = await get_hass('test');
            expect(instance.baseUrl).toBe('http://localhost:8123');
            expect(instance.token).toBe('test_token');
        });

        it('should return a production instance when specified', async () => {
            process.env.HASS_HOST = 'https://hass.example.com';
            process.env.HASS_TOKEN = 'prod_token';

            const { get_hass } = await import('../../src/hass/index.js');
            const instance = await get_hass('production');
            expect(instance.baseUrl).toBe('https://hass.example.com');
            expect(instance.token).toBe('prod_token');
        });
    });
}); 