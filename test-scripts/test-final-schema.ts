import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const schema = z.object({
  action: z
    .enum(["create", "update", "delete", "duplicate"])
    .describe("Action to perform with automation config"),
  automation_id: z
    .string()
    .optional()
    .describe("Automation ID (required for update, delete, and duplicate)"),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Automation configuration object (required for create and update)"),
});

try {
  const jsonSchema = zodToJsonSchema(schema);
  console.log(JSON.stringify(jsonSchema, null, 2));
  
  // Verify it has proper array validation
  const verify = (obj: any, path: string[] = []): boolean => {
    if (!obj) return true;
    if (obj.type === 'array' && !obj.items) {
      console.error(`ERROR: Array at ${path.join('.')} missing items!`);
      return false;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!verify(value, [...path, key])) return false;
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            if (!verify(item, [...path, key])) return false;
          }
        }
      }
    }
    return true;
  };
  
  if (verify(jsonSchema)) {
    console.log('\n✓ Schema validation passed: all arrays have items property');
  }
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : error);
}
