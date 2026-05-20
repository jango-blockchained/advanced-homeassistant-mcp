import { describe, expect, test } from "bun:test";
import { Tool as IndexTool } from "../../src/types/index.js";
import { tools as indexTools } from "../../src/tools/index.js";

// The previous version of this file mocked a `liteMcpInstance` that no longer
// exists (the project moved off `litemcp` and onto its own MCPServer in
// src/mcp/MCPServer.ts). Since `__tests__/server.test.ts` already covers the
// "import src/index without crashing" path, all this file needs to do is
// guard the tool registry shape.

describe("Home Assistant MCP Server tool registry", () => {
  test("registers list_devices and control tools", () => {
    const toolNames = indexTools.map((tool: IndexTool) => tool.name);
    expect(toolNames).toContain("list_devices");
    expect(toolNames).toContain("control");
  });

  test("list_devices description references devices", () => {
    const listDevicesTool = indexTools.find(
      (tool: IndexTool) => tool.name === "list_devices",
    );
    expect(listDevicesTool).toBeDefined();
    // toContain rather than toBe — descriptions get edited for clarity over
    // time and exact-match assertions break on cosmetic changes.
    expect(listDevicesTool?.description).toContain("List all available Home Assistant devices");
  });

  test("control description references devices and services", () => {
    const controlTool = indexTools.find((tool: IndexTool) => tool.name === "control");
    expect(controlTool).toBeDefined();
    expect(controlTool?.description).toContain("Control Home Assistant devices and services");
  });
});
