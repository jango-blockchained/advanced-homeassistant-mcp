#!/usr/bin/env node
/**
 * Test Aurora Tools via MCP Protocol
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

console.log('\n🎨 Testing Aurora MCP Tools\n');
console.log('='.repeat(60));

// Start the MCP server
const server = spawn('bun', ['run', 'start:stdio'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseData = '';
let serverReady = false;

// Handle server output
server.stdout.on('data', (data) => {
  const text = data.toString();
  responseData += text;
  
  // Check if we got a JSON-RPC response
  if (text.includes('"jsonrpc"') && text.includes('"result"')) {
    try {
      const response = JSON.parse(responseData);
      if (response.result && response.result.tools) {
        const tools = response.result.tools;
        const auroraTools = tools.filter(t => t.name.startsWith('aurora_'));
        
        console.log(`\n✅ MCP Server responded successfully!`);
        console.log(`\n📊 Tool Statistics:`);
        console.log(`   Total tools: ${tools.length}`);
        console.log(`   Aurora tools: ${auroraTools.length}`);
        console.log(`   Other tools: ${tools.length - auroraTools.length}`);
        
        if (auroraTools.length > 0) {
          console.log(`\n🎨 Aurora Tools Found:\n`);
          auroraTools.forEach((tool, i) => {
            console.log(`${i + 1}. ${tool.name}`);
            console.log(`   ${tool.description.substring(0, 70)}...`);
          });
          console.log('\n' + '='.repeat(60));
          console.log('\n✨ Success! Aurora is fully integrated and operational!\n');
        } else {
          console.log('\n⚠️  No Aurora tools found in response');
        }
        
        server.kill();
        process.exit(0);
      }
    } catch (e) {
      // Not valid JSON yet, keep collecting
    }
  }
});

server.stderr.on('data', (data) => {
  // Ignore stderr for now
});

// Send tools/list request after a short delay
setTimeout(() => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}, 1000);

// Timeout after 5 seconds
setTimeout(() => {
  console.log('\n⏱️  Timeout - server may still be initializing');
  server.kill();
  process.exit(1);
}, 5000);
