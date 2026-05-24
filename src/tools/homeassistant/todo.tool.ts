/**
 * To-Do Control Tools for Home Assistant
 *
 * Split into:
 * - `todo` (read-only): list_lists, get_items
 * - `todo_modify`: add_item, update_item, remove_item
 *
 * These manage HA-side todo data, not external services — `_modify` not `_activate`.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { get_hass } from "../../hass/index.js";
import { get_hass_ws } from "../../hass/websocket-manager.js";
import { Tool } from "../../types/index.js";

const todoReadSchema = z.object({
  action: z.enum(["list_lists", "get_items"]).describe("The read action to perform"),
  entity_id: z
    .string()
    .optional()
    .describe("The entity ID of the to-do list (required for get_items)"),
  status: z
    .enum(["needs_action", "completed"])
    .optional()
    .describe("Status filter for get_items (default: both)"),
});

const todoModifySchema = z.object({
  action: z.enum(["add_item", "update_item", "remove_item"]).describe("The modify action"),
  entity_id: z.string().describe("The entity ID of the to-do list"),
  item: z.string().describe("The name of the to-do item"),
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

type TodoReadParams = z.infer<typeof todoReadSchema>;
type TodoModifyParams = z.infer<typeof todoModifySchema>;

async function executeTodoRead(params: TodoReadParams): Promise<string> {
  if (params.action === "list_lists") {
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

  // get_items
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

async function executeTodoModify(params: TodoModifyParams): Promise<string> {
  const wsClient = await get_hass_ws();

  if (params.action === "add_item") {
    const serviceData: Record<string, unknown> = {
      entity_id: params.entity_id,
      item: params.item,
    };
    if (params.due_date) serviceData.due_date = params.due_date;
    if (params.due_datetime) serviceData.due_datetime = params.due_datetime;
    if (params.description) serviceData.description = params.description;
    await wsClient.callService("todo", "add_item", serviceData);
    return JSON.stringify({ status: "success", message: `Added item '${params.item}'` });
  }

  if (params.action === "update_item") {
    const serviceData: Record<string, unknown> = {
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

  // remove_item
  await wsClient.callService("todo", "remove_item", {
    entity_id: params.entity_id,
    item: [params.item],
  });
  return JSON.stringify({ status: "success", message: `Removed item '${params.item}'` });
}

export const todoTool: Tool = {
  name: "todo",
  description: "List Home Assistant to-do lists or get items from a specific list.",
  parameters: todoReadSchema,
  execute: executeTodoRead,
  annotations: {
    title: "To-Do Inventory",
    description: "Read-only access to to-do lists and items",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export const todoModifyTool: Tool = {
  name: "todo_modify",
  description: "Add, update, or remove items in a Home Assistant to-do list.",
  parameters: todoModifySchema,
  execute: executeTodoModify,
  annotations: {
    title: "To-Do Modify",
    description: "Modify items in a to-do list (add, update, remove)",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
};
