#!/usr/bin/env bun
/**
 * Comprehensive Live Test of All Home Assistant MCP Tools
 * This script demonstrates and tests all available tools
 */

import { tools } from './src/tools/index.js';

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║     🏠 HOME ASSISTANT MCP - LIVE TOOLS DEMONSTRATION                      ║
║                                                                            ║
║  Testing all available Model Context Protocol tools for Home Assistant    ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

interface ToolInfo {
  name: string;
  description: string;
  parameterCount: number;
  example: string;
}

interface TestResult {
  toolName: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  duration: number;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

// Display tool information
console.log('📋 AVAILABLE TOOLS\n');
console.log(`Found ${tools.length} tools:\n`);

const toolInfos: ToolInfo[] = tools.map(tool => {
  const params = tool.parameters;
  const paramKeys = params instanceof Object && 'shape' in params 
    ? Object.keys(params.shape || {})
    : [];
  
  return {
    name: tool.name,
    description: tool.description,
    parameterCount: paramKeys.length,
    example: `{ ${paramKeys.slice(0, 2).join(', ')}${paramKeys.length > 2 ? ', ...' : ''} }`
  };
});

toolInfos.forEach((info, idx) => {
  console.log(`${idx + 1}. ${info.name}`);
  console.log(`   └─ ${info.description}`);
  console.log(`   └─ Parameters: ${info.parameterCount} (${info.example})\n`);
});

// Test execution
console.log('\n' + '='.repeat(80));
console.log('🧪 RUNNING TOOL TESTS\n');

const testScenarios = [
  {
    toolName: 'list_devices',
    description: 'List all devices',
    params: {},
  },
  {
    toolName: 'list_devices',
    description: 'List light devices',
    params: { domain: 'light' },
  },
  {
    toolName: 'list_devices',
    description: 'List climate devices',
    params: { domain: 'climate' },
  },
  {
    toolName: 'scene',
    description: 'List all scenes',
    params: { action: 'list' },
  },
  {
    toolName: 'automation',
    description: 'List all automations',
    params: { action: 'list' },
  },
  {
    toolName: 'addon',
    description: 'List all add-ons',
    params: { action: 'list' },
  },
  {
    toolName: 'package',
    description: 'List all packages',
    params: { action: 'list', category: 'integration' },
  },
  {
    toolName: 'notify',
    description: 'Send test notification',
    params: { message: 'Test notification from MCP live session' },
  },
  {
    toolName: 'get_sse_stats',
    description: 'Get SSE connection statistics',
    params: { token: 'demo' },
  },
];

async function runTest(scenario: typeof testScenarios[0]) {
  const startTime = performance.now();
  
  try {
    const tool = tools.find(t => t.name === scenario.toolName);
    
    if (!tool) {
      return {
        toolName: scenario.toolName,
        status: 'skipped' as const,
        message: `Tool not found: ${scenario.toolName}`,
        duration: 0,
      };
    }

    const result = await tool.execute(scenario.params);
    const duration = performance.now() - startTime;

    const isSuccess = result && result.success !== false && !result.error;

    return {
      toolName: scenario.toolName,
      status: isSuccess ? 'success' : 'error',
      message: result?.message || (isSuccess ? 'Operation completed' : 'Operation failed'),
      duration,
      details: isSuccess ? result : { error: result?.error || result?.message },
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      toolName: scenario.toolName,
      status: 'error' as const,
      message: error instanceof Error ? error.message : String(error),
      duration,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

// Execute all tests
for (const scenario of testScenarios) {
  process.stdout.write(`Testing: ${scenario.description}... `);
  const result = await runTest(scenario);
  results.push(result);
  
  const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏭️';
  console.log(`${icon} ${result.duration.toFixed(0)}ms`);
  
  if (result.status === 'error' && result.message) {
    console.log(`  └─ ${result.message}`);
  }
}

// Summary statistics
console.log('\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY\n');

const successful = results.filter(r => r.status === 'success');
const failed = results.filter(r => r.status === 'error');
const skipped = results.filter(r => r.status === 'skipped');

console.log(`Total Tests: ${results.length}`);
console.log(`✅ Successful: ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
console.log(`❌ Failed: ${failed.length} (${((failed.length / results.length) * 100).toFixed(1)}%)`);
console.log(`⏭️  Skipped: ${skipped.length} (${((skipped.length / results.length) * 100).toFixed(1)}%)`);

const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
const avgDuration = totalDuration / results.length;

console.log(`\nTotal Duration: ${totalDuration.toFixed(0)}ms`);
console.log(`Average Duration: ${avgDuration.toFixed(0)}ms`);
console.log(`Min Duration: ${Math.min(...results.map(r => r.duration)).toFixed(0)}ms`);
console.log(`Max Duration: ${Math.max(...results.map(r => r.duration)).toFixed(0)}ms`);

// Detailed results
console.log('\n' + '='.repeat(80));
console.log('🔍 DETAILED RESULTS\n');

results.forEach(result => {
  const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏭️';
  console.log(`${icon} ${result.toolName}`);
  console.log(`   Status: ${result.status} | Duration: ${result.duration.toFixed(0)}ms`);
  console.log(`   Message: ${result.message}`);
  if (result.details && Object.keys(result.details).length > 0) {
    const detailsStr = JSON.stringify(result.details).substring(0, 150);
    console.log(`   Details: ${detailsStr}${JSON.stringify(result.details).length > 150 ? '...' : ''}`);
  }
  console.log();
});

console.log('='.repeat(80));
console.log('✨ Live test session completed!\n');

process.exit(failed.length > 0 ? 1 : 0);
