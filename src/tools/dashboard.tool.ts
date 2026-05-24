/**
 * Dashboard Management Tools for Home Assistant
 *
 * Split into:
 * - `dashboard` (read-only): list, get_config, export_yaml
 * - `dashboard_modify`: update_config, import_yaml (both replace entire dashboard config)
 *
 * Uses the WebSocket API since Lovelace endpoints are not available via REST.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { logger } from "../utils/logger.js";
import { get_hass_ws } from "../hass/websocket-manager.js";
import { Tool } from "../types/index.js";

const dashboardReadSchema = z.object({
  action: z.enum(["list", "get_config", "export_yaml"]).describe("Read action to perform"),
  url_path: z
    .string()
    .optional()
    .describe(
      "Dashboard URL path (omit for the default dashboard). Use 'list' to discover available dashboards.",
    ),
});

const dashboardModifySchema = z.object({
  action: z
    .enum(["update_config", "import_yaml"])
    .describe("Modify action — replaces entire dashboard config"),
  url_path: z.string().optional().describe("Dashboard URL path (omit for default)"),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Dashboard configuration object (required for update_config)"),
  yaml_content: z
    .string()
    .optional()
    .describe("YAML string of dashboard configuration (required for import_yaml)"),
});

type DashboardReadParams = z.infer<typeof dashboardReadSchema>;
type DashboardModifyParams = z.infer<typeof dashboardModifySchema>;

async function fetchDashboardConfig(urlPath?: string): Promise<Record<string, unknown>> {
  const hass = await get_hass_ws();
  const msg: Record<string, unknown> = { type: "lovelace/config" };
  if (urlPath) {
    msg.url_path = urlPath;
  }
  return await hass.send(msg);
}

async function saveDashboardConfig(
  config: Record<string, unknown>,
  urlPath?: string,
): Promise<void> {
  const hass = await get_hass_ws();
  const msg: Record<string, unknown> = {
    type: "lovelace/config/save",
    config,
  };
  if (urlPath) {
    msg.url_path = urlPath;
  }
  await hass.send(msg);
}

async function executeDashboardRead(params: DashboardReadParams): Promise<string> {
  try {
    switch (params.action) {
      case "list": {
        const hass = await get_hass_ws();
        const dashboards = await hass.send({ type: "lovelace/dashboards/list" });
        return JSON.stringify({ dashboards });
      }
      case "get_config": {
        const config = await fetchDashboardConfig(params.url_path);
        return JSON.stringify(config, null, 2);
      }
      case "export_yaml": {
        const config = await fetchDashboardConfig(params.url_path);
        const yaml = yamlStringify(config);
        return JSON.stringify({ yaml });
      }
    }
  } catch (error) {
    if (error instanceof UserError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Dashboard read failed: ${message}`);
    throw new UserError(`Dashboard read failed: ${message}`);
  }
}

async function executeDashboardModify(params: DashboardModifyParams): Promise<string> {
  try {
    switch (params.action) {
      case "update_config": {
        if (!params.config) {
          throw new UserError("The 'config' parameter is required for update_config action");
        }
        await saveDashboardConfig(params.config, params.url_path);
        return JSON.stringify({
          success: true,
          message: `Dashboard ${params.url_path ?? "default"} config updated`,
        });
      }
      case "import_yaml": {
        if (!params.yaml_content) {
          throw new UserError("The 'yaml_content' parameter is required for import_yaml action");
        }
        let config: unknown;
        try {
          config = yamlParse(params.yaml_content);
        } catch (parseError) {
          throw new UserError(`Invalid YAML: ${(parseError as Error).message}`);
        }
        if (config == null || typeof config !== "object" || Array.isArray(config)) {
          throw new UserError("YAML must parse to an object (the dashboard configuration)");
        }
        await saveDashboardConfig(config as Record<string, unknown>, params.url_path);
        return JSON.stringify({
          success: true,
          message: `Dashboard ${params.url_path ?? "default"} config imported from YAML`,
        });
      }
    }
  } catch (error) {
    if (error instanceof UserError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Dashboard modify failed: ${message}`);
    throw new UserError(`Dashboard modify failed: ${message}`);
  }
}

export const dashboardTool: Tool = {
  name: "dashboard",
  description:
    "List Home Assistant Lovelace dashboards or read a dashboard's configuration (JSON or YAML export).",
  parameters: dashboardReadSchema,
  execute: executeDashboardRead,
  annotations: {
    title: "Dashboard Inventory",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export const dashboardModifyTool: Tool = {
  name: "dashboard_modify",
  description:
    "Replace a Home Assistant Lovelace dashboard's configuration (from a JSON object or YAML string). Both actions overwrite the entire dashboard config — always read first, then modify, then update.",
  parameters: dashboardModifySchema,
  execute: executeDashboardModify,
  annotations: {
    title: "Dashboard Modify",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
};
