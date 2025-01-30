import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import type { Mock } from 'jest-mock';
import { LiteMCP } from 'litemcp';

// Mock environment variables
process.env.HASS_HOST = 'http://localhost:8123';
process.env.HASS_TOKEN = 'test_token';

// Mock fetch
const mockFetch = jest.fn().mockImplementation(
    async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        return {} as Response;
    }
) as unknown as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock LiteMCP
jest.mock('litemcp', () => {
    return {
        LiteMCP: jest.fn().mockImplementation(() => ({
            addTool: jest.fn(),
            start: jest.fn().mockResolvedValue(undefined)
        }))
    };
});

// Mock get_hass
jest.unstable_mockModule('../src/hass/index.js', () => ({
    get_hass: jest.fn().mockResolvedValue({
        services: {
            light: {
                turn_on: jest.fn(),
                turn_off: jest.fn()
            }
        }
    })
}));

interface Tool {
    name: string;
    execute: (...args: any[]) => Promise<any>;
}

describe('Home Assistant MCP Server', () => {
    beforeEach(async () => {
        // Reset all mocks
        jest.clearAllMocks();
        mockFetch.mockReset();

        // Import the module which will execute the main function
        await import('../src/index.js');
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('list_devices tool', () => {
        it('should successfully list devices', async () => {
            // Mock the fetch response for listing devices
            const mockDevices = [
                {
                    entity_id: 'light.living_room',
                    state: 'on',
                    attributes: { brightness: 255 }
                },
                {
                    entity_id: 'climate.bedroom',
                    state: 'heat',
                    attributes: { temperature: 22 }
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDevices
            } as Response);

            // Get the tool registration
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const listDevicesTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'list_devices')?.[0] as Tool;

            // Execute the tool
            const result = await listDevicesTool.execute({});

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.devices).toEqual({
                light: [{
                    entity_id: 'light.living_room',
                    state: 'on',
                    attributes: { brightness: 255 }
                }],
                climate: [{
                    entity_id: 'climate.bedroom',
                    state: 'heat',
                    attributes: { temperature: 22 }
                }]
            });
        });

        it('should handle fetch errors', async () => {
            // Mock a fetch error
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            // Get the tool registration
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const listDevicesTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'list_devices')?.[0] as Tool;

            // Execute the tool
            const result = await listDevicesTool.execute({});

            // Verify error handling
            expect(result.success).toBe(false);
            expect(result.message).toBe('Network error');
        });
    });

    describe('control tool', () => {
        it('should successfully control a light device', async () => {
            // Mock successful service call
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            // Get the tool registration
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const controlTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'control')?.[0] as Tool;

            // Execute the tool
            const result = await controlTool.execute({
                command: 'turn_on',
                entity_id: 'light.living_room',
                brightness: 255
            });

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully executed turn_on for light.living_room');

            // Verify the fetch call
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/light/turn_on',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        entity_id: 'light.living_room',
                        brightness: 255
                    })
                }
            );
        });

        it('should handle unsupported domains', async () => {
            // Get the tool registration
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const controlTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'control')?.[0] as Tool;

            // Execute the tool with an unsupported domain
            const result = await controlTool.execute({
                command: 'turn_on',
                entity_id: 'unsupported.device'
            });

            // Verify error handling
            expect(result.success).toBe(false);
            expect(result.message).toBe('Unsupported domain: unsupported');
        });

        it('should handle service call errors', async () => {
            // Mock a failed service call
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Service unavailable'
            } as Response);

            // Get the tool registration
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const controlTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'control')?.[0] as Tool;

            // Execute the tool
            const result = await controlTool.execute({
                command: 'turn_on',
                entity_id: 'light.living_room'
            });

            // Verify error handling
            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed to execute turn_on for light.living_room');
        });

        it('should handle climate device controls', async () => {
            // Mock successful service call
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            // Get the tool registration
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const controlTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'control')?.[0] as Tool;

            // Execute the tool
            const result = await controlTool.execute({
                command: 'set_temperature',
                entity_id: 'climate.bedroom',
                temperature: 22,
                target_temp_high: 24,
                target_temp_low: 20
            });

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully executed set_temperature for climate.bedroom');

            // Verify the fetch call
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/climate/set_temperature',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        entity_id: 'climate.bedroom',
                        temperature: 22,
                        target_temp_high: 24,
                        target_temp_low: 20
                    })
                }
            );
        });

        it('should handle cover device controls', async () => {
            // Mock successful service call
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            // Get the tool registration
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const controlTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'control')?.[0] as Tool;

            // Execute the tool
            const result = await controlTool.execute({
                command: 'set_position',
                entity_id: 'cover.living_room',
                position: 50
            });

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully executed set_position for cover.living_room');

            // Verify the fetch call
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/cover/set_position',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        entity_id: 'cover.living_room',
                        position: 50
                    })
                }
            );
        });
    });
}); 