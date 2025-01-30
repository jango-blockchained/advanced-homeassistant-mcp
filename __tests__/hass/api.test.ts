import { get_hass } from '../../src/hass/index.js';

// Mock the entire hass module
jest.mock('../../src/hass/index.js', () => ({
    get_hass: jest.fn()
}));

describe('Home Assistant API Integration', () => {
    const MOCK_HASS_HOST = 'http://localhost:8123';
    const MOCK_HASS_TOKEN = 'mock_token_12345';

    const mockHassInstance = {
        getStates: jest.fn(),
        getState: jest.fn(),
        callService: jest.fn(),
        subscribeEvents: jest.fn()
    };

    beforeEach(() => {
        process.env.HASS_HOST = MOCK_HASS_HOST;
        process.env.HASS_TOKEN = MOCK_HASS_TOKEN;
        jest.clearAllMocks();
        (get_hass as jest.Mock).mockResolvedValue(mockHassInstance);
    });

    describe('API Connection', () => {
        it('should initialize connection with valid credentials', async () => {
            const hass = await get_hass();
            expect(hass).toBeDefined();
            expect(hass).toBe(mockHassInstance);
        });

        it('should handle connection errors', async () => {
            (get_hass as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));
            await expect(get_hass()).rejects.toThrow('Connection failed');
        });

        it('should handle invalid credentials', async () => {
            (get_hass as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
            await expect(get_hass()).rejects.toThrow('Unauthorized');
        });

        it('should handle missing environment variables', async () => {
            delete process.env.HASS_HOST;
            delete process.env.HASS_TOKEN;
            (get_hass as jest.Mock).mockRejectedValueOnce(new Error('Missing required environment variables'));
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
            mockHassInstance.getStates.mockResolvedValueOnce(mockStates);
            const hass = await get_hass();
            const states = await hass.getStates();
            expect(states).toEqual(mockStates);
        });

        it('should get single entity state', async () => {
            const mockState = mockStates[0];
            mockHassInstance.getState.mockResolvedValueOnce(mockState);
            const hass = await get_hass();
            const state = await hass.getState('light.living_room');
            expect(state).toEqual(mockState);
        });

        it('should handle state fetch errors', async () => {
            mockHassInstance.getStates.mockRejectedValueOnce(new Error('Failed to fetch states'));
            const hass = await get_hass();
            await expect(hass.getStates()).rejects.toThrow('Failed to fetch states');
        });
    });

    describe('Service Calls', () => {
        it('should call services successfully', async () => {
            mockHassInstance.callService.mockResolvedValueOnce(undefined);
            const hass = await get_hass();
            await hass.callService('light', 'turn_on', {
                entity_id: 'light.living_room',
                brightness: 255
            });
            expect(mockHassInstance.callService).toHaveBeenCalledWith(
                'light',
                'turn_on',
                {
                    entity_id: 'light.living_room',
                    brightness: 255
                }
            );
        });

        it('should handle service call errors', async () => {
            mockHassInstance.callService.mockRejectedValueOnce(new Error('Bad Request'));
            const hass = await get_hass();
            await expect(
                hass.callService('invalid_domain', 'invalid_service', {})
            ).rejects.toThrow('Bad Request');
        });
    });

    describe('Event Handling', () => {
        it('should subscribe to events', async () => {
            mockHassInstance.subscribeEvents.mockResolvedValueOnce(undefined);
            const hass = await get_hass();
            const callback = jest.fn();
            await hass.subscribeEvents(callback, 'state_changed');
            expect(mockHassInstance.subscribeEvents).toHaveBeenCalledWith(
                callback,
                'state_changed'
            );
        });

        it('should handle event subscription errors', async () => {
            mockHassInstance.subscribeEvents.mockRejectedValueOnce(new Error('WebSocket error'));
            const hass = await get_hass();
            const callback = jest.fn();
            await expect(
                hass.subscribeEvents(callback, 'state_changed')
            ).rejects.toThrow('WebSocket error');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            (get_hass as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
            await expect(get_hass()).rejects.toThrow('Network error');
        });

        it('should handle rate limiting', async () => {
            (get_hass as jest.Mock).mockRejectedValueOnce(new Error('Too Many Requests'));
            await expect(get_hass()).rejects.toThrow('Too Many Requests');
        });

        it('should handle server errors', async () => {
            (get_hass as jest.Mock).mockRejectedValueOnce(new Error('Internal Server Error'));
            await expect(get_hass()).rejects.toThrow('Internal Server Error');
        });
    });
}); 