import { get_hass, HassInstance } from '../../src/hass/index.js';
import { Response } from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch', () => {
    return jest.fn();
});

// Get the mocked fetch function
const mockedFetch = jest.requireMock('node-fetch') as jest.MockedFunction<typeof fetch>;

interface MockHassInstance extends HassInstance {
    getStates: () => Promise<any[]>;
    getState: (entityId: string) => Promise<any>;
    callService: (domain: string, service: string, data: any) => Promise<void>;
    subscribeEvents: (callback: (event: any) => void, eventType: string) => Promise<void>;
}

describe('Home Assistant API Integration', () => {
    const MOCK_HASS_HOST = 'http://localhost:8123';
    const MOCK_HASS_TOKEN = 'mock_token_12345';

    beforeEach(() => {
        process.env.HASS_HOST = MOCK_HASS_HOST;
        process.env.HASS_TOKEN = MOCK_HASS_TOKEN;
        jest.clearAllMocks();
    });

    describe('API Connection', () => {
        it('should initialize connection with valid credentials', async () => {
            mockedFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ version: '2024.1.0' })
            } as any);

            const hass = await get_hass();
            expect(hass).toBeDefined();
            expect(mockedFetch).toHaveBeenCalledWith(
                `${MOCK_HASS_HOST}/api/`,
                expect.objectContaining({
                    headers: {
                        Authorization: `Bearer ${MOCK_HASS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                })
            );
        });

        it('should handle connection errors', async () => {
            mockedFetch.mockRejectedValueOnce(new Error('Connection failed'));
            await expect(get_hass()).rejects.toThrow('Connection failed');
        });

        it('should handle invalid credentials', async () => {
            mockedFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            } as any);

            await expect(get_hass()).rejects.toThrow('Unauthorized');
        });

        it('should handle missing environment variables', async () => {
            delete process.env.HASS_HOST;
            delete process.env.HASS_TOKEN;
            await expect(get_hass()).rejects.toThrow('Missing required environment variables');
        });
    });

    describe('State Management', () => {
        const mockStates = [
            {
                entity_id: 'light.living_room',
                state: 'on',
                attributes: {
                    brightness: 255,
                    friendly_name: 'Living Room Light'
                }
            },
            {
                entity_id: 'switch.kitchen',
                state: 'off',
                attributes: {
                    friendly_name: 'Kitchen Switch'
                }
            }
        ];

        it('should fetch states successfully', async () => {
            mockedFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ version: '2024.1.0' })
                } as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockStates)
                } as any);

            const hass = await get_hass();
            const states = await hass.getStates();

            expect(states).toEqual(mockStates);
            expect(mockedFetch).toHaveBeenCalledWith(
                `${MOCK_HASS_HOST}/api/states`,
                expect.any(Object)
            );
        });

        it('should get single entity state', async () => {
            const mockState = mockStates[0];
            mockedFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ version: '2024.1.0' })
                } as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockState)
                } as any);

            const hass = await get_hass();
            const state = await hass.getState('light.living_room');

            expect(state).toEqual(mockState);
            expect(mockedFetch).toHaveBeenCalledWith(
                `${MOCK_HASS_HOST}/api/states/light.living_room`,
                expect.any(Object)
            );
        });
    });

    describe('Service Calls', () => {
        it('should call services successfully', async () => {
            mockedFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ version: '2024.1.0' })
                } as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve([])
                } as any);

            const hass = await get_hass();
            await hass.callService('light', 'turn_on', {
                entity_id: 'light.living_room',
                brightness: 255
            });

            expect(mockedFetch).toHaveBeenCalledWith(
                `${MOCK_HASS_HOST}/api/services/light/turn_on`,
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
            mockedFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ version: '2024.1.0' })
                } as any)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    statusText: 'Bad Request'
                } as any);

            const hass = await get_hass();
            await expect(
                hass.callService('invalid_domain', 'invalid_service', {})
            ).rejects.toThrow('Bad Request');
        });
    });

    describe('Event Handling', () => {
        it('should subscribe to events', async () => {
            const mockWS = {
                send: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                close: jest.fn()
            };
            (global as any).WebSocket = jest.fn(() => mockWS);

            mockedFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ version: '2024.1.0' })
            } as any);

            const hass = await get_hass();
            const callback = jest.fn();
            await hass.subscribeEvents(callback, 'state_changed');

            expect(mockWS.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"subscribe_events"')
            );
        });

        it('should handle event subscription errors', async () => {
            const mockWS = {
                send: jest.fn(),
                addEventListener: jest.fn((event: string, handler: any) => {
                    if (event === 'error') {
                        handler(new Error('WebSocket error'));
                    }
                }),
                removeEventListener: jest.fn(),
                close: jest.fn()
            };
            (global as any).WebSocket = jest.fn(() => mockWS);

            mockedFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ version: '2024.1.0' })
            } as any);

            const hass = await get_hass();
            const callback = jest.fn();
            await expect(
                hass.subscribeEvents(callback, 'state_changed')
            ).rejects.toThrow('WebSocket error');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            mockedFetch.mockRejectedValueOnce(new Error('Network error'));
            await expect(get_hass()).rejects.toThrow('Network error');
        });

        it('should handle rate limiting', async () => {
            mockedFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests'
            } as any);

            await expect(get_hass()).rejects.toThrow('Too Many Requests');
        });

        it('should handle server errors', async () => {
            mockedFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            } as any);

            await expect(get_hass()).rejects.toThrow('Internal Server Error');
        });
    });
}); 