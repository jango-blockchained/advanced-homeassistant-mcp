/**
 * Tests for HomeAssistantAPI in src/hass/index.ts.
 *
 * Exercises the real class via `get_hass()` with a mocked global.fetch so we
 * verify the actual URL/method/auth shape the source produces, not a stub.
 *
 * The hass module memoizes a singleton, so we re-instantiate via the
 * constructor on the singleton's prototype to keep the cache from leaking
 * between tests.
 */

import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { createMockResponse } from "../utils/test-utils";
// Import the class directly. Going through `get_hass()` here would resolve
// the singleton, which other test files (e.g. hass/index.test.ts) replace
// via `mock.module` — that mock leaks across files within the same bun
// process and breaks `instance.constructor`-based instantiation.
import { HomeAssistantAPI } from "../../src/hass/index.js";

function freshClient(): HomeAssistantAPI {
  return new HomeAssistantAPI(false);
}

const originalFetch = globalThis.fetch;

describe("HomeAssistantAPI", () => {
  beforeEach(() => {
    process.env.HASS_HOST = "http://localhost:8123";
    process.env.HASS_TOKEN = "test_token_for_testing";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("getStates() GETs /api/states with bearer auth", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        createMockResponse([{ entity_id: "light.kitchen", state: "on", attributes: {} }]),
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const hass = freshClient();
    const states = await hass.getStates();

    expect(states).toHaveLength(1);
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0][0]).toBe("http://localhost:8123/api/states");
    expect((calls[0][1].headers as Record<string, string>).Authorization).toBe(
      "Bearer test_token_for_testing",
    );
  });

  test("getStates() returns the cached value on a repeat call within TTL", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(createMockResponse([{ entity_id: "light.x", state: "on", attributes: {} }])),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const hass = freshClient();
    await hass.getStates();
    await hass.getStates();

    expect(fetchMock.mock.calls.length).toBe(1);
  });

  test("getState() GETs /api/states/{entity_id}", async () => {
    const entity = { entity_id: "light.kitchen", state: "off", attributes: {} };
    const fetchMock = mock(() => Promise.resolve(createMockResponse(entity)));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const hass = freshClient();
    const result = await hass.getState("light.kitchen");

    expect(result).toEqual(entity);
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0][0]).toBe("http://localhost:8123/api/states/light.kitchen");
  });

  test("callService() POSTs JSON to /api/services/{domain}/{service}", async () => {
    const fetchMock = mock(() => Promise.resolve(createMockResponse({})));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const hass = freshClient();
    await hass.callService("light", "turn_on", {
      entity_id: "light.kitchen",
      brightness: 200,
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0][0]).toBe("http://localhost:8123/api/services/light/turn_on");
    expect(calls[0][1].method).toBe("POST");
    expect(JSON.parse(calls[0][1].body as string)).toEqual({
      entity_id: "light.kitchen",
      brightness: 200,
    });
  });

  test("getStates() rejects when fetch returns a non-2xx", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse({ message: "boom" }, 500)),
    ) as unknown as typeof fetch;

    const hass = freshClient();
    await expect(hass.getStates()).rejects.toThrow(/500/);
  });

  test("callService() rejects when fetch throws", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("network down")),
    ) as unknown as typeof fetch;

    const hass = freshClient();
    await expect(hass.callService("light", "turn_on", { entity_id: "light.x" })).rejects.toThrow(
      "network down",
    );
  });
});
