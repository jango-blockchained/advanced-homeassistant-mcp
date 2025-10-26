import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const simpleSchema = z.object({
  action: z.enum(['create', 'update']),
  test: z.array(z.string()).optional(),
});

const jsonSchema = zodToJsonSchema(simpleSchema);
console.log(JSON.stringify(jsonSchema, null, 2));
