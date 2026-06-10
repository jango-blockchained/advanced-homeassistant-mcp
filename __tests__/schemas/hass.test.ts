import { describe, expect, test } from "bun:test";
import {
  validateEntity,
  validateService,
  validateStateChangedEvent,
  validateConfig,
  validateDeviceControl,
} from "../../src/schemas/hass.js";

describe("Home Assistant Schemas", () => {
  describe("Entity Schema", () => {
    test("should validate a valid entity", () => {
      const validEntity = {
        entity_id: "light.living_room",
        state: "on",
        attributes: {
          brightness: 255,
          color_temp: 300,
        },
        last_changed: "2024-01-01T00:00:00Z",
        last_updated: "2024-01-01T00:00:00Z",
        context: {
          id: "123456",
          parent_id: null,
          user_id: null,
        },
      };
      const result = validateEntity(validEntity);
      expect(result.success).toBe(true);
    });

    test("should reject entity with missing required fields", () => {
      const invalidEntity = {
        state: "on",
        attributes: {},
      };
      const result = validateEntity(invalidEntity);
      expect(result.success).toBe(false);
    });

    test("should validate entity with additional attributes", () => {
      const validEntity = {
        entity_id: "light.living_room",
        state: "on",
        attributes: {
          brightness: 255,
          color_temp: 300,
          custom_attr: "value",
        },
        last_changed: "2024-01-01T00:00:00Z",
        last_updated: "2024-01-01T00:00:00Z",
        context: {
          id: "123456",
          parent_id: null,
          user_id: null,
        },
      };
      const result = validateEntity(validEntity);
      expect(result.success).toBe(true);
    });

    test("should reject invalid entity_id format", () => {
      const invalidEntity = {
        entity_id: "invalid_format",
        state: "on",
        attributes: {},
        last_changed: "2024-01-01T00:00:00Z",
        last_updated: "2024-01-01T00:00:00Z",
        context: {
          id: "123456",
          parent_id: null,
          user_id: null,
        },
      };
      const result = validateEntity(invalidEntity);
      expect(result.success).toBe(false);
    });
  });

  describe("Service Schema", () => {
    test("should validate a basic service call", () => {
      const basicService = {
        domain: "light",
        service: "turn_on",
        target: {
          entity_id: "light.living_room",
        },
        service_data: {
          brightness_pct: 100,
        },
      };
      const result = validateService(basicService);
      expect(result.success).toBe(true);
    });

    test("should validate service call with multiple targets", () => {
      const multiTargetService = {
        domain: "light",
        service: "turn_on",
        target: {
          entity_id: ["light.living_room", "light.kitchen"],
        },
        service_data: {
          brightness_pct: 100,
        },
      };
      const result = validateService(multiTargetService);
      expect(result.success).toBe(true);
    });

    test("should validate service call without targets", () => {
      const noTargetService = {
        domain: "homeassistant",
        service: "restart",
      };
      const result = validateService(noTargetService);
      expect(result.success).toBe(true);
    });

    test("should reject service call with invalid target type", () => {
      const invalidService = {
        domain: "light",
        service: "turn_on",
        target: {
          entity_id: 123, // Invalid type
        },
      };
      const result = validateService(invalidService);
      expect(result.success).toBe(false);
    });

    test("should reject service call with invalid domain", () => {
      const invalidService = {
        domain: "",
        service: "turn_on",
      };
      const result = validateService(invalidService);
      expect(result.success).toBe(false);
    });
  });

  describe("State Changed Event Schema", () => {
    test("should validate a valid state changed event", () => {
      const validEvent = {
        event_type: "state_changed",
        data: {
          entity_id: "light.living_room",
          old_state: {
            entity_id: "light.living_room",
            state: "off",
            attributes: {},
            last_changed: "2024-01-01T00:00:00Z",
            last_updated: "2024-01-01T00:00:00Z",
            context: {
              id: "123456",
              parent_id: null,
              user_id: null,
            },
          },
          new_state: {
            entity_id: "light.living_room",
            state: "on",
            attributes: {
              brightness: 255,
            },
            last_changed: "2024-01-01T00:00:01Z",
            last_updated: "2024-01-01T00:00:01Z",
            context: {
              id: "123457",
              parent_id: null,
              user_id: null,
            },
          },
        },
        origin: "LOCAL",
        time_fired: "2024-01-01T00:00:00Z",
        context: {
          id: "123456",
          parent_id: null,
          user_id: null,
        },
      };
      const result = validateStateChangedEvent(validEvent);
      expect(result.success).toBe(true);
    });

    test("should validate event with null old_state", () => {
      const newEntityEvent = {
        event_type: "state_changed",
        data: {
          entity_id: "light.living_room",
          old_state: null,
          new_state: {
            entity_id: "light.living_room",
            state: "on",
            attributes: {},
            last_changed: "2024-01-01T00:00:00Z",
            last_updated: "2024-01-01T00:00:00Z",
            context: {
              id: "123456",
              parent_id: null,
              user_id: null,
            },
          },
        },
        origin: "LOCAL",
        time_fired: "2024-01-01T00:00:00Z",
        context: {
          id: "123456",
          parent_id: null,
          user_id: null,
        },
      };
      const result = validateStateChangedEvent(newEntityEvent);
      expect(result.success).toBe(true);
    });

    test("should reject event with invalid event_type", () => {
      const invalidEvent = {
        event_type: "wrong_type",
        data: {
          entity_id: "light.living_room",
          old_state: null,
          new_state: {
            state: "on",
            attributes: {},
          },
        },
      };
      const result = validateStateChangedEvent(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe("Config Schema", () => {
    test("should validate a minimal config", () => {
      const minimalConfig = {
        location_name: "Home",
        time_zone: "Europe/Amsterdam",
        components: ["homeassistant"],
        version: "2024.1.0",
      };
      const result = validateConfig(minimalConfig);
      expect(result.success).toBe(true);
    });

    test("should reject config with missing required fields", () => {
      const invalidConfig = {
        location_name: "Home",
      };
      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);
    });

    test("should reject config with invalid types", () => {
      const invalidConfig = {
        location_name: 123,
        time_zone: "Europe/Amsterdam",
        components: "not_an_array",
        version: "2024.1.0",
      };
      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe("Device Control Schema", () => {
    test("should validate light control command", () => {
      const command = {
        domain: "light",
        command: "turn_on",
        entity_id: "light.living_room",
        parameters: {
          brightness_pct: 100,
        },
      };
      const result = validateDeviceControl(command);
      expect(result.success).toBe(true);
    });

    test("should reject command with mismatched domain and entity_id", () => {
      const mismatchedCommand = {
        domain: "light",
        command: "turn_on",
        entity_id: "switch.living_room", // mismatched domain
      };
      const result = validateDeviceControl(mismatchedCommand);
      expect(result.success).toBe(false);
    });

    test("should validate command with array of entity_ids", () => {
      const command = {
        domain: "light",
        command: "turn_on",
        entity_id: ["light.living_room", "light.kitchen"],
      };
      const result = validateDeviceControl(command);
      expect(result.success).toBe(true);
    });
  });
});
