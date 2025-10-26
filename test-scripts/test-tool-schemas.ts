#!/usr/bin/env bun
/**
 * Test script to validate all MCP tool schemas
 */

import { tools } from './src/tools/index.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

console.log('🔍 Validating all MCP tool schemas...\n');

let hasErrors = false;

for (const tool of tools) {
  try {
    console.log(`Checking tool: ${tool.name}`);
    
    // Convert zod schema to JSON schema
    const jsonSchema = zodToJsonSchema(tool.parameters);
    
    // Check for array types without items
    const checkArrayItems = (obj: any, path = ''): void => {
      if (typeof obj !== 'object' || obj === null) return;
      
      if (obj.type === 'array' && !obj.items) {
        console.error(`  ❌ ERROR: Array type missing 'items' property at ${path}`);
        hasErrors = true;
      }
      
      // Check properties
      if (obj.properties) {
        for (const [key, value] of Object.entries(obj.properties)) {
          checkArrayItems(value, `${path}.properties.${key}`);
        }
      }
      
      // Check items
      if (obj.items) {
        checkArrayItems(obj.items, `${path}.items`);
      }
      
      // Check additionalProperties
      if (obj.additionalProperties && typeof obj.additionalProperties === 'object') {
        checkArrayItems(obj.additionalProperties, `${path}.additionalProperties`);
      }
    };
    
    checkArrayItems(jsonSchema, tool.name);
    
    if (!hasErrors) {
      console.log(`  ✅ Valid\n`);
    } else {
      console.log();
    }
    
  } catch (error) {
    console.error(`  ❌ ERROR: Failed to validate tool ${tool.name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}\n`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log('\n❌ Some tools have validation errors!');
  process.exit(1);
} else {
  console.log('\n✅ All tools passed validation!');
  process.exit(0);
}
