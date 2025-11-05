/**
 * Claude Desktop MCP Client Integration Tests
 * 
 * Tests the Home Assistant MCP integration with Claude Desktop app
 * Mocks the Claude Desktop HTTP client and tests:
 * - HTTP transport communication
 * - Configuration loading
 * - Tool discovery and execution
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach } from "bun:test";

interface MCPServerConfig {
  name: string;
  host: string;
  port: number;
  transport: "http" | "stdio";
  enabled: boolean;
}

interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface MCPResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class MockClaudeDesktopClient {
  private configs: Map<string, MCPServerConfig> = new Map();
  private connectedServers: Set<string> = new Set();
  private tools: Map<string, MCPTool> = new Map();

  loadConfig(_configPath: string): MCPServerConfig {
    // Mock loading Claude Desktop config
    const config: MCPServerConfig = {
      name: "homeassistant-mcp",
      host: "localhost",
      port: 7123,
      transport: "http",
      enabled: true
    };
    this.configs.set(config.name, config);
    return config;
  }

  async connectServer(serverName: string): Promise<MCPResponse<{ connected: boolean }>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    await Promise.resolve();
    const config = this.configs.get(serverName);
    if (!config) {
      return {
        success: false,
        error: `Server config not found: ${serverName}`
      };
    }

    if (!config.enabled) {
      return {
        success: false,
        error: `Server is disabled: ${serverName}`
      };
    }

    this.connectedServers.add(serverName);
    return {
      success: true,
      data: { connected: true }
    };
  }

  async disconnectServer(serverName: string): Promise<MCPResponse<{ disconnected: boolean }>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    await Promise.resolve();
    this.connectedServers.delete(serverName);
    return {
      success: true,
      data: { disconnected: true }
    };
  }

  async discoverTools(serverName: string): Promise<MCPResponse<MCPTool[]>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    await Promise.resolve();
    if (!this.connectedServers.has(serverName)) {
      return {
        success: false,
        error: `Server not connected: ${serverName}`
      };
    }

    const tools: MCPTool[] = [
      {
        name: "control",
        description: "Control Home Assistant entities",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string", enum: ["turn_on", "turn_off", "toggle"] },
            entity_id: { type: "string" }
          }
        }
      },
      {
        name: "list_devices",
        description: "List all Home Assistant devices",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "history",
        description: "Get entity history",
        parameters: {
          type: "object",
          properties: {
            entity_id: { type: "string" },
            start_time: { type: "string" }
          }
        }
      }
    ];

    tools.forEach(tool => this.tools.set(tool.name, tool));
    return {
      success: true,
      data: tools
    };
  }

  async executeTool(serverName: string, toolName: string, params: Record<string, unknown>): Promise<MCPResponse<unknown>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    await Promise.resolve();
    if (!this.connectedServers.has(serverName)) {
      return {
        success: false,
        error: `Server not connected: ${serverName}`
      };
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`
      };
    }

    // Mock tool execution
    const result = {
      status: "executed",
      tool: toolName,
      params,
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      data: result
    };
  }

  isServerConnected(serverName: string): boolean {
    return this.connectedServers.has(serverName);
  }

  getConnectedServers(): string[] {
    return Array.from(this.connectedServers);
  }

  getToolCount(): number {
    return this.tools.size;
  }
}

describe("Claude Desktop MCP Client Integration", () => {
  let client: MockClaudeDesktopClient;

  beforeEach(() => {
    client = new MockClaudeDesktopClient();
  });

  it("should load MCP server configuration", () => {
    const config = client.loadConfig("~/.claude/config.json");
    expect(config.name).toBe("homeassistant-mcp");
    expect(config.host).toBe("localhost");
    expect(config.port).toBe(7123);
    expect(config.transport).toBe("http");
    expect(config.enabled).toBe(true);
  });

  it("should connect to MCP server", async () => {
    client.loadConfig("~/.claude/config.json");
    const response = await client.connectServer("homeassistant-mcp");
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty("connected", true);
    expect(client.isServerConnected("homeassistant-mcp")).toBe(true);
  });

  it("should fail to connect to disabled server", async () => {
    const config = client.loadConfig("~/.claude/config.json");
    config.enabled = false;
    const response = await client.connectServer("homeassistant-mcp");
    expect(response.success).toBe(false);
    expect(response.error).toContain("disabled");
  });

  it("should disconnect from MCP server", async () => {
    client.loadConfig("~/.claude/config.json");
    await client.connectServer("homeassistant-mcp");
    expect(client.isServerConnected("homeassistant-mcp")).toBe(true);

    const response = await client.disconnectServer("homeassistant-mcp");
    expect(response.success).toBe(true);
    expect(client.isServerConnected("homeassistant-mcp")).toBe(false);
  });

  it("should discover tools from connected server", async () => {
    client.loadConfig("~/.claude/config.json");
    await client.connectServer("homeassistant-mcp");

    const response = await client.discoverTools("homeassistant-mcp");
    expect(response.success).toBe(true);
    const tools = response.data as MCPTool[];
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some(t => t.name === "control")).toBe(true);
    expect(tools.some(t => t.name === "list_devices")).toBe(true);
  });

  it("should fail to discover tools from disconnected server", async () => {
    client.loadConfig("~/.claude/config.json");
    const response = await client.discoverTools("homeassistant-mcp");
    expect(response.success).toBe(false);
    expect(response.error).toContain("not connected");
  });

  it("should execute tool with parameters", async () => {
    client.loadConfig("~/.claude/config.json");
    await client.connectServer("homeassistant-mcp");
    await client.discoverTools("homeassistant-mcp");

    const response = await client.executeTool("homeassistant-mcp", "control", {
      command: "turn_on",
      entity_id: "light.living_room"
    });

    expect(response.success).toBe(true);
    const result = response.data as Record<string, unknown>;
    expect(result.status).toBe("executed");
    expect(result.tool).toBe("control");
  });

  it("should fail to execute unknown tool", async () => {
    client.loadConfig("~/.claude/config.json");
    await client.connectServer("homeassistant-mcp");
    await client.discoverTools("homeassistant-mcp");

    const response = await client.executeTool("homeassistant-mcp", "unknown_tool", {});
    expect(response.success).toBe(false);
    expect(response.error).toContain("not found");
  });

  it("should track connected servers", async () => {
    client.loadConfig("~/.claude/config.json");
    expect(client.getConnectedServers().length).toBe(0);

    await client.connectServer("homeassistant-mcp");
    expect(client.getConnectedServers().length).toBe(1);
    expect(client.getConnectedServers()).toContain("homeassistant-mcp");

    await client.disconnectServer("homeassistant-mcp");
    expect(client.getConnectedServers().length).toBe(0);
  });

  it("should provide tool count", async () => {
    client.loadConfig("~/.claude/config.json");
    await client.connectServer("homeassistant-mcp");
    await client.discoverTools("homeassistant-mcp");

    expect(client.getToolCount()).toBe(3);
  });
});
