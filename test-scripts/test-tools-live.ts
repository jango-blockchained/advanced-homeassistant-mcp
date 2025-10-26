#!/usr/bin/env bun
/**
 * Live test script for all MCP tools
 * Tests each tool with sample inputs to verify functionality
 */

import { tools } from './src/tools/index.js';

console.log('🧪 Running live tests for all MCP tools...\n');
console.log('Note: Some tests may fail if Home Assistant is not configured\n');

interface TestResult {
  tool: string;
  success: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

// Test configurations for each tool
const testConfigs: Record<string, any> = {
  list_devices: {
    domain: 'light',
  },
  control: {
    entity_id: 'light.test_light',
    action: 'turn_on',
  },
  get_history: {
    entity_id: 'light.test_light',
    hours: 1,
  },
  scene: {
    action: 'list',
  },
  notify: {
    message: 'Test notification from MCP',
    title: 'Test',
  },
  automation: {
    action: 'list',
  },
  addon: {
    action: 'list',
  },
  package: {
    action: 'list',
  },
  automation_config: {
    action: 'create',
    config: {
      alias: 'Test Automation',
      trigger: [
        {
          platform: 'state',
          entity_id: 'sun.sun',
          to: 'below_horizon',
        },
      ],
      action: [
        {
          service: 'light.turn_on',
          target: {
            entity_id: 'light.test_light',
          },
        },
      ],
    },
  },
  subscribe_events: {
    action: 'list',
  },
  get_sse_stats: {},
};

async function testTool(tool: any, params: any): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const result = await tool.execute(params);
    const duration = performance.now() - startTime;
    
    // Check if result indicates success
    const success = result.success !== false && !result.error;
    
    return {
      tool: tool.name,
      success,
      message: result.message || JSON.stringify(result).substring(0, 100),
      duration,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      tool: tool.name,
      success: false,
      message: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

// Run tests
for (const tool of tools) {
  const params = testConfigs[tool.name];
  
  if (!params) {
    console.log(`⚠️  ${tool.name}: No test configuration defined (skipped)`);
    continue;
  }
  
  console.log(`Testing ${tool.name}...`);
  
  const result = await testTool(tool, params);
  results.push(result);
  
  const statusIcon = result.success ? '✅' : '❌';
  const durationText = `${result.duration.toFixed(0)}ms`;
  
  console.log(`  ${statusIcon} ${result.success ? 'PASS' : 'FAIL'} (${durationText})`);
  
  if (!result.success) {
    console.log(`     Error: ${result.message}`);
  }
  
  console.log();
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));

const passed = results.filter((r) => r.success).length;
const failed = results.filter((r) => !r.success).length;
const total = results.length;

console.log(`\nTotal: ${total} tests`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailed tools:');
  results
    .filter((r) => !r.success)
    .forEach((r) => {
      console.log(`  - ${r.tool}: ${r.message}`);
    });
}

const avgDuration =
  results.reduce((sum, r) => sum + r.duration, 0) / results.length;
console.log(`\nAverage response time: ${avgDuration.toFixed(0)}ms`);

// Exit with error code if any tests failed
process.exit(failed > 0 ? 1 : 0);
