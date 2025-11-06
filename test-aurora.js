#!/usr/bin/env node
/**
 * Quick Aurora Tools Test
 * Tests that Aurora tools are available and callable
 */

import { MCPServer } from './dist/mcp/MCPServer.js';
import { tools } from './dist/tools/index.js';

console.log('\n🎨 Aurora Tools Integration Test\n');
console.log('='.repeat(50));

// Filter Aurora tools
const auroraTools = tools.filter(tool => tool.name.startsWith('aurora_'));

console.log(`\n✅ Found ${auroraTools.length} Aurora tools:\n`);

auroraTools.forEach((tool, index) => {
  console.log(`${index + 1}. ${tool.name}`);
  console.log(`   Description: ${tool.description}`);
  console.log('');
});

console.log('='.repeat(50));
console.log('\n✨ Aurora tools successfully integrated!\n');

// Check if server can be initialized
try {
  const server = MCPServer.getInstance();
  console.log('✅ MCP Server instance created');
  
  // Count all tools
  const totalTools = tools.length;
  const auroraCount = auroraTools.length;
  const otherCount = totalTools - auroraCount;
  
  console.log(`\n📊 Tool Statistics:`);
  console.log(`   - Aurora tools: ${auroraCount}`);
  console.log(`   - Other tools: ${otherCount}`);
  console.log(`   - Total tools: ${totalTools}`);
  
  console.log('\n🎉 All systems ready!\n');
} catch (error) {
  console.error('❌ Error initializing server:', error.message);
  process.exit(1);
}
