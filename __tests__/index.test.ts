import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { LiteMCP } from 'litemcp';
import { get_hass } from '../src/hass/index.js';
import type { WebSocket } from 'ws';

// Load test environment variables with defaults
const TEST_HASS_HOST = process.env.TEST_HASS_HOST || 'http://localhost:8123';
const TEST_HASS_TOKEN = process.env.TEST_HASS_TOKEN || 'test_token';
const TEST_HASS_SOCKET_URL = process.env.TEST_HASS_SOCKET_URL || 'ws://localhost:8123/api/websocket';

// Set environment variables for testing
process.env.HASS_HOST = TEST_HASS_HOST;
process.env.HASS_TOKEN = TEST_HASS_TOKEN;
process.env.HASS_SOCKET_URL = TEST_HASS_SOCKET_URL;

// Mock fetch
const mockFetchResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ automation_id: 'test_automation' }),
    text: async () => '{"automation_id":"test_automation"}',
    headers: new Headers(),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob([]),
    formData: async () => new FormData(),
    clone: function () { return { ...this }; },
    type: 'default',
    url: '',
    redirected: false,
    redirect: () => Promise.resolve(new Response())
} as Response;

const mockFetch = jest.fn(async (_input: string | URL | Request, _init?: RequestInit) => mockFetchResponse);
(global as any).fetch = mockFetch;

// Mock LiteMCP
interface Tool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (params: Record<string, unknown>) => Promise<unknown>;
}

type MockFunction<T = any> = jest.Mock<Promise<T>, any[]>;

interface MockLiteMCPInstance {
    addTool: ReturnType<typeof jest.fn>;
    start: ReturnType<typeof jest.fn>;
}

const mockLiteMCPInstance: MockLiteMCPInstance = {
    addTool: jest.fn(),
    start: jest.fn().mockResolvedValue(undefined)
};

jest.mock('litemcp', () => ({
    LiteMCP: jest.fn(() => mockLiteMCPInstance)
}));

// Mock get_hass
interface MockServices {
    light: {
        turn_on: jest.Mock;
        turn_off: jest.Mock;
    };
    climate: {
        set_temperature: jest.Mock;
    };
}

interface MockHassInstance {
    services: MockServices;
}

// Create mock services
const mockServices: MockServices = {
    light: {
        turn_on: jest.fn().mockResolvedValue({ success: true }),
        turn_off: jest.fn().mockResolvedValue({ success: true })
    },
    climate: {
        set_temperature: jest.fn().mockResolvedValue({ success: true })
    }
};

jest.unstable_mockModule('../src/hass/index.js', () => ({
    get_hass: jest.fn().mockResolvedValue({ services: mockServices })
}));

interface TestResponse {
    success: boolean;
    message?: string;
    devices?: Record<string, unknown>;
    history?: unknown[];
    scenes?: unknown[];
    automations?: unknown[];
    addons?: unknown[];
    packages?: unknown[];
    automation_id?: string;
    new_automation_id?: string;
}

type WebSocketEventMap = {
    message: MessageEvent;
    open: Event;
    close: Event;
    error: Event;
};

type WebSocketEventListener = (event: Event) => void;
type WebSocketMessageListener = (event: MessageEvent) => void;

interface MockWebSocketInstance {
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    send: jest.Mock;
    close: jest.Mock;
    readyState: number;
    binaryType: 'blob' | 'arraybuffer';
    bufferedAmount: number;
    extensions: string;
    protocol: string;
    url: string;
    onopen: WebSocketEventListener | null;
    onerror: WebSocketEventListener | null;
    onclose: WebSocketEventListener | null;
    onmessage: WebSocketMessageListener | null;
    CONNECTING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;
}

const createMockWebSocket = (): MockWebSocketInstance => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 0,
    binaryType: 'blob',
    bufferedAmount: 0,
    extensions: '',
    protocol: '',
    url: '',
    onopen: null,
    onerror: null,
    onclose: null,
    onmessage: null,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
});

