import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import type { Mock } from "bun:test";
import { tools } from "../src/tools/index.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// Extend the global scope
declare global {
    // eslint-disable-next-line no-var
    var mockResponse: Response;
}

// Test configuration
const TEST_CONFIG = {
    HASS_HOST: process.env.TEST_HASS_HOST || 'http://localhost:8123',
    HASS_TOKEN: process.env.TEST_HASS_TOKEN || 'test_token',
    HASS_SOCKET_URL: process.env.TEST_HASS_SOCKET_URL || 'ws://localhost:8123/api/websocket'
} as const;

// Setup test environment
Object.entries(TEST_CONFIG).forEach(([key, value]) => {
    process.env[key] = value;
});

// Modify mock fetch methods to be consistent
const createMockFetch = <T>(data: T): Mock<() => Promise<Response>> => {
    return mock(() => Promise.resolve({
        ok: true,
        json: async () => {
            return await Promise.resolve(data);
        }
    } as Response));
};

let mockFetch = createMockFetch([
    {
        entity_id: 'light.living_room',
        state: 'on',
        attributes: { brightness: 255 }
    }
]);

describe('Home Assistant MCP Server', () => {
    beforeEach(async () => {
        // Setup default response
        mockFetch = createMockFetch({ state: 'connected' });
        globalThis.fetch = mockFetch;
        await Promise.resolve();
    });

    afterEach(() => {
        mockFetch = createMockFetch({});
    });

    describe('Tool Registration', () => {
        test('should register all required tools', () => {
            const toolNames = tools.map(tool => tool.name);

            expect(toolNames).toContain('list_devices');
            expect(toolNames).toContain('control');
        });

        test('should configure tools with correct parameters', () => {
            const listDevicesTool = tools.find(tool => tool.name === 'list_devices');
            expect(listDevicesTool).toBeDefined();
            expect(listDevicesTool?.parameters).toBeDefined();

            const controlTool = tools.find(tool => tool.name === 'control');
            expect(controlTool).toBeDefined();
            expect(controlTool?.parameters).toBeDefined();
        });
    });

    describe('Tool Execution', () => {
        test('should execute list_devices tool', async () => {
            const listDevicesTool = tools.find(tool => tool.name === 'list_devices');
            expect(listDevicesTool).toBeDefined();

            const mockDevices = [
                {
                    entity_id: 'light.living_room',
                    state: 'on',
                    attributes: { brightness: 255 }
                }
            ];

            mockFetch = createMockFetch(mockDevices);
            globalThis.fetch = mockFetch;

            const result = await listDevicesTool.execute({});
            expect(result).toHaveProperty('devices');
            expect(result).toHaveProperty('total_count');
            expect(result).toHaveProperty('filters_applied');
        });

        test('should execute control tool', async () => {
            const controlTool = tools.find(tool => tool.name === 'control');
            expect(controlTool).toBeDefined();

            mockFetch = createMockFetch({ success: true });
            globalThis.fetch = mockFetch;

            const result = await controlTool.execute({
                command: 'turn_on',
                entity_id: 'light.living_room',
                brightness: 255
            });

            expect(result).toHaveProperty('success', true);
            expect(mockFetch.mock.calls.length).toBeGreaterThan(0);
        });
    });
}); 