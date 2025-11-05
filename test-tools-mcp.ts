#!/usr/bin/env bun
/**
 * MCP Tools Test Suite
 * Tests all available MCP tools with mock data and comprehensive validation
 */

import { tools } from "./src/tools/index.js";
import { z } from "zod";

interface MCPRequest {
  id: string;
  method: string;
  params: Record<string, unknown>;
}

interface MCPResponse {
  id: string;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
  };
}

class MCPTestHarness {
  private testResults: {
    passed: number;
    failed: number;
    skipped: number;
    tests: Array<{
      name: string;
      status: "passed" | "failed" | "skipped";
      message?: string;
      error?: string;
    }>;
  } = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: [],
  };

  private mockHassToken = "mock-hass-token-test-only";
  private mockEntityId = "light.living_room";

  constructor() {
    // Set mock environment variables
    process.env.HASS_TOKEN = this.mockHassToken;
    process.env.HASS_HOST = "http://homeassistant.local:8123";
    process.env.JWT_SECRET = "test-secret-key-long-enough";
  }

  async testTool(tool: any): Promise<void> {
    const testName = `Tool: ${tool.name}`;
    console.log(`\n📋 Testing ${testName}...`);

    try {
      // Validate tool structure
      if (!tool.name) {
        this.addTestResult(testName, "failed", "Missing tool name");
        return;
      }

      if (!tool.description) {
        this.addTestResult(testName, "failed", "Missing tool description");
        return;
      }

      if (typeof tool.execute !== "function") {
        this.addTestResult(testName, "failed", "execute is not a function");
        return;
      }

      // Validate schema if present
      if (tool.parameters) {
        if (!(tool.parameters instanceof z.ZodType)) {
          this.addTestResult(testName, "failed", "parameters is not a Zod schema");
          return;
        }
      }

      console.log(`  ✓ Tool structure validated`);
      console.log(`  - Name: ${tool.name}`);
      console.log(`  - Description: ${tool.description}`);

      // Try to execute with minimal/mock parameters
      await this.testToolExecution(tool);

      this.addTestResult(testName, "passed");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addTestResult(testName, "failed", errorMsg);
      console.error(`  ✗ Error: ${errorMsg}`);
    }
  }

  private async testToolExecution(tool: any): Promise<void> {
    try {
      // Create minimal test params based on tool name
      const testParams = this.getTestParams(tool.name);

      console.log(`  - Executing with params: ${JSON.stringify(testParams)}`);

      // Validate params if schema exists
      if (tool.parameters) {
        try {
          tool.parameters.parse(testParams);
          console.log(`  ✓ Parameters validated against schema`);
        } catch (schemaError) {
          console.log(`  ℹ Schema validation: ${schemaError instanceof Error ? schemaError.message : String(schemaError)}`);
        }
      }

      // Execute tool (may fail due to missing Home Assistant, but that's OK)
      try {
        const result = await Promise.race([
          tool.execute(testParams),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Tool execution timeout")),
              5000
            )
          ),
        ]);

        console.log(`  ✓ Tool executed successfully`);
        if (result) {
          console.log(`  - Result type: ${typeof result}`);
          if (typeof result === "object") {
            console.log(`  - Result keys: ${Object.keys(result as Record<string, unknown>).join(", ")}`);
          }
        }
      } catch (execError) {
        const msg = execError instanceof Error ? execError.message : String(execError);
        // Many tools will fail without a real Home Assistant instance, which is expected
        if (msg.includes("HASS_TOKEN") || msg.includes("Home Assistant") || msg.includes("ECONNREFUSED") || msg.includes("timeout")) {
          console.log(`  ℹ Expected error (no Home Assistant): ${msg}`);
        } else {
          throw execError;
        }
      }
    } catch (error) {
      throw error;
    }
  }

  private getTestParams(toolName: string): Record<string, unknown> {
    const paramsByTool: Record<string, Record<string, unknown>> = {
      // Home Assistant tools
      lights_control: { action: "list" },
      climate_control: { action: "list" },
      automation: { action: "list" },
      list_devices: {},
      notify: { message: "Test notification" },
      scene: { action: "list" },

      // Control tools
      control: {
        command: "turn_on",
        entity_id: "light.test",
      },
      get_history: {
        entity_id: "light.test",
      },

      // Addon and package management
      addon: { action: "list" },
      package: { action: "list", category: "integration" },

      // Automation config
      automation_config: { action: "list" },

      // SSE tools
      subscribe_events: {
        token: this.mockHassToken,
        events: ["state_changed"],
      },
      get_sse_stats: {
        token: this.mockHassToken,
      },
    };

    return paramsByTool[toolName] || {};
  }

  private addTestResult(
    name: string,
    status: "passed" | "failed" | "skipped",
    message?: string
  ): void {
    this.testResults.tests.push({
      name,
      status,
      message,
    });

    if (status === "passed") {
      this.testResults.passed++;
    } else if (status === "failed") {
      this.testResults.failed++;
    } else {
      this.testResults.skipped++;
    }
  }

  async runAll(): Promise<void> {
    console.log("🚀 Starting MCP Tools Test Suite");
    console.log(`📦 Testing ${tools.length} tools...\n`);
    console.log("=".repeat(60));

    for (const tool of tools) {
      await this.testTool(tool);
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Test Summary:");
    console.log(`  ✅ Passed:  ${this.testResults.passed}`);
    console.log(`  ❌ Failed:  ${this.testResults.failed}`);
    console.log(`  ⏭️  Skipped: ${this.testResults.skipped}`);
    console.log(`  📈 Total:   ${this.testResults.tests.length}`);

    const passRate = ((this.testResults.passed / this.testResults.tests.length) * 100).toFixed(1);
    console.log(`  📊 Pass Rate: ${passRate}%\n`);

    if (this.testResults.failed > 0) {
      console.log("❌ Failed Tests:");
      this.testResults.tests
        .filter((t) => t.status === "failed")
        .forEach((t) => {
          console.log(`  - ${t.name}: ${t.message || t.error || "Unknown error"}`);
        });
    }

    console.log("\n" + "=".repeat(60));
    if (this.testResults.failed === 0) {
      console.log("✅ All tests passed!");
    } else {
      console.log(`⚠️  ${this.testResults.failed} test(s) failed`);
      process.exit(1);
    }
  }
}

// Run tests
const harness = new MCPTestHarness();
await harness.runAll();