describe('Home Assistant MCP Server', () => {
    let mockHass: MockHassInstance;
    let liteMcpInstance: MockLiteMCPInstance;
    let addToolCalls: Array<[Tool]>;

    beforeEach(async () => {
        mockHass = {
            services: mockServices
        };

        // Reset all mocks
        jest.clearAllMocks();
        mockFetch.mockClear();

        // Import the module which will execute the main function
        await import('../src/index.js');

        // Mock WebSocket
        const mockWs = createMockWebSocket();
        (global as any).WebSocket = jest.fn(() => mockWs);

        // Get the mock instance
        liteMcpInstance = mockLiteMCPInstance;
        addToolCalls = liteMcpInstance.addTool.mock.calls as Array<[Tool]>;
    });

    afterEach(() => {
        jest.resetModules();
    });

    it('should connect to Home Assistant', async () => {
        const hass = await get_hass();
        expect(hass).toBeDefined();
        expect(hass.services).toBeDefined();
        expect(typeof hass.services.light.turn_on).toBe('function');
    });

    it('should reuse the same instance on subsequent calls', async () => {
        const firstInstance = await get_hass();
        const secondInstance = await get_hass();
        expect(firstInstance).toBe(secondInstance);
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
            const listDevicesTool = addToolCalls.find(call => call[0].name === 'list_devices')?.[0];
            expect(listDevicesTool).toBeDefined();

            if (!listDevicesTool) {
                throw new Error('list_devices tool not found');
            }

            // Execute the tool
            const result = (await listDevicesTool.execute({})) as TestResponse;

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
            const listDevicesTool = addToolCalls.find(call => call[0].name === 'list_devices')?.[0];
            expect(listDevicesTool).toBeDefined();

            if (!listDevicesTool) {
                throw new Error('list_devices tool not found');
            }

            // Execute the tool
            const result = (await listDevicesTool.execute({})) as TestResponse;

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
            const controlTool = addToolCalls.find(call => call[0].name === 'control')?.[0];
            expect(controlTool).toBeDefined();

            if (!controlTool) {
                throw new Error('control tool not found');
            }

            // Execute the tool
            const result = (await controlTool.execute({
                command: 'turn_on',
                entity_id: 'light.living_room',
                brightness: 255
            })) as TestResponse;

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully executed turn_on for light.living_room');

            // Verify the fetch call
            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/services/light/turn_on`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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
            const controlTool = addToolCalls.find(call => call[0].name === 'control')?.[0];
            expect(controlTool).toBeDefined();

            if (!controlTool) {
                throw new Error('control tool not found');
            }

            // Execute the tool with an unsupported domain
            const result = (await controlTool.execute({
                command: 'turn_on',
                entity_id: 'unsupported.device'
            })) as TestResponse;

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
            const controlTool = addToolCalls.find(call => call[0].name === 'control')?.[0];
            expect(controlTool).toBeDefined();

            if (!controlTool) {
                throw new Error('control tool not found');
            }

            // Execute the tool
            const result = (await controlTool.execute({
                command: 'turn_on',
                entity_id: 'light.living_room'
            })) as TestResponse;

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
            const controlTool = addToolCalls.find(call => call[0].name === 'control')?.[0];
            expect(controlTool).toBeDefined();

            if (!controlTool) {
                throw new Error('control tool not found');
            }

            // Execute the tool
            const result = (await controlTool.execute({
                command: 'set_temperature',
                entity_id: 'climate.bedroom',
                temperature: 22,
                target_temp_high: 24,
                target_temp_low: 20
            })) as TestResponse;

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully executed set_temperature for climate.bedroom');

            // Verify the fetch call
            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/services/climate/set_temperature`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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
            const controlTool = addToolCalls.find(call => call[0].name === 'control')?.[0];
            expect(controlTool).toBeDefined();

            if (!controlTool) {
                throw new Error('control tool not found');
            }

            // Execute the tool
            const result = (await controlTool.execute({
                command: 'set_position',
                entity_id: 'cover.living_room',
                position: 50
            })) as TestResponse;

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully executed set_position for cover.living_room');

            // Verify the fetch call
            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/services/cover/set_position`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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
            const historyTool = addToolCalls.find(call => call[0].name === 'get_history')?.[0];
            expect(historyTool).toBeDefined();

            if (!historyTool) {
                throw new Error('get_history tool not found');
            }

            // Execute the tool
            const result = (await historyTool.execute({
                entity_id: 'light.living_room',
                start_time: '2024-01-01T00:00:00Z',
                end_time: '2024-01-01T02:00:00Z',
                minimal_response: true,
                significant_changes_only: true
            })) as TestResponse;

            // Verify the results
            expect(result.success).toBe(true);
            expect(result.history).toEqual(mockHistory);

            // Verify the fetch call
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/history/period/2024-01-01T00:00:00Z?'),
                expect.objectContaining({
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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

            const historyTool = addToolCalls.find(call => call[0].name === 'get_history')?.[0];
            expect(historyTool).toBeDefined();

            if (!historyTool) {
                throw new Error('get_history tool not found');
            }

            const result = (await historyTool.execute({
                entity_id: 'light.living_room'
            })) as TestResponse;

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

            const sceneTool = addToolCalls.find(call => call[0].name === 'scene')?.[0];
            expect(sceneTool).toBeDefined();

            if (!sceneTool) {
                throw new Error('scene tool not found');
            }

            const result = (await sceneTool.execute({
                action: 'list'
            })) as TestResponse;

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

            const sceneTool = addToolCalls.find(call => call[0].name === 'scene')?.[0];
            expect(sceneTool).toBeDefined();

            if (!sceneTool) {
                throw new Error('scene tool not found');
            }

            const result = (await sceneTool.execute({
                action: 'activate',
                scene_id: 'scene.movie_time'
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully activated scene scene.movie_time');

            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/services/scene/turn_on`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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

            const notifyTool = addToolCalls.find(call => call[0].name === 'notify')?.[0];
            expect(notifyTool).toBeDefined();

            if (!notifyTool) {
                throw new Error('notify tool not found');
            }

            const result = (await notifyTool.execute({
                message: 'Test notification',
                title: 'Test Title',
                target: 'mobile_app_phone',
                data: { priority: 'high' }
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.message).toBe('Notification sent successfully');

            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/services/notify/mobile_app_phone`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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

            const notifyTool = addToolCalls.find(call => call[0].name === 'notify')?.[0];
            expect(notifyTool).toBeDefined();

            if (!notifyTool) {
                throw new Error('notify tool not found');
            }

            await notifyTool.execute({
                message: 'Test notification'
            });

            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/services/notify/notify`,
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

            const automationTool = addToolCalls.find(call => call[0].name === 'automation')?.[0];
            expect(automationTool).toBeDefined();

            if (!automationTool) {
                throw new Error('automation tool not found');
            }

            const result = (await automationTool.execute({
                action: 'list'
            })) as TestResponse;

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

            const automationTool = addToolCalls.find(call => call[0].name === 'automation')?.[0];
            expect(automationTool).toBeDefined();

            if (!automationTool) {
                throw new Error('automation tool not found');
            }

            const result = (await automationTool.execute({
                action: 'toggle',
                automation_id: 'automation.morning_routine'
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully toggled automation automation.morning_routine');

            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/services/automation/toggle`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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

            const automationTool = addToolCalls.find(call => call[0].name === 'automation')?.[0];
            expect(automationTool).toBeDefined();

            if (!automationTool) {
                throw new Error('automation tool not found');
            }

            const result = (await automationTool.execute({
                action: 'trigger',
                automation_id: 'automation.morning_routine'
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully triggered automation automation.morning_routine');

            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/services/automation/trigger`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        entity_id: 'automation.morning_routine'
                    })
                }
            );
        });

        it('should require automation_id for toggle and trigger actions', async () => {
            const automationTool = addToolCalls.find(call => call[0].name === 'automation')?.[0];
            expect(automationTool).toBeDefined();

            if (!automationTool) {
                throw new Error('automation tool not found');
            }

            const result = (await automationTool.execute({
                action: 'toggle'
            })) as TestResponse;

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

            const addonTool = addToolCalls.find(call => call[0].name === 'addon')?.[0];
            expect(addonTool).toBeDefined();

            if (!addonTool) {
                throw new Error('addon tool not found');
            }

            const result = (await addonTool.execute({
                action: 'list'
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.addons).toEqual(mockAddons.data.addons);
        });

        it('should successfully install an add-on', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { state: 'installing' } })
            } as Response);

            const addonTool = addToolCalls.find(call => call[0].name === 'addon')?.[0];
            expect(addonTool).toBeDefined();

            if (!addonTool) {
                throw new Error('addon tool not found');
            }

            const result = (await addonTool.execute({
                action: 'install',
                slug: 'core_configurator',
                version: '5.6.0'
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully installed add-on core_configurator');

            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/hassio/addons/core_configurator/install`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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

            const packageTool = addToolCalls.find(call => call[0].name === 'package')?.[0];
            expect(packageTool).toBeDefined();

            if (!packageTool) {
                throw new Error('package tool not found');
            }

            const result = (await packageTool.execute({
                action: 'list',
                category: 'integration'
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.packages).toEqual(mockPackages.repositories);
        });

        it('should successfully install a package', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            } as Response);

            const packageTool = addToolCalls.find(call => call[0].name === 'package')?.[0];
            expect(packageTool).toBeDefined();

            if (!packageTool) {
                throw new Error('package tool not found');
            }

            const result = (await packageTool.execute({
                action: 'install',
                category: 'integration',
                repository: 'hacs/integration',
                version: '1.32.0'
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully installed package hacs/integration');

            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/hacs/repository/install`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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

            const automationConfigTool = addToolCalls.find(call => call[0].name === 'automation_config')?.[0];
            expect(automationConfigTool).toBeDefined();

            if (!automationConfigTool) {
                throw new Error('automation_config tool not found');
            }

            const result = (await automationConfigTool.execute({
                action: 'create',
                config: mockAutomationConfig
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully created automation');
            expect(result.automation_id).toBe('new_automation_1');

            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/config/automation/config`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
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

            const automationConfigTool = addToolCalls.find(call => call[0].name === 'automation_config')?.[0];
            expect(automationConfigTool).toBeDefined();

            if (!automationConfigTool) {
                throw new Error('automation_config tool not found');
            }

            const result = (await automationConfigTool.execute({
                action: 'duplicate',
                automation_id: 'automation.test'
            })) as TestResponse;

            expect(result.success).toBe(true);
            expect(result.message).toBe('Successfully duplicated automation automation.test');
            expect(result.new_automation_id).toBe('new_automation_2');

            // Verify both API calls
            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/config/automation/config/automation.test`,
                expect.any(Object)
            );

            const duplicateConfig = { ...mockAutomationConfig, alias: 'Test Automation (Copy)' };
            expect(mockFetch).toHaveBeenCalledWith(
                `${TEST_HASS_HOST}/api/config/automation/config`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${TEST_HASS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(duplicateConfig)
                }
            );
        });

        it('should require config for create action', async () => {
            const automationConfigTool = addToolCalls.find(call => call[0].name === 'automation_config')?.[0];
            expect(automationConfigTool).toBeDefined();

            if (!automationConfigTool) {
                throw new Error('automation_config tool not found');
            }

            const result = (await automationConfigTool.execute({
                action: 'create'
            })) as TestResponse;

            expect(result.success).toBe(false);
            expect(result.message).toBe('Configuration is required for creating automation');
        });

        it('should require automation_id for update action', async () => {
            const automationConfigTool = addToolCalls.find(call => call[0].name === 'automation_config')?.[0];
            expect(automationConfigTool).toBeDefined();

            if (!automationConfigTool) {
                throw new Error('automation_config tool not found');
            }

            const result = (await automationConfigTool.execute({
                action: 'update',
                config: mockAutomationConfig
            })) as TestResponse;

            expect(result.success).toBe(false);
            expect(result.message).toBe('Automation ID and configuration are required for updating automation');
        });
    });
}); 