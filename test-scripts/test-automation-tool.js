const { zodToJsonSchema } = require('zod-to-json-schema');

// Load the tool
const toolModule = require('./src/tools/automation-config.tool.ts');
const tool = toolModule.automationConfigTool;

console.log('Tool Name:', tool.name);
console.log('\nJSON Schema:');
const schema = zodToJsonSchema(tool.parameters);
console.log(JSON.stringify(schema, null, 2));

// Validate arrays have items
const configProps = schema.properties?.config?.properties;
if (configProps) {
  const arrays = ['trigger', 'condition', 'action'];
  arrays.forEach(arr => {
    if (configProps[arr]) {
      console.log(`\n${arr}:`, configProps[arr].items ? '✅ has items' : '❌ missing items');
    }
  });
}
