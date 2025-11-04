#!/usr/bin/env node

/**
 * Test script to validate new Home Assistant tools
 * This script tests that all new tools are properly registered and functional
 */

import { tools, getToolByName } from '../src/tools/index.ts';
import { getAllPrompts, renderPrompt } from '../src/mcp/prompts.ts';

console.log('🧪 Testing New Home Assistant MCP Features\n');

// Test 1: Check all new tools are registered
console.log('📋 Test 1: Tool Registration');
const expectedNewTools = [
    'media_player_control',
    'cover_control',
    'lock_control',
    'fan_control',
    'vacuum_control',
    'alarm_control'
];

let passed = 0;
let failed = 0;

for (const toolName of expectedNewTools) {
    const tool = getToolByName(toolName);
    if (tool) {
        console.log(`  ✅ ${toolName} - registered`);
        passed++;
    } else {
        console.log(`  ❌ ${toolName} - NOT FOUND`);
        failed++;
    }
}

// Test 2: Validate tool structure
console.log('\n📋 Test 2: Tool Structure Validation');
for (const toolName of expectedNewTools) {
    const tool = getToolByName(toolName);
    if (tool) {
        const hasName = typeof tool.name === 'string';
        const hasDescription = typeof tool.description === 'string';
        const hasParameters = tool.parameters !== undefined;
        const hasExecute = typeof tool.execute === 'function';
        
        if (hasName && hasDescription && hasParameters && hasExecute) {
            console.log(`  ✅ ${toolName} - valid structure`);
            passed++;
        } else {
            console.log(`  ❌ ${toolName} - invalid structure`);
            console.log(`     name: ${hasName}, desc: ${hasDescription}, params: ${hasParameters}, exec: ${hasExecute}`);
            failed++;
        }
    }
}

// Test 3: Check prompts
console.log('\n📋 Test 3: Prompts');
const prompts = getAllPrompts();
console.log(`  ℹ️  Found ${prompts.length} prompts`);

const expectedPrompts = [
    'control_lights',
    'morning_routine',
    'energy_saving',
    'security_setup',
    'climate_comfort',
    'media_control',
    'vacuum_schedule',
    'troubleshoot_device',
    'voice_control_setup',
    'scene_creation'
];

for (const promptName of expectedPrompts) {
    const prompt = prompts.find(p => p.name === promptName);
    if (prompt) {
        console.log(`  ✅ ${promptName} - available`);
        passed++;
    } else {
        console.log(`  ❌ ${promptName} - NOT FOUND`);
        failed++;
    }
}

// Test 4: Test prompt rendering
console.log('\n📋 Test 4: Prompt Rendering');
try {
    const rendered = renderPrompt('control_lights', { room: 'bedroom', action: 'turn on' });
    if (rendered.includes('bedroom') && rendered.includes('turn on')) {
        console.log('  ✅ Prompt rendering works correctly');
        passed++;
    } else {
        console.log('  ❌ Prompt rendering failed - placeholders not replaced');
        failed++;
    }
} catch (error) {
    console.log(`  ❌ Prompt rendering error: ${error.message}`);
    failed++;
}

// Test 5: Check tool count
console.log('\n📋 Test 5: Total Tools Count');
const totalTools = tools.length;
console.log(`  ℹ️  Total tools registered: ${totalTools}`);
if (totalTools >= 19) { // 13 original + 6 new
    console.log(`  ✅ Tool count is correct (>= 19)`);
    passed++;
} else {
    console.log(`  ❌ Tool count is less than expected`);
    failed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(50));

if (failed === 0) {
    console.log('\n🎉 All tests passed! New features are working correctly.\n');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the output above.\n');
    process.exit(1);
}
