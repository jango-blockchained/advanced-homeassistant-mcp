import { z } from "zod";
import { Tool, AddonParams, HassAddonResponse, HassAddonInfoResponse } from "../types/index";
import { APP_CONFIG } from "../config/app.config";

export const addonTool: Tool = {
  name: "addon",
  description: "Manage Home Assistant add-ons - install, uninstall, start, stop and manage installed add-ons",
  annotations: {
    title: "Add-on Management",
    description: "Install and manage Home Assistant add-ons with lifecycle control",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: z.object({
    action: z
      .enum(["list", "info", "install", "uninstall", "start", "stop", "restart"])
      .describe("Action to perform with add-on"),
    slug: z.string().optional().describe("Add-on slug (required for all actions except list)"),
    version: z.string().optional().describe("Version to install (only for install action)"),
  }),
  execute: async (params: AddonParams) => {
    try {
      if (params.action === "list") {
        const response = await fetch(`${APP_CONFIG.HASS_HOST}/api/hassio/store`, {
          headers: {
            Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch add-ons: ${response.statusText}`);
        }

        const data = (await response.json()) as HassAddonResponse;
        return JSON.stringify({
          success: true,
          addons: data.data.addons.map((addon) => ({
            name: addon.name,
            slug: addon.slug,
            description: addon.description,
            version: addon.version,
            installed: addon.installed,
            available: addon.available,
            state: addon.state,
          })),
        });
      } else {
        if (!params.slug) {
          throw new Error("Add-on slug is required for this action");
        }

        let endpoint = "";
        let method = "GET";
        const body: Record<string, any> = {};

        switch (params.action) {
          case "info":
            endpoint = `/api/hassio/addons/${params.slug}/info`;
            break;
          case "install":
            endpoint = `/api/hassio/addons/${params.slug}/install`;
            method = "POST";
            if (params.version) {
              body.version = params.version;
            }
            break;
          case "uninstall":
            endpoint = `/api/hassio/addons/${params.slug}/uninstall`;
            method = "POST";
            break;
          case "start":
            endpoint = `/api/hassio/addons/${params.slug}/start`;
            method = "POST";
            break;
          case "stop":
            endpoint = `/api/hassio/addons/${params.slug}/stop`;
            method = "POST";
            break;
          case "restart":
            endpoint = `/api/hassio/addons/${params.slug}/restart`;
            method = "POST";
            break;
        }

        const response = await fetch(`${APP_CONFIG.HASS_HOST}${endpoint}`, {
          method,
          headers: {
            Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
            "Content-Type": "application/json",
          },
          ...(Object.keys(body).length > 0 && { body: JSON.stringify(body) }),
        });

        if (!response.ok) {
          throw new Error(`Failed to ${params.action} add-on: ${response.statusText}`);
        }

        const data = (await response.json()) as HassAddonInfoResponse;
        return JSON.stringify({
          success: true,
          message: `Successfully ${params.action}ed add-on ${params.slug}`,
          data: data.data,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return JSON.stringify({
        success: false,
        error: errorMessage,
      });
    }
  },
};
