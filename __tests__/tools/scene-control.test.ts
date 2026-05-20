import { describe, expect, test, beforeEach, mock } from "bun:test";
import { tools } from "../../src/tools/index.js";
import { createMockResponse } from "../utils/test-utils";
import { get_hass_safe } from "../../src/hass/index.js";

interface SceneListResult {
  success: boolean;
  scenes?: Array<{ entity_id: string; name?: string; description?: string }>;
  total_count?: number;
  message?: string;
}

interface SceneActivateResult {
  success: boolean;
  scene_id?: string;
  message?: string;
}

const sceneTool = tools.find((t) => t.name === "scene")!;

describe("scene tool", () => {
  beforeEach(async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse({})),
    ) as unknown as typeof fetch;
    // The hass module returns a process-singleton with a cache; without
    // clearing it, getStates() returns whatever a previous test populated.
    const hass = await get_hass_safe();
    hass?.clearCache();
  });

  test("the tool is registered", () => {
    expect(sceneTool).toBeDefined();
    expect(sceneTool.name).toBe("scene");
  });

  test("list returns scenes filtered from /api/states", async () => {
    const states = [
      {
        entity_id: "scene.movie_night",
        state: "scening",
        attributes: { friendly_name: "Movie night" },
      },
      // Non-scene entries must be filtered out.
      { entity_id: "light.kitchen", state: "off", attributes: {} },
    ];
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse(states)),
    ) as unknown as typeof fetch;

    const raw = await sceneTool.execute({ action: "list" });
    const result = JSON.parse(raw as string) as SceneListResult;

    expect(result.success).toBe(true);
    expect(result.total_count).toBe(1);
    expect(result.scenes?.[0]?.entity_id).toBe("scene.movie_night");
    expect(result.scenes?.[0]?.name).toBe("Movie night");
  });

  test("activate calls scene.turn_on with the scene entity_id", async () => {
    const fetchMock = mock(() => Promise.resolve(createMockResponse({})));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const raw = await sceneTool.execute({
      action: "activate",
      scene_id: "scene.movie_night",
    });
    const result = JSON.parse(raw as string) as SceneActivateResult;

    expect(result.success).toBe(true);
    expect(result.scene_id).toBe("scene.movie_night");

    const url = fetchMock.mock.calls[0]?.[0] as unknown as string;
    const init = fetchMock.mock.calls[0]?.[1] as unknown as RequestInit;
    expect(url).toContain("/api/services/scene/turn_on");
    expect(JSON.parse(init.body as string)).toEqual({ entity_id: "scene.movie_night" });
  });

  test("activate without scene_id surfaces success:false", async () => {
    const raw = await sceneTool.execute({ action: "activate" });
    const result = JSON.parse(raw as string) as SceneActivateResult;
    expect(result.success).toBe(false);
    expect(result.message?.toLowerCase()).toContain("scene id is required");
  });
});
