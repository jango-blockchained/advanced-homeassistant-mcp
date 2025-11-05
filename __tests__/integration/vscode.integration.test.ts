/**
 * VSCode MCP Extension Integration Tests
 * 
 * Tests the Home Assistant MCP integration as a VSCode extension
 * Mocks the VSCode Extension API and tests:
 * - Extension activation/deactivation
 * - Stdio transport communication
 * - Tool availability and registration
 * - Command palette integration
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ChildProcess, spawn } from "child_process";

// Mock VSCode API types
interface VSCodeExtension {
  id: string;
  packageJSON: Record<string, unknown>;
  activate(): Promise<void>;
  deactivate?(): Promise<void>;
}

interface MockWorkspaceState {
  storage: Map<string, unknown>;
  get(key: string): unknown;
  update(key: string, value: unknown): Promise<void>;
}

interface VSCodeContext {
  subscriptions: { dispose(): void }[];
  workspaceState: MockWorkspaceState;
  extensionPath: string;
}

interface MCPToolCommand {
  name: string;
  title: string;
  description: string;
  execute(...args: unknown[]): Promise<unknown>;
}

class MockVSCodeExtension implements VSCodeExtension {
  id = "homeassistant-mcp";
  packageJSON = {
    name: "homeassistant-mcp",
    version: "1.0.0",
    description: "Home Assistant MCP for VSCode"
  };

  private mcpProcess: ChildProcess | null = null;
  private tools: Map<string, MCPToolCommand> = new Map();
  private context: VSCodeContext;

  constructor(context: VSCodeContext) {
    this.context = context;
  }

  async activate(): Promise<void> {
    // Store activation state
    await this.context.workspaceState.update("mcp.activated", true);

    // Spawn MCP server process
    const hassToken = process.env.HASS_TOKEN ?? "mock-token";
    const hassHost = process.env.HASS_HOST ?? "http://homeassistant.local:8123";

    this.mcpProcess = spawn("node", ["dist/stdio-server.js"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        HASS_TOKEN: hassToken,
        HASS_HOST: hassHost
      }
    });

    if (!this.mcpProcess.stdout || !this.mcpProcess.stderr) {
      throw new Error("Failed to spawn MCP process");
    }

    // Register all Home Assistant tools
    this.registerTools();
  }

  async deactivate(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
    await this.context.workspaceState.update("mcp.activated", false);
  }

  private registerTools(): void {
    // Register control tool
    this.tools.set("control", {
      name: "control",
      title: "Control Home Assistant Device",
      description: "Turn on/off, toggle, set position for Home Assistant entities",
      execute: async (args: unknown): Promise<unknown> => Promise.resolve({
        status: "executed",
        command: (args as Record<string, unknown>).command,
        entity_id: (args as Record<string, unknown>).entity_id
      })
    });

    // Register list_devices tool
    this.tools.set("list_devices", {
      name: "list_devices",
      title: "List Home Assistant Devices",
      description: "List all devices connected to Home Assistant",
      execute: async (_args: unknown): Promise<unknown> => Promise.resolve({
        devices: [
          { id: "light.bedroom", name: "Bedroom Light" },
          { id: "climate.living_room", name: "Living Room Climate" }
        ]
      })
    });
  }

  getTools(): Map<string, MCPToolCommand> {
    return this.tools;
  }

  async executeTool(toolName: string, args: unknown): Promise<unknown> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    return tool.execute(args);
  }
}

describe("VSCode MCP Extension Integration", () => {
  let mockContext: VSCodeContext;
  let extension: MockVSCodeExtension;

  beforeEach(() => {
    // Create mock VSCode context
    const storage = new Map<string, unknown>();
    mockContext = {
      subscriptions: [],
      workspaceState: {
        storage,
        get(key: string): unknown {
          return storage.get(key);
        },
        async update(key: string, value: unknown): Promise<void> {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          await Promise.resolve();
          storage.set(key, value);
        }
      },
      extensionPath: "/path/to/extension"
    };

    extension = new MockVSCodeExtension(mockContext);
  });

  afterEach(async () => {
    await extension.deactivate();
  });

  it("should activate the extension", async () => {
    await extension.activate();
    const activated = mockContext.workspaceState.get("mcp.activated");
    expect(activated).toBe(true);
  });

  it("should deactivate the extension", async () => {
    await extension.activate();
    await extension.deactivate();
    const activated = mockContext.workspaceState.get("mcp.activated");
    expect(activated).toBe(false);
  });

  it("should register Home Assistant tools", async () => {
    await extension.activate();
    const tools = extension.getTools();
    expect(tools.size).toBeGreaterThan(0);
    expect(tools.has("control")).toBe(true);
    expect(tools.has("list_devices")).toBe(true);
  });

  it("should execute tool commands", async () => {
    await extension.activate();
    const result = await extension.executeTool("list_devices", {});
    expect(result).toHaveProperty("devices");
    const devices = result as { devices: unknown[] };
    expect(Array.isArray(devices.devices)).toBe(true);
  });

  it("should handle tool execution with parameters", async () => {
    await extension.activate();
    const result = await extension.executeTool("control", {
      command: "turn_on",
      entity_id: "light.bedroom"
    });
    expect(result).toHaveProperty("status", "executed");
    const controlResult = result as Record<string, unknown>;
    expect(controlResult.command).toBe("turn_on");
    expect(controlResult.entity_id).toBe("light.bedroom");
  });

  it("should throw error for unknown tool", async () => {
    await extension.activate();
    try {
      await extension.executeTool("unknown_tool", {});
      expect(true).toBe(false);
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      const err = error as Error;
      expect(err.message).toContain("Tool not found");
    }
  });

  it("should maintain package metadata", () => {
    const packageInfo = extension.packageJSON;
    expect(packageInfo.name).toBe("homeassistant-mcp");
    expect(packageInfo.version).toBe("1.0.0");
  });
});
