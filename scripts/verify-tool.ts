import { tools } from './src/tools/index.js';

const tool = tools.find((t) => t.name === 'automation_config');
console.log('Tool found:', !!tool);
console.log('Has parameters:', !!tool?.parameters);
console.log('Parameters type:', tool?.parameters?.constructor?.name);

if (tool) {
  // Try to get the JSON schema
  const { zodToJsonSchema } = await import('zod-to-json-schema');
  const jsonSchema = zodToJsonSchema(tool.parameters);
  console.log('\nJSON Schema:');
  console.log(JSON.stringify(jsonSchema, null, 2));
}
