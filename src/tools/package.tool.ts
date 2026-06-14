import { z } from "zod";
import { Tool, HacsResponse } from "../types/index";
import { APP_CONFIG } from "../config/app.config";

const categoryEnum = z.enum([
  "integration",
  "plugin",
  "theme",
  "python_script",
  "appdaemon",
  "netdaemon",
]);

const packageReadSchema = z.object({
  action: z.literal("list").describe("List installed/available packages"),
  category: categoryEnum.describe("Package category"),
});

const packageModifySchema = z.object({
  action: z.enum(["install", "uninstall", "update"]).describe("Lifecycle action"),
  category: categoryEnum.describe("Package category"),
  repository: z.string().optional().describe("Repository URL or name (required)"),
  version: z.string().optional().describe("Version (only for install)"),
});

type PackageReadParams = z.infer<typeof packageReadSchema>;
type PackageModifyParams = z.infer<typeof packageModifySchema>;

const hacsBase = () => `${APP_CONFIG.HASS_HOST}/api/hacs`;

async function executePackageRead(params: PackageReadParams) {
  try {
    const response = await fetch(`${hacsBase()}/repositories?category=${params.category}`, {
      headers: {
        Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch packages: ${response.statusText}`);
    }

    const data = (await response.json()) as HacsResponse;
    return JSON.stringify({ success: true, packages: data.repositories });
  } catch (error) {
    return JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

async function executePackageModify(params: PackageModifyParams) {
  try {
    if (!params.repository) {
      throw new Error("Repository is required for this action");
    }
    let endpoint = "";
    const body: Record<string, any> = {
      category: params.category,
      repository: params.repository,
    };

    switch (params.action) {
      case "install":
        endpoint = "/repository/install";
        if (params.version) body.version = params.version;
        break;
      case "uninstall":
        endpoint = "/repository/uninstall";
        break;
      case "update":
        endpoint = "/repository/update";
        break;
    }

    const response = await fetch(`${hacsBase()}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${params.action} package: ${response.statusText}`);
    }

    return JSON.stringify({
      success: true,
      message: `Successfully ${params.action}ed package ${params.repository}`,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}

export const packageTool: Tool = {
  name: "package",
  description: "List HACS packages and custom components by category",
  annotations: {
    title: "HACS Package Inventory",
    description: "Read-only view of HACS repositories",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  parameters: packageReadSchema,
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      packages: z.array(z.record(z.unknown())),
    }),
    z.object({
      success: z.literal(false),
      message: z.string(),
    }),
  ]),
  execute: executePackageRead,
};

export const packageModifyTool: Tool = {
  name: "package_modify",
  description: "Install, uninstall, or update HACS packages",
  annotations: {
    title: "HACS Package Lifecycle",
    description: "Modify HACS-managed integrations and custom components",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  parameters: packageModifySchema,
  outputSchema: z.union([
    z.object({
      success: z.literal(true),
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      message: z.string(),
    }),
  ]),
  execute: executePackageModify,
};
