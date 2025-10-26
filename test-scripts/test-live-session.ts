#!/usr/bin/env bun
/**
 * Live interactive test session for all Home Assistant MCP tools
 * Tests each tool with various inputs to demonstrate functionality
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║          Home Assistant MCP Tools - Live Test Session                      ║
║                   Testing All Available Tools                              ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

interface TestResult {
  name: string;
  category: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Helper function to test tools
async function testTool(
  name: string,
  category: string,
  fn: () => Promise<any>
): Promise<void> {
  const startTime = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    results.push({
      name,
      category,
      success: true,
      result,
      duration,
    });
    
    console.log(`✅ ${name}`);
    console.log(`   └─ Duration: ${duration.toFixed(0)}ms`);
    if (result && typeof result === 'object') {
      const resultStr = JSON.stringify(result).substring(0, 100);
      console.log(`   └─ Response: ${resultStr}${JSON.stringify(result).length > 100 ? '...' : ''}`);
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    results.push({
      name,
      category,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    });
    
    console.log(`❌ ${name}`);
    console.log(`   └─ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`   └─ Duration: ${duration.toFixed(0)}ms`);
  }
  console.log();
}

// Run all tests
async function runAllTests() {
  console.log('📋 DEVICE & ENTITY MANAGEMENT\n');
  
  // List all devices
  await testTool('List All Devices', 'Device', async () => {
    const devices = await mcp_homeassistant_list_devices({});
    return devices;
  });

  // List lights
  await testTool('List Lights', 'Device', async () => {
    const lights = await mcp_homeassistant_lights_control({ action: 'list' });
    return lights;
  });

  // List climate devices
  await testTool('List Climate Devices', 'Device', async () => {
    const climate = await mcp_homeassistant_climate_control({ action: 'list' });
    return climate;
  });

  console.log('🎬 SCENE MANAGEMENT\n');
  
  // List scenes
  await testTool('List Scenes', 'Scene', async () => {
    const scenes = await mcp_homeassistant_scene({ action: 'list' });
    return scenes;
  });

  console.log('🤖 AUTOMATION MANAGEMENT\n');
  
  // List automations
  await testTool('List Automations', 'Automation', async () => {
    const automations = await mcp_homeassistant_automation({ action: 'list' });
    return automations;
  });

  // List automation configs
  await testTool('List Automation Configs', 'Automation', async () => {
    // Note: This might fail if no automations exist
    const configs = await mcp_homeassistant_automation_config({ action: 'list' });
    return configs;
  });

  console.log('🔌 ADD-ON & PACKAGE MANAGEMENT\n');
  
  // List add-ons
  await testTool('List Add-ons', 'System', async () => {
    const addons = await mcp_homeassistant_addon({ action: 'list' });
    return addons;
  });

  // List packages
  await testTool('List Packages', 'System', async () => {
    const packages = await mcp_homeassistant_package({
      action: 'list',
      category: 'integration',
    });
    return packages;
  });

  console.log('📊 DATA & HISTORY\n');
  
  // Get SSE stats
  await testTool('Get SSE Stats', 'System', async () => {
    const stats = await mcp_homeassistant_get_sse_stats({ token: 'test' });
    return stats;
  });

  console.log('🔔 NOTIFICATIONS\n');
  
  // Send notification
  await testTool('Send Notification', 'Notification', async () => {
    const result = await mcp_homeassistant_notify({
      message: 'Test notification from MCP live session',
      title: 'Live Test',
    });
    return result;
  });

  console.log('📡 EVENTS & SUBSCRIPTIONS\n');
  
  // Subscribe to events (list only, not actual subscription)
  await testTool('Get Event Subscriptions', 'Events', async () => {
    const events = await mcp_homeassistant_subscribe_events({
      token: 'test',
      events: ['state_changed'],
    });
    return events;
  });

  // Print summary
  printSummary();
}

function printSummary() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                            TEST SUMMARY                                    ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  const categories = [...new Set(results.map(r => r.category))];
  
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.success).length;
    const failed = categoryResults.filter(r => !r.success).length;
    
    console.log(`\n${category}:`);
    console.log(`  Total: ${categoryResults.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    
    categoryResults.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      console.log(`  ${icon} ${r.name} (${r.duration.toFixed(0)}ms)`);
    });
  }

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  const avgTime = totalTime / totalTests;

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                          OVERALL STATISTICS                                ║
╚════════════════════════════════════════════════════════════════════════════╝

  Total Tests:      ${totalTests}
  ✅ Passed:        ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)
  ❌ Failed:        ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)
  
  Total Time:       ${totalTime.toFixed(0)}ms
  Average Time:     ${avgTime.toFixed(0)}ms
  
`);

  if (failedTests > 0) {
    console.log(`⚠️  Note: Some tests failed. This is normal if Home Assistant is not configured or certain entities don't exist.\n`);
  }
}

// Run the tests
await runAllTests();
