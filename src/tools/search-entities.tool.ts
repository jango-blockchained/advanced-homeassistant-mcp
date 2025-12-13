/**
 * Search Entities Tool for Home Assistant
 *
 * Powerful entity search with filtering by domain, device_class, state,
 * area, pattern matching, attribute conditions, and time-based queries.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../utils/logger.js";
import { get_hass } from "../hass/index.js";
import { Tool } from "../types/index.js";

// Attribute filter schema
const attributeFilterSchema = z.object({
  key: z.string().describe("Attribute name (e.g., 'battery_level', 'brightness', 'person')"),
  op: z
    .enum(["=", "!=", "<", ">", "<=", ">=", "contains"])
    .describe("Comparison operator"),
  value: z
    .union([z.string(), z.number(), z.boolean()])
    .describe("Value to compare against"),
});

// Main schema
const searchEntitiesSchema = z.object({
  domain: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Filter by domain (e.g., 'binary_sensor', 'sensor', 'light') - single or array"),
  device_class: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Filter by device_class (e.g., 'motion', 'door', 'temperature', 'battery')"),
  state: z
    .string()
    .optional()
    .describe("Filter by state - exact match ('on', 'off') or comparison ('>50', '<20', '!=unavailable')"),
  area: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Filter by area (e.g., 'living_room', 'office')"),
  pattern: z
    .string()
    .optional()
    .describe("Glob pattern to match entity_id or friendly_name (e.g., '*motion*', 'sensor.frigate*', '*chad*person*')"),
  attributes: z
    .array(attributeFilterSchema)
    .optional()
    .describe("Attribute conditions with AND logic (e.g., [{key: 'battery_level', op: '<', value: 20}])"),
  changed_within: z
    .string()
    .optional()
    .describe("Filter entities changed within duration (e.g., '5m', '1h', '24h')"),
  changed_after: z
    .string()
    .optional()
    .describe("Filter entities changed after ISO timestamp"),
  output: z
    .enum(["minimal", "summary", "full"])
    .optional()
    .default("summary")
    .describe("Output mode: 'minimal' (entity_ids only), 'summary' (id, state, name, device_class, last_changed), 'full' (all attributes)"),
  sort_by: z
    .enum(["last_changed", "last_updated", "entity_id", "state"])
    .optional()
    .default("entity_id")
    .describe("Sort results by field"),
  sort_order: z
    .enum(["asc", "desc"])
    .optional()
    .default("asc")
    .describe("Sort order"),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return"),
});

type SearchEntitiesParams = z.infer<typeof searchEntitiesSchema>;
type AttributeFilter = z.infer<typeof attributeFilterSchema>;

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new UserError(`Invalid duration format: ${duration}. Use format like '5m', '1h', '24h', '7d'`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

/**
 * Convert glob pattern to regex
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

/**
 * Compare values with operator
 */
function compareValues(actual: unknown, op: string, expected: string | number | boolean): boolean {
  // Handle null/undefined
  if (actual === null || actual === undefined) {
    return op === "!=" ? true : false;
  }

  switch (op) {
    case "=":
      return String(actual).toLowerCase() === String(expected).toLowerCase();
    case "!=":
      return String(actual).toLowerCase() !== String(expected).toLowerCase();
    case "<":
      return Number(actual) < Number(expected);
    case ">":
      return Number(actual) > Number(expected);
    case "<=":
      return Number(actual) <= Number(expected);
    case ">=":
      return Number(actual) >= Number(expected);
    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    default:
      return false;
  }
}

/**
 * Parse state filter (exact match or comparison)
 */
function parseStateFilter(stateFilter: string): { op: string; value: string } {
  const comparisonMatch = stateFilter.match(/^(!=|<=|>=|<|>|=)?(.+)$/);
  if (comparisonMatch && comparisonMatch[1]) {
    return { op: comparisonMatch[1], value: comparisonMatch[2] };
  }
  return { op: "=", value: stateFilter };
}

/**
 * Check if value matches array or single value filter
 */
function matchesFilter(value: unknown, filter: string | string[] | undefined): boolean {
  if (!filter) return true;
  const filters = Array.isArray(filter) ? filter : [filter];
  return filters.some((f) => String(value).toLowerCase() === f.toLowerCase());
}

