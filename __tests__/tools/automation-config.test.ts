import { describe, expect, test, beforeEach, mock } from "bun:test";
import { tools } from "../../src/tools/index.js";
import { createMockResponse } from "../utils/test-utils";

interface FastMcpToolResult {
  content?: Array<{ type: string; text: string }>;
}

interface ParsedTextPayload {
  success?: boolean;
  message?: string;
  automation_id?: string;
}

const automationConfigTool = tools.find((t) => t.name === "automation_config")!;

// The automation_config tool returns FastMCP-style `{content: [{type, text}]}`,
// where `text` is a JSON-encoded payload. This helper handles both the FastMCP
// wrapper and the plain JSON-string responses some branches return.
function extractPayload(result: unknown): ParsedTextPayload {
  if (typeof result === "string") return JSON.parse(result) as ParsedTextPayload;
  const wrapped = result as FastMcpToolResult;
  if (wrapped?.content?.[0]?.text) {
    return JSON.parse(wrapped.content[0].text) as ParsedTextPayload;
  }
  return result as ParsedTextPayload;
}

describe("automation_config tool", () => {
  beforeEach(() => {
    globalThis.fetch = mock(() =>
      Promise.resolve(createMockResponse({})),
    ) as unknown as typeof fetch;
  });

  test("the tool is registered", () => {
    expect(automationConfigTool).toBeDefined();
    expect(automationConfigTool.name).toBe("automation_config");
  });

  test("create requires a config object", async () => {
    const result = extractPayload(await automationConfigTool.execute({ action: "create" }));
    expect(result.success).toBe(false);
    expect(result.message?.toLowerCase()).toContain("config");
  });

  test("create posts the new config to /api/config/automation/config/{id}", async () => {
    // The source first does an existence-check GET that should 404 (so we
    // proceed to the create POST), then the actual POST.
    let call = 0;
    globalThis.fetch = mock((_url: string, _init?: RequestInit) => {
      call += 1;
      if (call === 1) {
        return Promise.resolve(createMockResponse({}, 404));
      }
      return Promise.resolve(createMockResponse({ automation_id: "1700000000000" }));
    }) as unknown as typeof fetch;

    const result = extractPayload(
      await automationConfigTool.execute({
        action: "create",
        config: {
          alias: "Test automation",
          trigger: [{ platform: "state", entity_id: "light.kitchen" }],
          action: [{ service: "light.toggle", target: { entity_id: "light.kitchen" } }],
        },
      }),
    );

    expect(result.success).toBe(true);
    expect(result.automation_id).toBeDefined();
  });

  test("update requires automation_id and config", async () => {
    const result = extractPayload(
      await automationConfigTool.execute({ action: "update", automation_id: "abc" }),
    );
    expect(result.success).toBe(false);
    expect(result.message?.toLowerCase()).toContain("required");
  });
});
