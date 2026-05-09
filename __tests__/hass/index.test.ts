/**
 * Smoke test for the get_hass / get_hass_safe wrappers in src/hass/index.ts.
 *
 * The previous version replaced the entire hass/index.js module via
 * `mock.module(...)`. That mock persisted across files in the same bun
 * process and leaked into every later test that imports `hass/index.js`
 * (tool tests, the api test, etc.), making the suite order-dependent. We
 * now exercise the real exports against a mocked global.fetch instead.
 */

import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { get_hass_safe } from "../../src/hass/index.js";

const originalFetch = globalThis.fetch;
const originalToken = process.env.HASS_TOKEN;

describe("Home Assistant Integration", () => {
  beforeEach(() => {
    process.env.HASS_TOKEN = "test_token_for_testing";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.HASS_TOKEN = originalToken;
  });

  test("get_hass_safe yields an instance with the expected method surface", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("[]", { status: 200 })),
    ) as unknown as typeof fetch;

    const hass = await get_hass_safe();
    expect(hass).not.toBeNull();
    expect(typeof hass!.getStates).toBe("function");
    expect(typeof hass!.getState).toBe("function");
    expect(typeof hass!.callService).toBe("function");
  });

  test("get_hass_safe returns the same singleton on repeat calls", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("[]", { status: 200 })),
    ) as unknown as typeof fetch;

    const a = await get_hass_safe();
    const b = await get_hass_safe();
    expect(a).toBe(b);
  });
});
