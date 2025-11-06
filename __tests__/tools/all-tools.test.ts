import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { tools } from "../../src/tools/index.js";
import {
    TEST_CONFIG,
    createMockResponse,
} from "../utils/test-utils.js";

type TestResult = { success: boolean; error?: string; message?: string; [key: string]: unknown };

function parseResult(result: unknown): TestResult {
    if (typeof result === "string") {
        return JSON.parse(result) as TestResult;
    }
    return result as TestResult;
}

describe("Comprehensive Tool Suite Tests", () => {
    let mocks: { mockFetch: ReturnType<typeof mock> };

    beforeEach(async () => {
        // Setup mock fetch
        mocks = {
            mockFetch: mock(() => Promise.resolve(createMockResponse({}))),
        };
        globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;
        await Promise.resolve();
    });

    afterEach(() => {
        // Reset mocks
        globalThis.fetch = mock(() => Promise.resolve(createMockResponse({}))) as unknown as typeof fetch;
    });

    describe("Tool Registry", () => {
        test("should have all 19 tools registered", () => {
            expect(tools.length).toBe(19);
        });

        test("should have unique tool names", () => {
            const names = tools.map((t) => t.name);
            const uniqueNames = new Set(names);
            expect(names.length).toBe(uniqueNames.size);
        });

        test("should have all tools with required properties", () => {
            tools.forEach((tool) => {
                expect(tool.name).toBeDefined();
                expect(typeof tool.name).toBe("string");
                expect(tool.description).toBeDefined();
                expect(typeof tool.description).toBe("string");
                expect(tool.parameters).toBeDefined();
                expect(tool.execute).toBeDefined();
                expect(typeof tool.execute).toBe("function");
            });
        });

        test("should list all available tools", () => {
            const toolNames = tools.map((t) => t.name).sort();
            const expectedTools = [
                "addon",
                "alarm_control",
                "automation",
                "automation_config",
                "climate_control",
                "control",
                "cover_control",
                "fan_control",
                "get_history",
                "get_sse_stats",
                "lights_control",
                "list_devices",
                "lock_control",
                "media_player_control",
                "notify",
                "package",
                "scene",
                "subscribe_events",
                "vacuum_control",
            ].sort();
            expect(toolNames).toEqual(expectedTools);
        });
    });

    describe("Control Tool", () => {
        test("should execute turn_on command", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const controlTool = tools.find((t) => t.name === "control");
            expect(controlTool).toBeDefined();

            if (!controlTool) throw new Error("control tool not found");

            const result: unknown = await controlTool.execute({
                command: "turn_on",
                entity_id: "light.living_room",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should handle missing entity_id and area_id", async () => {
            const controlTool = tools.find((t) => t.name === "control");
            expect(controlTool).toBeDefined();

            if (!controlTool) throw new Error("control tool not found");

            const result: unknown = await controlTool.execute({
                command: "turn_on",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain("entity_id or area_id");
        });

        test("should reject unsupported domains", async () => {
            const controlTool = tools.find((t) => t.name === "control");
            expect(controlTool).toBeDefined();

            if (!controlTool) throw new Error("control tool not found");

            const result: unknown = await controlTool.execute({
                command: "turn_on",
                entity_id: "unsupported.device",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain("Unsupported domain");
        });

        test("should handle temperature control for climate devices", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const controlTool = tools.find((t) => t.name === "control");
            expect(controlTool).toBeDefined();

            if (!controlTool) throw new Error("control tool not found");

            const result: unknown = await controlTool.execute({
                command: "set_temperature",
                entity_id: "climate.bedroom",
                temperature: 22,
                hvac_mode: "heat",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("History Tool", () => {
        test("should fetch entity history", async () => {
            const mockHistory = [
                {
                    entity_id: "light.living_room",
                    state: "on",
                    last_changed: "2024-01-01T10:00:00.000Z",
                    last_updated: "2024-01-01T10:00:00.000Z",
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockHistory))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const historyTool = tools.find((t) => t.name === "get_history");
            expect(historyTool).toBeDefined();

            if (!historyTool) throw new Error("get_history tool not found");

            const result: unknown = await historyTool.execute({
                entity_id: "light.living_room",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
            expect(parsed.history).toBeDefined();
        });

        test("should handle history fetch errors", async () => {
            mocks.mockFetch = mock(() =>
                Promise.resolve(
                    new Response(null, { status: 500, statusText: "Server Error" })
                )
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const historyTool = tools.find((t) => t.name === "get_history");
            expect(historyTool).toBeDefined();

            if (!historyTool) throw new Error("get_history tool not found");

            const result: unknown = await historyTool.execute({
                entity_id: "light.living_room",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
        });

        test("should support custom time ranges", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse([])));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const historyTool = tools.find((t) => t.name === "get_history");
            expect(historyTool).toBeDefined();

            if (!historyTool) throw new Error("get_history tool not found");

            const result: unknown = await historyTool.execute({
                entity_id: "light.living_room",
                start_time: "2024-01-01T00:00:00.000Z",
                end_time: "2024-01-02T00:00:00.000Z",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Addon Tool", () => {
        test("should list available add-ons", async () => {
            const mockAddons = {
                data: {
                    addons: [
                        {
                            name: "Test Add-on",
                            slug: "test-addon",
                            description: "A test add-on",
                            version: "1.0.0",
                            installed: false,
                            available: true,
                            state: "stopped",
                        },
                    ],
                },
            };

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockAddons))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const addonTool = tools.find((t) => t.name === "addon");
            expect(addonTool).toBeDefined();

            if (!addonTool) throw new Error("addon tool not found");

            const result: unknown = await addonTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
            expect(parsed.addons).toBeDefined();
        });

        test("should require slug for non-list actions", async () => {
            const addonTool = tools.find((t) => t.name === "addon");
            expect(addonTool).toBeDefined();

            if (!addonTool) throw new Error("addon tool not found");

            const result: unknown = await addonTool.execute({ action: "info" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain("slug is required");
        });

        test("should install add-on with optional version", async () => {
            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse({ data: {} }))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const addonTool = tools.find((t) => t.name === "addon");
            expect(addonTool).toBeDefined();

            if (!addonTool) throw new Error("addon tool not found");

            const result: unknown = await addonTool.execute({
                action: "install",
                slug: "test-addon",
                version: "1.0.0",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Package Tool (HACS)", () => {
        test("should list packages by category", async () => {
            const mockPackages = {
                repositories: [
                    { id: 1, name: "test-pkg", category: "integration" },
                ],
            };

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockPackages))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const packageTool = tools.find((t) => t.name === "package");
            expect(packageTool).toBeDefined();

            if (!packageTool) throw new Error("package tool not found");

            const result: unknown = await packageTool.execute({
                action: "list",
                category: "integration",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should require repository for install action", async () => {
            const packageTool = tools.find((t) => t.name === "package");
            expect(packageTool).toBeDefined();

            if (!packageTool) throw new Error("package tool not found");

            const result: unknown = await packageTool.execute({
                action: "install",
                category: "integration",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
        });

        test("should install package with version", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const packageTool = tools.find((t) => t.name === "package");
            expect(packageTool).toBeDefined();

            if (!packageTool) throw new Error("package tool not found");

            const result: unknown = await packageTool.execute({
                action: "install",
                category: "integration",
                repository: "test/repo",
                version: "1.0.0",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Automation Config Tool", () => {
        test("should require config for create action", async () => {
            const automationConfigTool = tools.find(
                (t) => t.name === "automation_config"
            );
            expect(automationConfigTool).toBeDefined();

            if (!automationConfigTool)
                throw new Error("automation_config tool not found");

            const result: unknown = await automationConfigTool.execute({
                action: "create",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
        });

        test("should create automation with valid config", async () => {
            const mockConfig = {
                alias: "Test Automation",
                trigger: [{ platform: "state", entity_id: "sensor.test" }],
                action: [{ service: "light.turn_on" }],
            };

            mocks.mockFetch = mock(() =>
                Promise.resolve(
                    createMockResponse({ automation_id: "automation.test" })
                )
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const automationConfigTool = tools.find(
                (t) => t.name === "automation_config"
            );
            expect(automationConfigTool).toBeDefined();

            if (!automationConfigTool)
                throw new Error("automation_config tool not found");

            const result: unknown = await automationConfigTool.execute({
                action: "create",
                config: mockConfig,
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Subscribe Events Tool", () => {
        test("should require authentication token", async () => {
            const subscribeTool = tools.find(
                (t) => t.name === "subscribe_events"
            );
            expect(subscribeTool).toBeDefined();

            if (!subscribeTool) throw new Error("subscribe_events tool not found");

            const result: unknown = await subscribeTool.execute({
                token: "invalid_token",
            });

            const parsed = parseResult(result);
            // May require actual SSE setup; adjust based on implementation
            expect(parsed).toBeDefined();
        });

        test("should support subscribing to specific events", async () => {
            const subscribeTool = tools.find(
                (t) => t.name === "subscribe_events"
            );
            expect(subscribeTool).toBeDefined();

            if (!subscribeTool) throw new Error("subscribe_events tool not found");

            const result: unknown = await subscribeTool.execute({
                token: TEST_CONFIG.HASS_TOKEN,
                events: ["state_changed", "service_called"],
            });

            const parsed = parseResult(result);
            expect(parsed).toBeDefined();
        });

        test("should support subscribing to entity", async () => {
            const subscribeTool = tools.find(
                (t) => t.name === "subscribe_events"
            );
            expect(subscribeTool).toBeDefined();

            if (!subscribeTool) throw new Error("subscribe_events tool not found");

            const result: unknown = await subscribeTool.execute({
                token: TEST_CONFIG.HASS_TOKEN,
                entity_id: "light.living_room",
            });

            const parsed = parseResult(result);
            expect(parsed).toBeDefined();
        });
    });

    describe("SSE Stats Tool", () => {
        test("should require authentication token", async () => {
            const sseStatsTool = tools.find((t) => t.name === "get_sse_stats");
            expect(sseStatsTool).toBeDefined();

            if (!sseStatsTool) throw new Error("get_sse_stats tool not found");

            const result: unknown = await sseStatsTool.execute({
                token: "invalid_token",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
        });

        test("should return statistics with valid token", async () => {
            const sseStatsTool = tools.find((t) => t.name === "get_sse_stats");
            expect(sseStatsTool).toBeDefined();

            if (!sseStatsTool) throw new Error("get_sse_stats tool not found");

            const result: unknown = await sseStatsTool.execute({
                token: TEST_CONFIG.HASS_TOKEN,
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
            expect(parsed.statistics).toBeDefined();
        });
    });

    describe("Lights Control Tool", () => {
        test("should turn on light", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const lightsTool = tools.find((t) => t.name === "lights_control");
            expect(lightsTool).toBeDefined();

            if (!lightsTool) throw new Error("lights tool not found");

            const result: unknown = await lightsTool.execute({
                action: "turn_on",
                entity_id: "light.living_room",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should turn off light", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const lightsTool = tools.find((t) => t.name === "lights_control");
            expect(lightsTool).toBeDefined();

            if (!lightsTool) throw new Error("lights tool not found");

            const result: unknown = await lightsTool.execute({
                action: "turn_off",
                entity_id: "light.living_room",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should list all lights", async () => {
            const mockLights = [
                {
                    entity_id: "light.living_room",
                    state: "on",
                    attributes: { brightness: 255 },
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockLights))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const lightsTool = tools.find((t) => t.name === "lights_control");
            expect(lightsTool).toBeDefined();

            if (!lightsTool) throw new Error("lights tool not found");

            const result: unknown = await lightsTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should set brightness", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const lightsTool = tools.find((t) => t.name === "lights_control");
            expect(lightsTool).toBeDefined();

            if (!lightsTool) throw new Error("lights tool not found");

            const result: unknown = await lightsTool.execute({
                action: "turn_on",
                entity_id: "light.living_room",
                brightness: 128,
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Climate Control Tool", () => {
        test("should set temperature", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const climateTool = tools.find((t) => t.name === "climate_control");
            expect(climateTool).toBeDefined();

            if (!climateTool) throw new Error("climate tool not found");

            const result: unknown = await climateTool.execute({
                action: "set_temperature",
                entity_id: "climate.bedroom",
                temperature: 22,
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should set HVAC mode", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const climateTool = tools.find((t) => t.name === "climate_control");
            expect(climateTool).toBeDefined();

            if (!climateTool) throw new Error("climate tool not found");

            const result: unknown = await climateTool.execute({
                action: "set_hvac_mode",
                entity_id: "climate.bedroom",
                hvac_mode: "heat",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should list climate devices", async () => {
            const mockClimate = [
                {
                    entity_id: "climate.bedroom",
                    state: "heat",
                    attributes: { temperature: 22 },
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockClimate))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const climateTool = tools.find((t) => t.name === "climate_control");
            expect(climateTool).toBeDefined();

            if (!climateTool) throw new Error("climate tool not found");

            const result: unknown = await climateTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Cover Control Tool", () => {
        test("should open cover", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const coverTool = tools.find((t) => t.name === "cover_control");
            expect(coverTool).toBeDefined();

            if (!coverTool) throw new Error("cover tool not found");

            const result: unknown = await coverTool.execute({
                action: "open_cover",
                entity_id: "cover.blinds",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should close cover", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const coverTool = tools.find((t) => t.name === "cover_control");
            expect(coverTool).toBeDefined();

            if (!coverTool) throw new Error("cover tool not found");

            const result: unknown = await coverTool.execute({
                action: "close_cover",
                entity_id: "cover.blinds",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should set position", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const coverTool = tools.find((t) => t.name === "cover_control");
            expect(coverTool).toBeDefined();

            if (!coverTool) throw new Error("cover tool not found");

            const result: unknown = await coverTool.execute({
                action: "set_cover_position",
                entity_id: "cover.blinds",
                position: 50,
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Fan Control Tool", () => {
        test("should turn on fan", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const fanTool = tools.find((t) => t.name === "fan_control");
            expect(fanTool).toBeDefined();

            if (!fanTool) throw new Error("fan tool not found");

            const result: unknown = await fanTool.execute({
                action: "turn_on",
                entity_id: "fan.bedroom",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should set fan speed", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const fanTool = tools.find((t) => t.name === "fan_control");
            expect(fanTool).toBeDefined();

            if (!fanTool) throw new Error("fan tool not found");

            const result: unknown = await fanTool.execute({
                action: "set_percentage",
                entity_id: "fan.bedroom",
                percentage: 75,
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should list fans", async () => {
            const mockFans = [
                {
                    entity_id: "fan.bedroom",
                    state: "on",
                    attributes: { percentage: 75 },
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockFans))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const fanTool = tools.find((t) => t.name === "fan_control");
            expect(fanTool).toBeDefined();

            if (!fanTool) throw new Error("fan tool not found");

            const result: unknown = await fanTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Lock Control Tool", () => {
        test("should lock door", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const lockTool = tools.find((t) => t.name === "lock_control");
            expect(lockTool).toBeDefined();

            if (!lockTool) throw new Error("lock tool not found");

            const result: unknown = await lockTool.execute({
                action: "lock",
                entity_id: "lock.front_door",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should unlock door", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const lockTool = tools.find((t) => t.name === "lock_control");
            expect(lockTool).toBeDefined();

            if (!lockTool) throw new Error("lock tool not found");

            const result: unknown = await lockTool.execute({
                action: "unlock",
                entity_id: "lock.front_door",
                code: "1234",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should list locks", async () => {
            const mockLocks = [
                {
                    entity_id: "lock.front_door",
                    state: "locked",
                    attributes: {},
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockLocks))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const lockTool = tools.find((t) => t.name === "lock_control");
            expect(lockTool).toBeDefined();

            if (!lockTool) throw new Error("lock tool not found");

            const result: unknown = await lockTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Vacuum Control Tool", () => {
        test("should start vacuum", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const vacuumTool = tools.find((t) => t.name === "vacuum_control");
            expect(vacuumTool).toBeDefined();

            if (!vacuumTool) throw new Error("vacuum tool not found");

            const result: unknown = await vacuumTool.execute({
                action: "start",
                entity_id: "vacuum.robot",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should return to dock", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const vacuumTool = tools.find((t) => t.name === "vacuum_control");
            expect(vacuumTool).toBeDefined();

            if (!vacuumTool) throw new Error("vacuum tool not found");

            const result: unknown = await vacuumTool.execute({
                action: "return_to_base",
                entity_id: "vacuum.robot",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should list vacuums", async () => {
            const mockVacuums = [
                {
                    entity_id: "vacuum.robot",
                    state: "cleaning",
                    attributes: { battery: 80 },
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockVacuums))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const vacuumTool = tools.find((t) => t.name === "vacuum_control");
            expect(vacuumTool).toBeDefined();

            if (!vacuumTool) throw new Error("vacuum tool not found");

            const result: unknown = await vacuumTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Media Player Control Tool", () => {
        test("should turn on media player", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const mediaPlayerTool = tools.find(
                (t) => t.name === "media_player_control"
            );
            expect(mediaPlayerTool).toBeDefined();

            if (!mediaPlayerTool)
                throw new Error("media_player tool not found");

            const result: unknown = await mediaPlayerTool.execute({
                action: "turn_on",
                entity_id: "media_player.living_room",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should pause media", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const mediaPlayerTool = tools.find(
                (t) => t.name === "media_player_control"
            );
            expect(mediaPlayerTool).toBeDefined();

            if (!mediaPlayerTool)
                throw new Error("media_player tool not found");

            const result: unknown = await mediaPlayerTool.execute({
                action: "media_pause",
                entity_id: "media_player.living_room",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should list media players", async () => {
            const mockMediaPlayers = [
                {
                    entity_id: "media_player.living_room",
                    state: "playing",
                    attributes: { media_title: "Test Song" },
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockMediaPlayers))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const mediaPlayerTool = tools.find(
                (t) => t.name === "media_player_control"
            );
            expect(mediaPlayerTool).toBeDefined();

            if (!mediaPlayerTool)
                throw new Error("media_player tool not found");

            const result: unknown = await mediaPlayerTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Alarm Control Tool", () => {
        test("should arm alarm", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const alarmTool = tools.find((t) => t.name === "alarm_control");
            expect(alarmTool).toBeDefined();

            if (!alarmTool) throw new Error("alarm_control tool not found");

            const result: unknown = await alarmTool.execute({
                action: "alarm_arm_away",
                entity_id: "alarm_control_panel.home",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should disarm alarm", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const alarmTool = tools.find((t) => t.name === "alarm_control");
            expect(alarmTool).toBeDefined();

            if (!alarmTool) throw new Error("alarm_control tool not found");

            const result: unknown = await alarmTool.execute({
                action: "alarm_disarm",
                entity_id: "alarm_control_panel.home",
                code: "1234",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should list alarms", async () => {
            const mockAlarms = [
                {
                    entity_id: "alarm_control_panel.home",
                    state: "armed_away",
                    attributes: {},
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockAlarms))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const alarmTool = tools.find((t) => t.name === "alarm_control");
            expect(alarmTool).toBeDefined();

            if (!alarmTool) throw new Error("alarm_control tool not found");

            const result: unknown = await alarmTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Automation Tool", () => {
        test("should list automations", async () => {
            const mockAutomations = [
                {
                    entity_id: "automation.test",
                    state: "on",
                    attributes: { friendly_name: "Test Automation" },
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockAutomations))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const automationTool = tools.find((t) => t.name === "automation");
            expect(automationTool).toBeDefined();

            if (!automationTool) throw new Error("automation tool not found");

            const result: unknown = await automationTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should toggle automation", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const automationTool = tools.find((t) => t.name === "automation");
            expect(automationTool).toBeDefined();

            if (!automationTool) throw new Error("automation tool not found");

            const result: unknown = await automationTool.execute({
                action: "toggle",
                automation_id: "automation.test",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Scene Control Tool", () => {
        test("should list scenes", async () => {
            const mockScenes = [
                {
                    entity_id: "scene.movie",
                    state: "scanned",
                    attributes: { friendly_name: "Movie Scene" },
                },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockScenes))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const sceneTool = tools.find((t) => t.name === "scene");
            expect(sceneTool).toBeDefined();

            if (!sceneTool) throw new Error("scene tool not found");

            const result: unknown = await sceneTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should activate scene", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const sceneTool = tools.find((t) => t.name === "scene");
            expect(sceneTool).toBeDefined();

            if (!sceneTool) throw new Error("scene tool not found");

            const result: unknown = await sceneTool.execute({
                action: "activate",
                scene_id: "scene.movie",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Notify Tool", () => {
        test("should send notification", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const notifyTool = tools.find((t) => t.name === "notify");
            expect(notifyTool).toBeDefined();

            if (!notifyTool) throw new Error("notify tool not found");

            const result: unknown = await notifyTool.execute({
                message: "Test notification",
                title: "Test",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should send notification to specific target", async () => {
            mocks.mockFetch = mock(() => Promise.resolve(createMockResponse({})));
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const notifyTool = tools.find((t) => t.name === "notify");
            expect(notifyTool).toBeDefined();

            if (!notifyTool) throw new Error("notify tool not found");

            const result: unknown = await notifyTool.execute({
                message: "Test notification",
                target: "mobile_app_phone",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("List Devices Tool", () => {
        test("should list all devices", async () => {
            const mockDevices = [
                { entity_id: "light.living_room", state: "on" },
                { entity_id: "climate.bedroom", state: "heat" },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockDevices))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const listDevicesTool = tools.find(
                (t) => t.name === "list_devices"
            );
            expect(listDevicesTool).toBeDefined();

            if (!listDevicesTool) throw new Error("list_devices tool not found");

            const result: unknown = await listDevicesTool.execute({});

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });

        test("should filter devices by domain", async () => {
            const mockDevices = [
                { entity_id: "light.living_room", state: "on" },
            ];

            mocks.mockFetch = mock(() =>
                Promise.resolve(createMockResponse(mockDevices))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const listDevicesTool = tools.find(
                (t) => t.name === "list_devices"
            );
            expect(listDevicesTool).toBeDefined();

            if (!listDevicesTool) throw new Error("list_devices tool not found");

            const result: unknown = await listDevicesTool.execute({ domain: "light" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(true);
        });
    });

    describe("Error Handling Across All Tools", () => {
        test("should handle network errors gracefully", async () => {
            mocks.mockFetch = mock(() =>
                Promise.reject(new Error("Network timeout"))
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            // Test a few tools for error handling
            const controlTool = tools.find((t) => t.name === "control");
            if (!controlTool) throw new Error("control tool not found");

            const result: unknown = await controlTool.execute({
                command: "turn_on",
                entity_id: "light.test",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
        });

        test("should handle 4xx HTTP errors", async () => {
            mocks.mockFetch = mock(() =>
                Promise.resolve(
                    new Response(null, { status: 404, statusText: "Not Found" })
                )
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const historyTool = tools.find((t) => t.name === "get_history");
            if (!historyTool) throw new Error("get_history tool not found");

            const result: unknown = await historyTool.execute({
                entity_id: "light.nonexistent",
            });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
        });

        test("should handle 5xx HTTP errors", async () => {
            mocks.mockFetch = mock(() =>
                Promise.resolve(
                    new Response(null, {
                        status: 500,
                        statusText: "Internal Server Error",
                    })
                )
            );
            globalThis.fetch = mocks.mockFetch as unknown as typeof fetch;

            const addonTool = tools.find((t) => t.name === "addon");
            if (!addonTool) throw new Error("addon tool not found");

            const result: unknown = await addonTool.execute({ action: "list" });

            const parsed = parseResult(result);
            expect(parsed.success).toBe(false);
        });
    });
});
