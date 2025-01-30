import { HassInstance } from '../../src/hass/index.js';
import * as HomeAssistant from '../../src/types/hass.js';

// Mock the entire hass module
jest.mock('../../src/hass/index.js', () => ({
    get_hass: jest.fn()
}));

describe('Home Assistant API', () => {
    let hass: HassInstance;

    beforeEach(() => {
        hass = new HassInstance('http://localhost:8123', 'test_token');
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
            const mockWs = {
                send: jest.fn(),
                close: jest.fn(),
                addEventListener: jest.fn()
            };

            global.WebSocket = jest.fn().mockImplementation(() => mockWs);

            await hass.subscribeEvents(callback, 'state_changed');

            expect(WebSocket).toHaveBeenCalledWith(
                'ws://localhost:8123/api/websocket'
            );
        });

        it('should handle subscription errors', async () => {
            const callback = jest.fn();
            global.WebSocket = jest.fn().mockImplementation(() => {
                throw new Error('WebSocket connection failed');
            });

            await expect(
                hass.subscribeEvents(callback, 'state_changed')
            ).rejects.toThrow('WebSocket connection failed');
        });
    });
}); 