async function executeSearchEntitiesLogic(params: SearchEntitiesParams): Promise<string> {
  try {
    const hass = await get_hass();
    let entities = await hass.getStates();

    // Apply domain filter
    if (params.domain) {
      const domains = Array.isArray(params.domain) ? params.domain : [params.domain];
      entities = entities.filter((e) => {
        const entityDomain = e.entity_id.split(".")[0];
        return domains.some((d) => d.toLowerCase() === entityDomain.toLowerCase());
      });
    }

    // Apply device_class filter
    if (params.device_class) {
      entities = entities.filter((e) =>
        matchesFilter(e.attributes?.device_class, params.device_class)
      );
    }

    // Apply state filter
    if (params.state) {
      const { op, value } = parseStateFilter(params.state);
      entities = entities.filter((e) => compareValues(e.state, op, value));
    }

    // Apply area filter
    if (params.area) {
      entities = entities.filter((e) =>
        matchesFilter(e.attributes?.area_id, params.area)
      );
    }

    // Apply pattern filter
    if (params.pattern) {
      const regex = globToRegex(params.pattern);
      entities = entities.filter((e) => {
        const friendlyName = e.attributes?.friendly_name || "";
        return regex.test(e.entity_id) || regex.test(friendlyName);
      });
    }

    // Apply attribute filters
    if (params.attributes && params.attributes.length > 0) {
      entities = entities.filter((e) => {
        return params.attributes!.every((filter: AttributeFilter) => {
          const attrValue = e.attributes?.[filter.key];
          return compareValues(attrValue, filter.op, filter.value);
        });
      });
    }

    // Apply time filters
    if (params.changed_within) {
      const durationMs = parseDuration(params.changed_within);
      const cutoff = new Date(Date.now() - durationMs);
      entities = entities.filter((e) => {
        const changed = new Date(e.last_changed);
        return changed >= cutoff;
      });
    }

    if (params.changed_after) {
      const afterDate = new Date(params.changed_after);
      if (isNaN(afterDate.getTime())) {
        throw new UserError(`Invalid date format: ${params.changed_after}`);
      }
      entities = entities.filter((e) => {
        const changed = new Date(e.last_changed);
        return changed >= afterDate;
      });
    }

    // Sort results
    const sortBy = params.sort_by || "entity_id";
    const sortOrder = params.sort_order || "asc";
    entities.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortBy) {
        case "last_changed":
          aVal = new Date(a.last_changed).getTime();
          bVal = new Date(b.last_changed).getTime();
          break;
        case "last_updated":
          aVal = new Date(a.last_updated).getTime();
          bVal = new Date(b.last_updated).getTime();
          break;
        case "state":
          aVal = a.state;
          bVal = b.state;
          break;
        case "entity_id":
        default:
          aVal = a.entity_id;
          bVal = b.entity_id;
          break;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Apply limit
    if (params.limit && params.limit > 0) {
      entities = entities.slice(0, params.limit);
    }

    // Format output based on mode
    const output = params.output || "summary";
    let results: unknown[];

    switch (output) {
      case "minimal":
        results = entities.map((e) => e.entity_id);
        break;
      case "summary":
        results = entities.map((e) => ({
          entity_id: e.entity_id,
          state: e.state,
          friendly_name: e.attributes?.friendly_name,
          device_class: e.attributes?.device_class,
          last_changed: e.last_changed,
        }));
        break;
      case "full":
      default:
        results = entities.map((e) => ({
          entity_id: e.entity_id,
          state: e.state,
          last_changed: e.last_changed,
          last_updated: e.last_updated,
          attributes: e.attributes,
        }));
        break;
    }

    return JSON.stringify({
      count: results.length,
      results,
    });
  } catch (error) {
    if (error instanceof UserError) throw error;
    logger.error(`Failed to search entities: ${error}`);
    throw new UserError(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const searchEntitiesTool: Tool = {
  name: "search_entities",
  description:
    "Search Home Assistant entities with powerful filtering. Supports domain, device_class, state (exact or comparison like '>50'), area, glob patterns ('*motion*'), attribute conditions (battery_level < 20), and time-based queries (changed_within: '5m'). Examples: Find active motion sensors, low battery devices, recently triggered sensors, or when a Frigate-tracked person was last seen.",
  parameters: searchEntitiesSchema,
  execute: executeSearchEntitiesLogic,
  annotations: {
    title: "Search Entities",
    description: "Powerful entity search with filtering and sorting",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};
