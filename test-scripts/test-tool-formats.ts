#!/usr/bin/env bun
/**
 * Test script to verify MCP tools return the correct format
 * This checks that all tools return results in the expected MCP format
 */

import { MCPServer } from './src/mcp/MCPServer.js';
import { logger } from './src/utils/logger.js';
import type { MCPRequest, MCPResponse } from './src/mcp/types.js';

// Import tools
import { LightsControlTool } from './src/tools/homeassistant/lights.tool.js';
import { ClimateControlTool } from './src/tools/homeassistant/climate.tool.js';
import { ListDevicesTool } from './src/tools/homeassistant/list-devices.tool.js';
import { AutomationTool } from './src/tools/homeassistant/automation.tool.js';
import { SceneTool } from './src/tools/homeassistant/scene.tool.js';
import { NotifyTool } from './src/tools/homeassistant/notify.tool.js';

console.log('🔍 Testing MCP Tool Response Formats\n');

interface FormatTest {
    tool: string;
    passed: boolean;
    issues: string[];
}

const results: FormatTest[] = [];

async function testToolFormat(toolName: string, params: any): Promise<FormatTest> {
    const test: FormatTest = {
        tool: toolName,
        passed: true,
        issues: []
    };

    try {
        const server = MCPServer.getInstance();
        
        // Create a proper MCP request
        const request: MCPRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: toolName,
            params: params
        };

        console.log(`Testing ${toolName}...`);
        
        // Handle the request through the server
        const response: MCPResponse = await server.handleRequest(request);

        // Check response format
        if (!response) {
            test.passed = false;
            test.issues.push('Response is null or undefined');
            return test;
        }

        // Check if it's a proper MCPResponse
        if (response.id === undefined) {
            test.passed = false;
            test.issues.push('Response missing "id" field');
        }

        // Should have either result or error
        if (response.result === undefined && response.error === undefined) {
            test.passed = false;
            test.issues.push('Response missing both "result" and "error" fields');
        }

        // If there's an error, check its format
        if (response.error) {
            if (typeof response.error.code !== 'number') {
                test.passed = false;
                test.issues.push('Error code is not a number');
            }
            if (typeof response.error.message !== 'string') {
                test.passed = false;
                test.issues.push('Error message is not a string');
            }
            console.log(`  ⚠️  Error response: ${response.error.message}`);
        }

        // If there's a result, verify it's the expected format
        if (response.result !== undefined) {
            // Check that result is not just a string (should be an object or structured data)
            if (typeof response.result === 'string') {
                test.issues.push('Warning: Result is a plain string, should be structured data');
            }
            console.log(`  ✅ Result type: ${typeof response.result}`);
            console.log(`  ✅ Result sample: ${JSON.stringify(response.result).substring(0, 100)}...`);
        }

    } catch (error) {
        test.passed = false;
        test.issues.push(`Exception thrown: ${error instanceof Error ? error.message : String(error)}`);
        console.log(`  ❌ Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    return test;
}

async function runTests() {
    // Initialize server and register tools
    const server = MCPServer.getInstance();
    
    server.registerTool(new LightsControlTool());
    server.registerTool(new ClimateControlTool());
    server.registerTool(new ListDevicesTool());
    server.registerTool(new AutomationTool());
    server.registerTool(new SceneTool());
    server.registerTool(new NotifyTool());

    // Test cases for each tool
    const tests = [
        { name: 'lights_control', params: { action: 'list' } },
        { name: 'climate_control', params: { action: 'list' } },
        { name: 'list_devices', params: {} },
        { name: 'automation', params: { action: 'list' } },
        { name: 'scene', params: { action: 'list' } },
        // Skip notify as it requires a message
    ];

    console.log('Starting format validation tests...\n');

    for (const test of tests) {
        const result = await testToolFormat(test.name, test.params);
        results.push(result);
        console.log('');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n🔍 Failed Tests Details:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`\n  Tool: ${r.tool}`);
            r.issues.forEach(issue => console.log(`    - ${issue}`));
        });
    }

    console.log('\n' + '='.repeat(60));
    
    process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
});
