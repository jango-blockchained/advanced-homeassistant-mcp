import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { getExposedTools, tools } from "../../src/tools/index.js";
import { codeModeExecuteTool, codeModeSearchTool } from "../../src/codemode/tools.js";
import { getCodeModeConfig, getCodeModeMode } from "../../src/codemode/config.js";
import type { CodeModeConfig } from "../../src/codemode/config.js";
import { createHostBridge } from "../../src/codemode/bridge.js";
import { CodeModeTimeoutError, runInSandbox } from "../../src/codemode/sandbox.js";

const ORIGINAL_CODE_MODE = process.env.CODE_MODE;
const ORIGINAL_TIMEOUT = process.env.CODE_MODE_TIMEOUT_MS;
const ORIGINAL_MAX_OUTPUT = process.env.CODE_MODE_MAX_OUTPUT_BYTES;
const ORIGINAL_MAX_HOST_CALLS = process.env.CODE_MODE_MAX_HOST_CALLS;
const ORIGINAL_MAX_CONCURRENT = process.env.CODE_MODE_MAX_CONCURRENT;

interface FetchCall {
  url: string;
  method: string;
  body?: string;
}

let fetchCalls: FetchCall[] = [];
let mockFetch: ReturnType<typeof mock>;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetch(): void {
  fetchCalls = [];
  mockFetch = mock((input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    if (url.endsWith("/api/states")) {
      return Promise.resolve(
        jsonResponse([
          {
            entity_id: "light.kitchen",
            state: "on",
            attributes: { brightness: 128 },
            last_changed: "2024-01-01T00:00:00Z",
            last_updated: "2024-01-01T00:00:00Z",
          },
          {
            entity_id: "climate.bedroom",
            state: "heat",
            attributes: {},
            last_changed: "2024-01-01T00:00:00Z",
            last_updated: "2024-01-01T00:00:00Z",
          },
        ]),
      );
    }
    if (url.includes("/api/states/light.kitchen")) {
      return Promise.resolve(
        jsonResponse({
          entity_id: "light.kitchen",
          state: "on",
          attributes: {},
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        }),
      );
    }
    if (url.endsWith("/api/services/light/turn_on")) {
      return Promise.resolve(jsonResponse({ ok: true }));
    }
    if (url.endsWith("/api/config")) {
      return Promise.resolve(jsonResponse({ version: "2024.1.0" }));
    }
    return Promise.resolve(jsonResponse({}));
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
}

describe("Code Mode", () => {
  beforeEach(() => {
    installFetch();
    process.env.HASS_HOST = "http://homeassistant.local:8123";
    process.env.HASS_TOKEN = "test_token";
    process.env.CODE_MODE = "only";
  });

  afterEach(() => {
    if (ORIGINAL_CODE_MODE === undefined) delete process.env.CODE_MODE;
    else process.env.CODE_MODE = ORIGINAL_CODE_MODE;
    if (ORIGINAL_TIMEOUT === undefined) delete process.env.CODE_MODE_TIMEOUT_MS;
    else process.env.CODE_MODE_TIMEOUT_MS = ORIGINAL_TIMEOUT;
    if (ORIGINAL_MAX_OUTPUT === undefined) delete process.env.CODE_MODE_MAX_OUTPUT_BYTES;
    else process.env.CODE_MODE_MAX_OUTPUT_BYTES = ORIGINAL_MAX_OUTPUT;
    if (ORIGINAL_MAX_HOST_CALLS === undefined) delete process.env.CODE_MODE_MAX_HOST_CALLS;
    else process.env.CODE_MODE_MAX_HOST_CALLS = ORIGINAL_MAX_HOST_CALLS;
    if (ORIGINAL_MAX_CONCURRENT === undefined) delete process.env.CODE_MODE_MAX_CONCURRENT;
    else process.env.CODE_MODE_MAX_CONCURRENT = ORIGINAL_MAX_CONCURRENT;
  });

  describe("configuration", () => {
    test("parses off, only, and both", () => {
      process.env.CODE_MODE = "off";
      expect(getCodeModeMode()).toBe("off");
      process.env.CODE_MODE = "only";
      expect(getCodeModeMode()).toBe("only");
      process.env.CODE_MODE = "both";
      expect(getCodeModeMode()).toBe("both");
      process.env.CODE_MODE = "true";
      expect(getCodeModeMode()).toBe("only");
      process.env.CODE_MODE = "nonsense";
      expect(getCodeModeMode()).toBe("off");
    });

    test("exposes the right tool list per mode", () => {
      process.env.CODE_MODE = "off";
      expect(getExposedTools()).toHaveLength(tools.length);

      process.env.CODE_MODE = "only";
      expect(getExposedTools().map((tool) => tool.name)).toEqual(["search", "execute"]);

      process.env.CODE_MODE = "both";
      expect(getExposedTools()).toHaveLength(tools.length + 2);
    });

    test("reads limits from the environment", () => {
      process.env.CODE_MODE_TIMEOUT_MS = "1234";
      process.env.CODE_MODE_MAX_OUTPUT_BYTES = "2048";
      process.env.CODE_MODE_MAX_HOST_CALLS = "7";
      process.env.CODE_MODE_MAX_CONCURRENT = "2";
      const config = getCodeModeConfig();
      expect(config.timeoutMs).toBe(1234);
      expect(config.maxOutputBytes).toBe(2048);
      expect(config.maxHostCalls).toBe(7);
      expect(config.maxConcurrent).toBe(2);
    });

    test("filters tools disabled by TOOL_<NAME>_DISABLED", () => {
      process.env.CODE_MODE = "off";
      process.env.TOOL_LIGHTS_DISABLED = "true";
      try {
        expect(getExposedTools().some((tool) => tool.name === "lights")).toBe(false);
      } finally {
        delete process.env.TOOL_LIGHTS_DISABLED;
      }
    });
  });

  describe("search", () => {
    test("filters the catalog without returning it wholesale", async () => {
      const result = await codeModeSearchTool.execute({
        code: `async () => spec.tools
          .filter((tool) => /light/i.test(tool.name + " " + tool.description))
          .map((tool) => tool.name)`,
      });

      expect(typeof result).toBe("string");
      const names = JSON.parse(result as string) as string[];
      expect(names).toContain("lights");
      expect(names).toContain("lights_activate");
      expect(names).not.toContain("climate_activate");
    });

    test("cannot reach Home Assistant", async () => {
      await expect(
        codeModeSearchTool.execute({
          code: `async () => hass.getStates()`,
        }),
      ).rejects.toThrow(/not available in search/);
    });
  });

  describe("execute", () => {
    test("calls the Home Assistant SDK", async () => {
      const result = await codeModeExecuteTool.execute({
        code: `async () => {
          const states = await hass.getStates();
          return states.map((state) => state.entity_id);
        }`,
      });

      expect(JSON.parse(result as string)).toEqual(["light.kitchen", "climate.bedroom"]);
      expect(fetchCalls.some((call) => call.url.endsWith("/api/states"))).toBe(true);
    });

    test("calls classic tools through tools.call", async () => {
      const result = await codeModeExecuteTool.execute({
        code: `async () => tools.call("get_entity_state", { entity_id: "light.kitchen" })`,
      });

      expect(JSON.parse(result as string)).toMatchObject({
        entity_id: "light.kitchen",
        state: "on",
      });
    });

    test("calls raw REST endpoints under /api", async () => {
      const result = await codeModeExecuteTool.execute({
        code: `async () => hass.request({ method: "GET", path: "/api/config" })`,
      });

      expect(JSON.parse(result as string)).toMatchObject({ version: "2024.1.0" });
    });

    test("rejects cross-origin raw requests", async () => {
      await expect(
        codeModeExecuteTool.execute({
          code: `async () => hass.request({ method: "GET", path: "http://evil.example/api/config" })`,
        }),
      ).rejects.toThrow(/path must start with \/api\//);
    });

    test("rejects recursive Code Mode calls", async () => {
      await expect(
        codeModeExecuteTool.execute({
          code: `async () => tools.call("execute", { code: "async () => 1" })`,
        }),
      ).rejects.toThrow(/cannot be called from inside execute/);
    });

    test("validates the code argument", async () => {
      await expect(codeModeExecuteTool.execute({} as never)).rejects.toThrow(
        /Invalid Code Mode parameters/,
      );
    });
  });

  describe("sandbox", () => {
    const baseOptions = {
      bridge: (): Promise<null> => Promise.resolve(null),
      timeoutMs: 2_000,
      maxOutputBytes: 10_000,
      memoryLimitBytes: 32 * 1024 * 1024,
      maxStackSizeBytes: 1024 * 1024,
    };

    test("has no host globals", async () => {
      const result = await runInSandbox({
        ...baseOptions,
        code: `async () => ({
          process: typeof process,
          require: typeof require,
          fetch: typeof fetch,
          glob: typeof globalThis.process,
        })`,
      });

      expect(result.value).toEqual({
        process: "undefined",
        require: "undefined",
        fetch: "undefined",
        glob: "undefined",
      });
    });

    test("enforces the output limit", async () => {
      await expect(
        runInSandbox({
          ...baseOptions,
          maxOutputBytes: 100,
          code: `async () => "x".repeat(500)`,
        }),
      ).rejects.toThrow(/limit is 100 bytes/);
    });

    test("measures the output limit in UTF-8 bytes, not characters", async () => {
      // "é" is 2 bytes in UTF-8: 6 chars = 12 bytes, which exceeds a
      // 10-byte limit even though the string length is only 6.
      await expect(
        runInSandbox({
          ...baseOptions,
          maxOutputBytes: 10,
          code: `async () => "é".repeat(6)`,
        }),
      ).rejects.toThrow(/limit is 10 bytes/);
    });

    test("rejects host calls beyond the per-execution budget", async () => {
      const config: CodeModeConfig = {
        mode: "only",
        timeoutMs: 2_000,
        maxOutputBytes: 10_000,
        memoryLimitBytes: 32 * 1024 * 1024,
        maxStackSizeBytes: 1024 * 1024,
        allowToolCalls: true,
        allowRawHttp: true,
        maxHostCalls: 2,
        maxConcurrent: 4,
      };
      const bridge = createHostBridge(config);
      const context = { deadline: Date.now() + 2_000, signal: new AbortController().signal };

      await expect(bridge("nope.op", null, context)).rejects.toThrow(/Unknown Code Mode operation/);
      await expect(bridge("nope.op", null, context)).rejects.toThrow(/Unknown Code Mode operation/);
      await expect(bridge("nope.op", null, context)).rejects.toThrow(
        /host call limit \(2\) exceeded for this execution/,
      );
    });

    test("surfaces CodeModeTimeoutError for in-flight host calls at the deadline", async () => {
      await expect(
        runInSandbox({
          ...baseOptions,
          timeoutMs: 150,
          bridge: () => new Promise(() => {}),
          code: `async () => sleep(10_000)`,
        }),
      ).rejects.toBeInstanceOf(CodeModeTimeoutError);
    });

    test("times out infinite loops", async () => {
      await expect(
        runInSandbox({
          ...baseOptions,
          timeoutMs: 150,
          code: `async () => { while (true) {} }`,
        }),
      ).rejects.toBeInstanceOf(CodeModeTimeoutError);
    });

    test("times out pending promises", async () => {
      await expect(
        runInSandbox({
          ...baseOptions,
          timeoutMs: 150,
          code: `async () => new Promise(() => {})`,
        }),
      ).rejects.toBeInstanceOf(CodeModeTimeoutError);
    });

    test("completes many sequential host calls without corrupting the sandbox", async () => {
      // Regression: sequential asyncified host calls unwind through whatever
      // export executes them. Draining QuickJS jobs through the synchronous
      // executePendingJobs FFI corrupted the asyncify state machine after a
      // few iterations (timeouts / OOB / context ref-count aborts).
      let bridgeCalls = 0;
      const bridge = () => {
        bridgeCalls += 1;
        return Promise.resolve([{ entity_id: "light.kitchen", state: "on", attributes: {} }]);
      };
      const result = await runInSandbox({
        ...baseOptions,
        timeoutMs: 5_000,
        bridge,
        code: `async () => {
          let total = 0;
          for (let i = 0; i < 10; i++) {
            const states = await hass.getStates();
            total += states.length;
          }
          return total;
        }`,
      });
      expect(result.value).toBe(10);
      expect(bridgeCalls).toBe(10);
    });

    test("completes many sequential host calls on a macrotask bridge", async () => {
      let bridgeCalls = 0;
      const bridge = () =>
        new Promise((resolve) => {
          setTimeout(() => {
            bridgeCalls += 1;
            resolve([{ entity_id: "light.kitchen", state: "on", attributes: {} }]);
          }, 1);
        });
      const result = await runInSandbox({
        ...baseOptions,
        timeoutMs: 5_000,
        bridge,
        code: `async () => {
          let total = 0;
          for (let i = 0; i < 10; i++) {
            const states = await hass.getStates();
            total += states.length;
          }
          return total;
        }`,
      });
      expect(result.value).toBe(10);
      expect(bridgeCalls).toBe(10);
    });

    test("completes CPU-bound pure-JS work", async () => {
      const result = await runInSandbox({
        ...baseOptions,
        code: `async () => {
          let x = 0;
          for (let i = 0; i < 200000; i++) {
            x = (x * 31 + i) % 1000003;
          }
          return x;
        }`,
      });
      expect(typeof result.value).toBe("number");
    });
  });
});
