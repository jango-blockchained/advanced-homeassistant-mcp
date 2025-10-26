import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const schema = z.object({
  test: z.array(z.string()),
});

const result = zodToJsonSchema(schema, {
  refStrategy: "none",
});

console.log(JSON.stringify(result, null, 2));
