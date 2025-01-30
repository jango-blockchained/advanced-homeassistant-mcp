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

    describe('get_history tool', () => {
        it('should successfully fetch history', async () => {
            const mockHistory = [
                {
                    entity_id: 'light.living_room',
                    state: 'on',
                    last_changed: '2024-01-01T00:00:00Z',
                    attributes: { brightness: 255 }
                },
                {
                    entity_id: 'light.living_room',
                    state: 'off',
                    last_changed: '2024-01-01T01:00:00Z',
                    attributes: { brightness: 0 }
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistory
            } as Response);

            // Get the tool registration
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const historyTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'get_history')?.[0] as Tool;

            // Execute the tool
            const result = await historyTool.execute({
                entity_id: 'light.living_room',
                start_time: '2024-01-01T00:00:00Z',
                end_time: '2024-01-01T02:00:00Z',
                minimal_response: true,
                significant_changes_only: true
            });

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.history).toEqual(mockHistory);

            // Verify the fetch call
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/history/period/2024-01-01T00:00:00Z?'),
                expect.objectContaining({
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    }
                })
            );

            // Verify query parameters
            const url = mockFetch.mock.calls[0][0] as string;
            const queryParams = new URL(url).searchParams;
            expect(queryParams.get('filter_entity_id')).toBe('light.living_room');
            expect(queryParams.get('minimal_response')).toBe('true');
            expect(queryParams.get('significant_changes_only')).toBe('true');
        });

        it('should handle fetch errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const historyTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'get_history')?.[0] as Tool;

            const result = await historyTool.execute({
                entity_id: 'light.living_room'
            });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Network error');
        });
    });

    describe('scene tool', () => {
        it('should successfully list scenes', async () => {
            const mockScenes = [
                {
                    entity_id: 'scene.movie_time',
                    state: 'on',
                    attributes: {
                        friendly_name: 'Movie Time',
                        description: 'Perfect lighting for movies'
                    }
                },
                {
                    entity_id: 'scene.good_morning',
                    state: 'on',
                    attributes: {
                        friendly_name: 'Good Morning',
                        description: 'Bright lights to start the day'
                    }
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockScenes
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const sceneTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'scene')?.[0] as Tool;

            const result = await sceneTool.execute({
                action: 'list'
            });

            expect(result.success).toBe(true);
            expect(result.scenes).toEqual([
                {
                    entity_id: 'scene.movie_time',
                    name: 'Movie Time',
                    description: 'Perfect lighting for movies'
                },
                {
                    entity_id: 'scene.good_morning',
                    name: 'Good Morning',
                    description: 'Bright lights to start the day'
                }
            ]);
        });

        it('should successfully activate a scene', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const sceneTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'scene')?.[0] as Tool;

            const result = await sceneTool.execute({
                action: 'activate',
                scene_id: 'scene.movie_time'
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully activated scene scene.movie_time');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/scene/turn_on',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        entity_id: 'scene.movie_time'
                    })
                }
            );
        });
    });

    describe('notify tool', () => {
        it('should successfully send a notification', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const notifyTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'notify')?.[0] as Tool;

            const result = await notifyTool.execute({
                message: 'Test notification',
                title: 'Test Title',
                target: 'mobile_app_phone',
                data: { priority: 'high' }
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Notification sent successfully');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/notify/mobile_app_phone',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Test notification',
                        title: 'Test Title',
                        data: { priority: 'high' }
                    })
                }
            );
        });

        it('should use default notification service when no target is specified', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const notifyTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'notify')?.[0] as Tool;

            await notifyTool.execute({
                message: 'Test notification'
            });

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/notify/notify',
                expect.any(Object)
            );
        });
    });

    describe('automation tool', () => {
        it('should successfully list automations', async () => {
            const mockAutomations = [
                {
                    entity_id: 'automation.morning_routine',
                    state: 'on',
                    attributes: {
                        friendly_name: 'Morning Routine',
                        last_triggered: '2024-01-01T07:00:00Z'
                    }
                },
                {
                    entity_id: 'automation.night_mode',
                    state: 'off',
                    attributes: {
                        friendly_name: 'Night Mode',
                        last_triggered: '2024-01-01T22:00:00Z'
                    }
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAutomations
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const automationTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'automation')?.[0] as Tool;

            const result = await automationTool.execute({
                action: 'list'
            });

            expect(result.success).toBe(true);
            expect(result.automations).toEqual([
                {
                    entity_id: 'automation.morning_routine',
                    name: 'Morning Routine',
                    state: 'on',
                    last_triggered: '2024-01-01T07:00:00Z'
                },
                {
                    entity_id: 'automation.night_mode',
                    name: 'Night Mode',
                    state: 'off',
                    last_triggered: '2024-01-01T22:00:00Z'
                }
            ]);
        });

        it('should successfully toggle an automation', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const automationTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'automation')?.[0] as Tool;

            const result = await automationTool.execute({
                action: 'toggle',
                automation_id: 'automation.morning_routine'
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully toggled automation automation.morning_routine');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/automation/toggle',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        entity_id: 'automation.morning_routine'
                    })
                }
            );
        });

        it('should successfully trigger an automation', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const automationTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'automation')?.[0] as Tool;

            const result = await automationTool.execute({
                action: 'trigger',
                automation_id: 'automation.morning_routine'
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully triggered automation automation.morning_routine');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/services/automation/trigger',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        entity_id: 'automation.morning_routine'
                    })
                }
            );
        });

        it('should require automation_id for toggle and trigger actions', async () => {
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const automationTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'automation')?.[0] as Tool;

            const result = await automationTool.execute({
                action: 'toggle'
            });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Automation ID is required for toggle and trigger actions');
        });
    });

    describe('addon tool', () => {
        it('should successfully list add-ons', async () => {
            const mockAddons = {
                data: {
                    addons: [
                        {
                            name: 'File Editor',
                            slug: 'core_configurator',
                            description: 'Simple browser-based file editor',
                            version: '5.6.0',
                            installed: true,
                            available: true,
                            state: 'started'
                        },
                        {
                            name: 'Terminal & SSH',
                            slug: 'ssh',
                            description: 'Terminal access to your Home Assistant',
                            version: '9.6.1',
                            installed: false,
                            available: true,
                            state: 'not_installed'
                        }
                    ]
                }
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockAddons
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const addonTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'addon')?.[0] as Tool;

            const result = await addonTool.execute({
                action: 'list'
            });

            expect(result.success).toBe(true);
            expect(result.addons).toEqual(mockAddons.data.addons);
        });

        it('should successfully install an add-on', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { state: 'installing' } })
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const addonTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'addon')?.[0] as Tool;

            const result = await addonTool.execute({
                action: 'install',
                slug: 'core_configurator',
                version: '5.6.0'
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully installed add-on core_configurator');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/hassio/addons/core_configurator/install',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ version: '5.6.0' })
                }
            );
        });
    });

    describe('package tool', () => {
        it('should successfully list packages', async () => {
            const mockPackages = {
                repositories: [
                    {
                        name: 'HACS',
                        description: 'Home Assistant Community Store',
                        category: 'integration',
                        installed: true,
                        version_installed: '1.32.0',
                        available_version: '1.32.0',
                        authors: ['ludeeus'],
                        domain: 'hacs'
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockPackages
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const packageTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'package')?.[0] as Tool;

            const result = await packageTool.execute({
                action: 'list',
                category: 'integration'
            });

            expect(result.success).toBe(true);
            expect(result.packages).toEqual(mockPackages.repositories);
        });

        it('should successfully install a package', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const packageTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'package')?.[0] as Tool;

            const result = await packageTool.execute({
                action: 'install',
                category: 'integration',
                repository: 'hacs/integration',
                version: '1.32.0'
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully installed package hacs/integration');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/hacs/repository/install',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        category: 'integration',
                        repository: 'hacs/integration',
                        version: '1.32.0'
                    })
                }
            );
        });
    });

    describe('automation_config tool', () => {
        const mockAutomationConfig = {
            alias: 'Test Automation',
            description: 'Test automation description',
            mode: 'single',
            trigger: [
                {
                    platform: 'state',
                    entity_id: 'binary_sensor.motion',
                    to: 'on'
                }
            ],
            action: [
                {
                    service: 'light.turn_on',
                    target: {
                        entity_id: 'light.living_room'
                    }
                }
            ]
        };

        it('should successfully create an automation', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ automation_id: 'new_automation_1' })
            } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const automationConfigTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'automation_config')?.[0] as Tool;

            const result = await automationConfigTool.execute({
                action: 'create',
                config: mockAutomationConfig
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully created automation');
            expect(result.automation_id).toBe('new_automation_1');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/config/automation/config',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(mockAutomationConfig)
                }
            );
        });

        it('should successfully duplicate an automation', async () => {
            // Mock get existing automation
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockAutomationConfig
                } as Response)
                // Mock create new automation
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ automation_id: 'new_automation_2' })
                } as Response);

            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const automationConfigTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'automation_config')?.[0] as Tool;

            const result = await automationConfigTool.execute({
                action: 'duplicate',
                automation_id: 'automation.test'
            });

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully duplicated automation automation.test');
            expect(result.new_automation_id).toBe('new_automation_2');

            // Verify both API calls
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/config/automation/config/automation.test',
                expect.any(Object)
            );

            const duplicateConfig = { ...mockAutomationConfig, alias: 'Test Automation (Copy)' };
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8123/api/config/automation/config',
                {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test_token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(duplicateConfig)
                }
            );
        });

        it('should require config for create action', async () => {
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const automationConfigTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'automation_config')?.[0] as Tool;

            const result = await automationConfigTool.execute({
                action: 'create'
            });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Configuration is required for creating automation');
        });

        it('should require automation_id for update action', async () => {
            const liteMcpInstance = (LiteMCP as jest.MockedClass<typeof LiteMCP>).mock.results[0].value;
            const addToolCalls = liteMcpInstance.addTool.mock.calls;
            const automationConfigTool = addToolCalls.find((call: { 0: Tool }) => call[0].name === 'automation_config')?.[0] as Tool;

            const result = await automationConfigTool.execute({
                action: 'update',
                config: mockAutomationConfig
            });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Automation ID and configuration are required for updating automation');
        });
    });
}); 