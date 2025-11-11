import { z } from "zod";

// Entity Schema
const entitySchema = z.object({
  entity_id: z.string().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/),
  state: z.string(),
  attributes: z.record(z.any()),
  last_changed: z.string(),
  last_updated: z.string(),
  context: z.object({
    id: z.string(),
    parent_id: z.string().nullable(),
    user_id: z.string().nullable(),
  }),
});

// Service Schema
const serviceSchema = z.object({
  domain: z.string().min(1),
  service: z.string().min(1),
  target: z
    .object({
      entity_id: z.union([z.string(), z.array(z.string())]),
      device_id: z.union([z.string(), z.array(z.string())]).optional(),
      area_id: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .optional(),
  service_data: z.record(z.any()).optional(),
});

// State Changed Event Schema
const stateChangedEventSchema = z.object({
  event_type: z.literal("state_changed"),
  data: z.object({
    entity_id: z.string(),
    old_state: z.union([entitySchema, z.null()]),
    new_state: entitySchema,
  }),
  origin: z.string(),
  time_fired: z.string(),
  context: z.object({
    id: z.string(),
    parent_id: z.string().nullable(),
    user_id: z.string().nullable(),
  }),
});

// Config Schema
const configSchema = z.object({
  location_name: z.string(),
  time_zone: z.string(),
  components: z.array(z.string()),
  version: z.string(),
});

// Device Control Schema
const deviceControlSchema = z
  .object({
    domain: z.string().min(1),
    command: z.string().min(1),
    entity_id: z.union([z.string(), z.array(z.string())]),
    parameters: z.record(z.any()).optional(),
  })
  .refine(
    (data) => {
      if (typeof data.entity_id === "string") {
        return data.entity_id.startsWith(data.domain + ".");
      }
      return data.entity_id.every((id) => id.startsWith(data.domain + "."));
    },
    {
      message: "entity_id must match the domain",
    },
  );

// Validation functions
export const validateEntity = (data: unknown) => {
  const result = entitySchema.safeParse(data);
  return { success: result.success, error: result.success ? undefined : result.error };
};

export const validateService = (data: unknown) => {
  const result = serviceSchema.safeParse(data);
  return { success: result.success, error: result.success ? undefined : result.error };
};

export const validateStateChangedEvent = (data: unknown) => {
  const result = stateChangedEventSchema.safeParse(data);
  return { success: result.success, error: result.success ? undefined : result.error };
};

export const validateConfig = (data: unknown) => {
  const result = configSchema.safeParse(data);
  return { success: result.success, error: result.success ? undefined : result.error };
};

export const validateDeviceControl = (data: unknown) => {
  const result = deviceControlSchema.safeParse(data);
  return { success: result.success, error: result.success ? undefined : result.error };
};
