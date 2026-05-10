/**
 * Dashboard Management Tool for Home Assistant
 *
 * List, view, edit, and import/export Lovelace dashboard configurations.
 * Uses the WebSocket API since Lovelace endpoints are not available via REST.
 * Supports JSON and YAML formats for dashboard configs.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { logger } from "../utils/logger.js";
import { get_hass_ws } from "../hass/websocket-manager.js";
import { Tool } from "../types/index.js";

const dashboardSchema = z.object({
  action: z
    .enum(["list", "get_config", "update_config", "export_yaml", "import_yaml"])
    .describe("Action to perform on dashboards"),
  url_path: z
    .string()
    .optional()
    .describe(
      "Dashboard URL path (omit for the default dashboard). Use the 'list' action to discover available dashboards.",
    ),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Dashboard configuration object (required for update_config action)"),
  yaml_content: z
    .string()
    .optional()
    .describe("YAML string of dashboard configuration (required for import_yaml action)"),
});

type DashboardParams = z.infer<typeof dashboardSchema>;

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

async function executeDashboard(params: DashboardParams): Promise<string> {
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

      case "update_config": {
        if (!params.config) {
          throw new UserError(
            "The 'config' parameter is required for update_config action",
          );
        }

        await saveDashboardConfig(params.config, params.url_path);
        return JSON.stringify({
          success: true,
          message: `Dashboard ${params.url_path ?? "default"} config updated`,
        });
      }

      case "export_yaml": {
        const config = await fetchDashboardConfig(params.url_path);
        const yaml = yamlStringify(config);
        return JSON.stringify({ yaml });
      }

      case "import_yaml": {
        if (!params.yaml_content) {
          throw new UserError(
            "The 'yaml_content' parameter is required for import_yaml action",
          );
        }

        let config: unknown;
        try {
          config = yamlParse(params.yaml_content);
        } catch (parseError) {
          throw new UserError(
            `Invalid YAML: ${(parseError as Error).message}`,
          );
        }

        if (config == null || typeof config !== "object" || Array.isArray(config)) {
          throw new UserError(
            "YAML must parse to an object (the dashboard configuration)",
          );
        }

        await saveDashboardConfig(
          config as Record<string, unknown>,
          params.url_path,
        );
        return JSON.stringify({
          success: true,
          message: `Dashboard ${params.url_path ?? "default"} config imported from YAML`,
        });
      }
    }
  } catch (error) {
    if (error instanceof UserError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Dashboard operation failed: ${message}`);
    throw new UserError(`Dashboard operation failed: ${message}`);
  }
}

export const dashboardTool: Tool = {
  name: "dashboard",
  description:
    "Manage Home Assistant Lovelace dashboards. List all dashboards, get or update their configuration, and import/export configs as YAML. Note: update_config and import_yaml replace the entire dashboard config — always get the current config first, modify it, then update.",
  parameters: dashboardSchema,
  execute: executeDashboard,
  annotations: {
    title: "Dashboard Management",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
};
