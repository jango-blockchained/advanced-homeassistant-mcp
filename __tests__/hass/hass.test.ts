import { jest, describe, beforeEach, afterAll, it, expect } from '@jest/globals';
import type { Mock } from 'jest-mock';

// Define types
interface MockResponse {
    success: boolean;
}

type MockFn = () => Promise<MockResponse>;

interface MockService {
    [key: string]: Mock<MockFn>;
}

interface MockServices {
    light: {
        turn_on: Mock<MockFn>;
        turn_off: Mock<MockFn>;
    };
    climate: {
        set_temperature: Mock<MockFn>;
    };
}

interface MockHassInstance {
    services: MockServices;
}

// Mock instance
let mockInstance: MockHassInstance | null = null;

const createMockFn = (): Mock<MockFn> => {
    return jest.fn<MockFn>().mockImplementation(async () => ({ success: true }));
};

// Mock the digital-alchemy modules before tests
jest.unstable_mockModule('@digital-alchemy/core', () => ({
    CreateApplication: jest.fn(() => ({
        configuration: {},
        bootstrap: async () => mockInstance,
        services: {}
    })),
    TServiceParams: jest.fn()
}));

jest.unstable_mockModule('@digital-alchemy/hass', () => ({
    LIB_HASS: {
        configuration: {},
        services: {}
    }
}));

describe('Home Assistant Connection', () => {
    // Backup the original environment
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        // Initialize mock instance
        mockInstance = {
            services: {
                light: {
                    turn_on: createMockFn(),
                    turn_off: createMockFn(),
                },
                climate: {
                    set_temperature: createMockFn(),
                },
            },
        };
        // Reset environment variables
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    it('should return a Home Assistant instance with services', async () => {
        const { get_hass } = await import('../../src/hass/index.js');
        const hass = await get_hass();

        expect(hass).toBeDefined();
        expect(hass.services).toBeDefined();
        expect(typeof hass.services.light.turn_on).toBe('function');
        expect(typeof hass.services.light.turn_off).toBe('function');
        expect(typeof hass.services.climate.set_temperature).toBe('function');
    });

    it('should reuse the same instance on subsequent calls', async () => {
        const { get_hass } = await import('../../src/hass/index.js');
        const firstInstance = await get_hass();
        const secondInstance = await get_hass();

        expect(firstInstance).toBe(secondInstance);
    });
}); 