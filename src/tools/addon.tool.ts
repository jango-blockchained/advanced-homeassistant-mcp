import { z } from "zod";
import { Tool, HassAddonResponse, HassAddonInfoResponse } from "../types/index";
import { APP_CONFIG } from "../config/app.config";

const addonReadSchema = z.object({
  action: z.enum(["list", "info"]).describe("Read action to perform"),
  slug: z.string().optional().describe("Add-on slug (required for 'info')"),
});

const addonModifySchema = z.object({
  action: z.enum(["install", "uninstall", "start", "stop", "restart"]).describe(
    "Lifecycle action to perform",
  ),
  slug: z.string().describe("Add-on slug"),
  version: z.string().optional().describe("Version to install (only for 'install')"),
});

type AddonReadParams = z.infer<typeof addonReadSchema>;
type AddonModifyParams = z.infer<typeof addonModifySchema>;

async function executeAddonRead(params: AddonReadParams): Promise<string> {
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
    }

    // info
    if (!params.slug) {
      throw new Error("Add-on slug is required for 'info'");
    }

    const response = await fetch(
      `${APP_CONFIG.HASS_HOST}/api/hassio/addons/${params.slug}/info`,
      {
        headers: {
          Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get add-on info: ${response.statusText}`);
    }

    const data = (await response.json()) as HassAddonInfoResponse;
    return JSON.stringify({ success: true, data: data.data });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

async function executeAddonModify(params: AddonModifyParams): Promise<string> {
  try {
    let endpoint = "";
    const body: Record<string, any> = {};

    switch (params.action) {
      case "install":
        endpoint = `/api/hassio/addons/${params.slug}/install`;
        if (params.version) body.version = params.version;
        break;
      case "uninstall":
        endpoint = `/api/hassio/addons/${params.slug}/uninstall`;
        break;
      case "start":
        endpoint = `/api/hassio/addons/${params.slug}/start`;
        break;
      case "stop":
        endpoint = `/api/hassio/addons/${params.slug}/stop`;
        break;
      case "restart":
        endpoint = `/api/hassio/addons/${params.slug}/restart`;
        break;
    }

    const response = await fetch(`${APP_CONFIG.HASS_HOST}${endpoint}`, {
      method: "POST",
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
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const addonTool: Tool = {
  name: "addon",
  description: "List Home Assistant add-ons or get info on a specific add-on",
  annotations: {
    title: "Add-on Inventory",
    description: "Read-only access to Supervisor add-on store and per-add-on info",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: addonReadSchema,
  execute: executeAddonRead,
};

export const addonModifyTool: Tool = {
  name: "addon_modify",
  description: "Install, uninstall, start, stop, or restart Home Assistant add-ons",
  annotations: {
    title: "Add-on Lifecycle",
    description: "Modify Supervisor add-on installation and runtime state",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: addonModifySchema,
  execute: executeAddonModify,
};
