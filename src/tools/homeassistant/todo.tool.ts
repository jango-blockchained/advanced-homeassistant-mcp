/**
 * To-Do Control Tool for Home Assistant (fastmcp format)
 *
 * This tool allows managing to-do lists in Home Assistant.
 * Supports listing to-do lists, getting items, adding, updating, and removing items.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../../utils/logger.js";
import { BaseTool } from "../base-tool.js";
import { MCPContext } from "../../mcp/types.js";
import { get_hass } from "../../hass/index.js";
import { get_hass_ws } from "../../hass/websocket-manager.js";
import { Tool } from "../../types/index.js";

// Define the schema for our tool parameters using Zod
const todoControlSchema = z.object({
  action: z
    .enum(["list_lists", "get_items", "add_item", "update_item", "remove_item"])
    .describe("The action to perform"),
  entity_id: z
    .string()
    .optional()
    .describe(
      "The entity ID of the to-do list (required for get_items, add_item, update_item, remove_item)",
    ),
  item: z
    .string()
    .optional()
    .describe("The name of the to-do item (required for add_item, update_item, remove_item)"),
  rename: z.string().optional().describe("New name for the item (optional for update_item)"),
  status: z
    .enum(["needs_action", "completed"])
    .optional()
    .describe("Status of the item (optional for add_item, update_item)"),
  due_date: z
    .string()
    .optional()
    .describe("Due date for the item, e.g. YYYY-MM-DD (optional for add_item, update_item)"),
  due_datetime: z
    .string()
    .optional()
    .describe("Due datetime for the item (optional for add_item, update_item)"),
  description: z
    .string()
    .optional()
    .describe("Description for the item (optional for add_item, update_item)"),
});

// Infer the type from the schema
type TodoControlParams = z.infer<typeof todoControlSchema>;

// Shared execution logic
async function executeTodoControlLogic(params: TodoControlParams): Promise<string> {
  switch (params.action) {
    case "list_lists": {
      const hass = await get_hass();
      const states = await hass.getStates();
      const lists = states
        .filter((state) => state.entity_id.startsWith("todo."))
        .map((state) => ({
          entity_id: state.entity_id,
          state: state.state,
          friendly_name: state.attributes?.friendly_name,
          supported_features: state.attributes?.supported_features,
        }));
      return JSON.stringify({ lists, total_count: lists.length });
    }

    case "get_items": {
      if (params.entity_id == null) {
        throw new UserError("entity_id is required for 'get_items' action");
      }

      const wsClient = await get_hass_ws();
      const response = await wsClient.callService(
        "todo",
        "get_items",
        {
          entity_id: params.entity_id,
          status: params.status ? [params.status] : ["needs_action", "completed"],
        },
        true, // returnResponse
      );

      return JSON.stringify(response);
    }

    case "add_item": {
      if (params.entity_id == null || params.item == null) {
        throw new UserError("entity_id and item are required for 'add_item' action");
      }

      const wsClient = await get_hass_ws();
      const serviceData: any = {
        entity_id: params.entity_id,
        item: params.item,
      };

      if (params.due_date) serviceData.due_date = params.due_date;
      if (params.due_datetime) serviceData.due_datetime = params.due_datetime;
      if (params.description) serviceData.description = params.description;

      await wsClient.callService("todo", "add_item", serviceData);
      return JSON.stringify({ status: "success", message: `Added item '${params.item}'` });
    }

    case "update_item": {
      if (params.entity_id == null || params.item == null) {
        throw new UserError("entity_id and item are required for 'update_item' action");
      }

      const wsClient = await get_hass_ws();
      const serviceData: any = {
        entity_id: params.entity_id,
        item: params.item,
      };

      if (params.rename) serviceData.rename = params.rename;
      if (params.status) serviceData.status = params.status;
      if (params.due_date) serviceData.due_date = params.due_date;
      if (params.due_datetime) serviceData.due_datetime = params.due_datetime;
      if (params.description) serviceData.description = params.description;

      await wsClient.callService("todo", "update_item", serviceData);
      return JSON.stringify({ status: "success", message: `Updated item '${params.item}'` });
    }

    case "remove_item": {
      if (params.entity_id == null || params.item == null) {
        throw new UserError("entity_id and item are required for 'remove_item' action");
      }

      const wsClient = await get_hass_ws();
      await wsClient.callService("todo", "remove_item", {
        entity_id: params.entity_id,
        item: [params.item],
      });
      return JSON.stringify({ status: "success", message: `Removed item '${params.item}'` });
    }

    default:
      throw new UserError(`Unknown action: ${String(params.action)}`);
  }
}

// Define the tool using the Tool interface
export const todoControlTool: Tool = {
  name: "todo_control",
  description:
    "Control and manage to-do lists in Home Assistant. Supports listing all to-do lists, getting items, and adding, updating, or removing items.",
  parameters: todoControlSchema,
  execute: executeTodoControlLogic,
  annotations: {
    title: "To-Do Control",
    description: "Manage to-do lists and items",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

// BaseTool class for compatibility
export class TodoControlTool extends BaseTool {
  constructor() {
    super({
      name: todoControlTool.name,
      description: todoControlTool.description,
      parameters: todoControlSchema,
      metadata: {
        category: "home_assistant",
        version: "1.0.0",
        tags: ["todo", "list", "home_assistant", "control"],
      },
    });
  }

  public async execute(params: TodoControlParams, _context: MCPContext): Promise<string> {
    logger.debug(`Executing TodoControlTool with params: ${JSON.stringify(params)}`);
    const validatedParams = this.validateParams(params);
    return await executeTodoControlLogic(validatedParams);
  }
}
