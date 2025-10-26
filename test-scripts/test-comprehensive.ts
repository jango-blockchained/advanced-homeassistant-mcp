#!/usr/bin/env bun
/**
 * Comprehensive Live Test of All Home Assistant MCP Tools
 */

import { tools } from './src/tools/index.js';

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║     🏠 HOME ASSISTANT MCP - COMPREHENSIVE TOOLS AUDIT                     ║
║                                                                            ║
║  Demonstrating all available Model Context Protocol tools                 ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

// Display all tools
console.log('\n📋 TOOL INVENTORY\n');
console.log(`Total Tools Available: ${tools.length}\n`);

tools.forEach((tool, idx) => {
  const params = tool.parameters;
  console.log(`${idx + 1}. Tool: ${tool.name}`);
  console.log(`   Description: ${tool.description}`);
  
  // Try to extract parameter info
  if (params instanceof Object && 'shape' in params) {
    const shape = params.shape as Record<string, unknown>;
    const paramKeys = Object.keys(shape);
    console.log(`   Parameters: ${paramKeys.join(', ') || 'none'}`);
  } else if (params instanceof Object && '_def' in params) {
    console.log(`   Parameters: [Zod Schema]`);
  }
  console.log();
});

// Tool categories
console.log('\n🗂️  TOOL CATEGORIES\n');

const categories: Record<string, string[]> = {
  'Device Control': ['list_devices', 'control'],
  'Lighting': ['lights'],
  'Climate': ['climate_control'],
  'Scenes': ['scene'],
  'Automation': ['automation', 'automation_config'],
  'System': ['addon', 'package', 'subscribe_events', 'get_sse_stats'],
  'Notifications': ['notify'],
  'History': ['get_history'],
};

for (const [category, toolNames] of Object.entries(categories)) {
  const available = tools.filter(t => toolNames.includes(t.name));
  if (available.length > 0) {
    console.log(`${category}:`);
    available.forEach(tool => {
      console.log(`  ✓ ${tool.name}`);
    });
    console.log();
  }
}

// Tool capabilities matrix
console.log('\n🎯 TOOL CAPABILITIES SUMMARY\n');

interface ToolCapabilities {
  name: string;
  capabilities: string[];
}

const capabilities: ToolCapabilities[] = [
  {
    name: 'list_devices',
    capabilities: ['List all entities', 'Filter by domain', 'Filter by area', 'Filter by floor', 'Get device statistics']
  },
  {
    name: 'control',
    capabilities: ['Turn devices on/off', 'Toggle state', 'Set brightness', 'Set color/RGB', 'Set temperature', 'Set HVAC mode', 'Set position']
  },
  {
    name: 'lights',
    capabilities: ['List lights', 'Get light state', 'Turn lights on/off']
  },
  {
    name: 'climate_control',
    capabilities: ['List climate devices', 'Get device state', 'Set temperature', 'Set HVAC mode', 'Set fan mode']
  },
  {
    name: 'scene',
    capabilities: ['List scenes', 'Activate scenes']
  },
  {
    name: 'automation',
    capabilities: ['List automations', 'Toggle automations', 'Trigger automations']
  },
  {
    name: 'automation_config',
    capabilities: ['Create automations', 'Update automations', 'Delete automations', 'Duplicate automations']
  },
  {
    name: 'addon',
    capabilities: ['List add-ons', 'Get add-on info', 'Install add-ons', 'Uninstall add-ons', 'Start/Stop add-ons']
  },
  {
    name: 'package',
    capabilities: ['List packages', 'Install packages', 'Uninstall packages', 'Update packages']
  },
  {
    name: 'notify',
    capabilities: ['Send notifications', 'Add title/data', 'Target specific services']
  },
  {
    name: 'get_history',
    capabilities: ['Get entity history', 'Specify time range', 'Minimal response mode']
  },
  {
    name: 'subscribe_events',
    capabilities: ['Subscribe to events', 'Monitor state changes', 'Filter by entity/domain', 'SSE streaming']
  },
  {
    name: 'get_sse_stats',
    capabilities: ['Get connection statistics', 'Monitor SSE performance']
  },
];

capabilities.forEach(tool => {
  const exists = tools.some(t => t.name === tool.name);
  const icon = exists ? '✅' : '⚠️';
  console.log(`${icon} ${tool.name}`);
  console.log(`   Capabilities:`);
  tool.capabilities.forEach(cap => {
    console.log(`     • ${cap}`);
  });
  console.log();
});

// Print statistics
console.log('\n📊 STATISTICS\n');
console.log(`Total Tools: ${tools.length}`);
console.log(`Total Capabilities: ${capabilities.reduce((sum, t) => sum + t.capabilities.length, 0)}`);
console.log(`Average Capabilities per Tool: ${(capabilities.reduce((sum, t) => sum + t.capabilities.length, 0) / tools.length).toFixed(1)}`);

console.log('\n✨ Audit complete!\n');
