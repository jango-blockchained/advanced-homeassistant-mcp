import { describe, expect, test, beforeEach, mock } from "bun:test";
import { tools } from "../../src/tools/index.js";
import { createMockResponse } from "../utils/test-utils";
import { get_hass_safe } from "../../src/hass/index.js";

interface AutomationResult {
  success: boolean;
  message?: string;
  automation_id?: string;
  action?: string;
  automations?: Array<Record<string, unknown>>;
  total_count?: number;
}

const automationTool = tools.find((t) => t.name === "automation")!;

function parseResult(result: unknown): AutomationResult {
  return JSON.parse(result as string) as AutomationResult;
}

describe("automation tool", () => {
  beforeEach(async () => {
    // Default fetch mock just returns an empty success body. Individual tests
    // override `globalThis.fetch` for the call shapes they actually exercise.
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse({})),
    ) as unknown as typeof fetch;
    // Clear the hass singleton's cache so getStates() doesn't return data
    // populated by an earlier test.
    const hass = await get_hass_safe();
    hass?.clearCache();
  });

  test("the tool is registered with the expected schema", () => {
    expect(automationTool).toBeDefined();
    expect(automationTool.name).toBe("automation");
    expect(typeof automationTool.execute).toBe("function");
  });

  test("list returns automations from /api/states filtered by domain", async () => {
    const states = [
      {
        entity_id: "automation.morning_lights",
        state: "on",
        attributes: { friendly_name: "Morning lights", id: "abc", last_triggered: null },
      },
      // Non-automation entries must be filtered out.
      { entity_id: "light.kitchen", state: "off", attributes: {} },
    ];
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse(states)),
    ) as unknown as typeof fetch;

    const result = parseResult(await automationTool.execute({ action: "list" }));
    expect(result.success).toBe(true);
    expect(result.total_count).toBe(1);
    expect(result.automations?.[0]?.entity_id).toBe("automation.morning_lights");
    expect(result.automations?.[0]?.name).toBe("Morning lights");
  });

  test("toggle calls the automation/toggle service for the given entity", async () => {
    const fetchMock = mock(() => Promise.resolve(createMockResponse({})));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = parseResult(
      await automationTool.execute({
        action: "toggle",
        automation_id: "automation.morning_lights",
      }),
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("toggle");
    expect(result.automation_id).toBe("automation.morning_lights");

    const calls = fetchMock.mock.calls;
    const url = calls[0]?.[0] as unknown as string;
    const init = calls[0]?.[1] as unknown as RequestInit;
    expect(url).toContain("/api/services/automation/toggle");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ entity_id: "automation.morning_lights" });
  });

  test("trigger calls the automation/trigger service for the given entity", async () => {
    const fetchMock = mock(() => Promise.resolve(createMockResponse({})));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = parseResult(
      await automationTool.execute({
        action: "trigger",
        automation_id: "automation.morning_lights",
      }),
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("trigger");
    expect((fetchMock.mock.calls[0]?.[0] as unknown as string)).toContain(
      "/api/services/automation/trigger",
    );
  });

  test("toggle/trigger without automation_id returns success:false with a clear message", async () => {
    const result = parseResult(await automationTool.execute({ action: "toggle" }));
    expect(result.success).toBe(false);
    expect(result.message).toContain("Automation ID is required");
  });
});
