import { describe, expect, test, beforeEach, mock } from "bun:test";
import { tools } from "../../src/tools/index.js";
import { createMockResponse } from "../utils/test-utils";
import { get_hass_safe } from "../../src/hass/index.js";

interface EntityStateResult {
  entity_id?: string;
  state?: string;
  last_changed?: string;
  last_updated?: string;
  attributes?: Record<string, unknown>;
}

const entityStateTool = tools.find((t) => t.name === "get_entity_state")!;

describe("get_entity_state tool", () => {
  beforeEach(async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse({})),
    ) as unknown as typeof fetch;
    const hass = await get_hass_safe();
    hass?.clearCache();
  });

  test("the tool is registered", () => {
    expect(entityStateTool).toBeDefined();
    expect(entityStateTool.name).toBe("get_entity_state");
  });

  test("returns the entity state from /api/states/{entity_id}", async () => {
    const upstream = {
      entity_id: "sensor.kitchen_temperature",
      state: "21.4",
      last_changed: "2024-01-01T00:00:00Z",
      last_updated: "2024-01-01T00:01:00Z",
      attributes: { unit_of_measurement: "°C", friendly_name: "Kitchen temp" },
    };
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse(upstream)),
    ) as unknown as typeof fetch;

    const raw = await entityStateTool.execute({
      entity_id: "sensor.kitchen_temperature",
      include_attributes: true,
    });
    const result = JSON.parse(raw as string) as EntityStateResult;

    expect(result.entity_id).toBe("sensor.kitchen_temperature");
    expect(result.state).toBe("21.4");
    expect(result.attributes).toEqual(upstream.attributes);
  });

  test("omits attributes when include_attributes is false", async () => {
    const upstream = {
      entity_id: "binary_sensor.motion_kitchen",
      state: "off",
      last_changed: "",
      last_updated: "",
      attributes: { friendly_name: "Motion" },
    };
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse(upstream)),
    ) as unknown as typeof fetch;

    const raw = await entityStateTool.execute({
      entity_id: "binary_sensor.motion_kitchen",
      include_attributes: false,
    });
    const result = JSON.parse(raw as string) as EntityStateResult;

    expect(result.entity_id).toBe("binary_sensor.motion_kitchen");
    expect(result.attributes).toBeUndefined();
  });

  test("propagates a UserError when the upstream call fails", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse({ message: "not found" }, 404)),
    ) as unknown as typeof fetch;

    await expect(
      entityStateTool.execute({
        entity_id: "sensor.does_not_exist",
        include_attributes: true,
      }),
    ).rejects.toThrow(/sensor\.does_not_exist/);
  });
});
