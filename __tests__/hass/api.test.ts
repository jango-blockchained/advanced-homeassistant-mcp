import { HassInstanceImpl } from '../../src/hass/index.js';
import * as HomeAssistant from '../../src/types/hass.js';
import { HassWebSocketClient } from '../../src/websocket/client.js';

// Add DOM types for WebSocket and events
type CloseEvent = {
    code: number;
    reason: string;
    wasClean: boolean;
};

type MessageEvent = {
    data: any;
    type: string;
    lastEventId: string;
};

type Event = {
    type: string;
};

interface WebSocketLike {
    send(data: string): void;
    close(): void;
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
    dispatchEvent(event: Event): boolean;
    onopen: ((event: Event) => void) | null;
    onclose: ((event: CloseEvent) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    url: string;
    readyState: number;
    bufferedAmount: number;
    extensions: string;
    protocol: string;
    binaryType: string;
}

interface MockWebSocketInstance extends WebSocketLike {
    send: jest.Mock;
    close: jest.Mock;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    dispatchEvent: jest.Mock;
}

interface MockWebSocketConstructor extends jest.Mock<MockWebSocketInstance> {
    CONNECTING: 0;
    OPEN: 1;
    CLOSING: 2;
    CLOSED: 3;
    prototype: WebSocketLike;
}

// Mock the entire hass module
jest.mock('../../src/hass/index.js', () => ({
    get_hass: jest.fn()
}));

describe('Home Assistant API', () => {
    let hass: HassInstanceImpl;
    let mockWs: MockWebSocketInstance;
    let MockWebSocket: MockWebSocketConstructor;

    beforeEach(() => {
        hass = new HassInstanceImpl('http://localhost:8123', 'test_token');
        mockWs = {
            send: jest.fn(),
            close: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
            onopen: null,
            onclose: null,
            onmessage: null,
            onerror: null,
            url: '',
            readyState: 1,
            bufferedAmount: 0,
            extensions: '',
            protocol: '',
            binaryType: 'blob'
        } as MockWebSocketInstance;

        // Create a mock WebSocket constructor
        MockWebSocket = jest.fn().mockImplementation(() => mockWs) as MockWebSocketConstructor;
        MockWebSocket.CONNECTING = 0;
        MockWebSocket.OPEN = 1;
        MockWebSocket.CLOSING = 2;
        MockWebSocket.CLOSED = 3;
        MockWebSocket.prototype = {} as WebSocketLike;

        // Mock WebSocket globally
        (global as any).WebSocket = MockWebSocket;
    });

    describe('State Management', () => {
        it('should fetch all states', async () => {
            const mockStates: HomeAssistant.Entity[] = [
                {
                    entity_id: 'light.living_room',
                    state: 'on',
                    attributes: { brightness: 255 },
                    last_changed: '2024-01-01T00:00:00Z',
                    last_updated: '2024-01-01T00:00:00Z',
                    context: { id: '123', parent_id: null, user_id: null }
                }
            ];

            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStates)
            });

            const states = await hass.fetchStates();
            expect(states).toEqual(mockStates);
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/states',
                expect.any(Object)
            );
        });

        it('should fetch single state', async () => {
            const mockState: HomeAssistant.Entity = {
                entity_id: 'light.living_room',
                state: 'on',
                attributes: { brightness: 255 },
                last_changed: '2024-01-01T00:00:00Z',
                last_updated: '2024-01-01T00:00:00Z',
                context: { id: '123', parent_id: null, user_id: null }
            };

            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockState)
            });

            const state = await hass.fetchState('light.living_room');
            expect(state).toEqual(mockState);
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/states/light.living_room',
                expect.any(Object)
            );
        });

        it('should handle state fetch errors', async () => {
            global.fetch = jest.fn().mockRejectedValueOnce(new Error('Failed to fetch states'));

            await expect(hass.fetchStates()).rejects.toThrow('Failed to fetch states');
        });
    });

    describe('Service Calls', () => {
        it('should call service', async () => {
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });

            await hass.callService('light', 'turn_on', {
                entity_id: 'light.living_room',
                brightness: 255
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/light/turn_on',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        entity_id: 'light.living_room',
                        brightness: 255
                    })
                })
            );
        });

        it('should handle service call errors', async () => {
            global.fetch = jest.fn().mockRejectedValueOnce(new Error('Service call failed'));

            await expect(
                hass.callService('invalid_domain', 'invalid_service', {})
            ).rejects.toThrow('Service call failed');
        });
    });

    describe('Event Subscription', () => {
        it('should subscribe to events', async () => {
            const callback = jest.fn();
            await hass.subscribeEvents(callback, 'state_changed');

            expect(MockWebSocket).toHaveBeenCalledWith(
                'ws://localhost:8123/api/websocket'
            );
        });

        it('should handle subscription errors', async () => {
            const callback = jest.fn();
            MockWebSocket.mockImplementation(() => {
                throw new Error('WebSocket connection failed');
            });

            await expect(
                hass.subscribeEvents(callback, 'state_changed')
            ).rejects.toThrow('WebSocket connection failed');
        });
    });

    describe('WebSocket connection', () => {
        it('should connect to WebSocket endpoint', async () => {
            await hass.subscribeEvents(() => { });
            expect(MockWebSocket).toHaveBeenCalledWith(
                'ws://localhost:8123/api/websocket'
            );
        });

        it('should handle connection errors', async () => {
            MockWebSocket.mockImplementation(() => {
                throw new Error('Connection failed');
            });

            await expect(hass.subscribeEvents(() => { })).rejects.toThrow(
                'Connection failed'
            );
        });
    });
}); 