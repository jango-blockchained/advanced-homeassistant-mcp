import { z } from "zod";

// Tool interfaces
export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  execute: (params: any) => Promise<any>;
}

// Command interfaces
export interface CommandParams {
  command: string;
  entity_id: string;
  // Common parameters
  state?: string;
  // Light parameters
  brightness?: number;
  color_temp?: number;
  rgb_color?: [number, number, number];
  // Cover parameters
  position?: number;
  tilt_position?: number;
  // Climate parameters
  temperature?: number;
  target_temp_high?: number;
  target_temp_low?: number;
  hvac_mode?: string;
  fan_mode?: string;
  humidity?: number;
}

// Re-export Home Assistant types
export type {
  HassInstance,
  HassStates,
  HassServices,
  HassConnection,
  HassService,
  HassEvent,
  HassEntity,
  HassState,
} from "./hass.js";

// Home Assistant interfaces
export interface HassAddon {
  name: string;
  slug: string;
  description: string;
  version: string;
  installed: boolean;
  available: boolean;
  state: string;
}

export interface HassAddonResponse {
  data: {
    addons: HassAddon[];
  };
}

export interface HassAddonInfoResponse {
  data: {
    name: string;
    slug: string;
    description: string;
    version: string;
    state: string;
    status: string;
    options: Record<string, any>;
    [key: string]: any;
  };
}

// HACS interfaces
export interface HacsRepository {
  name: string;
  description: string;
  category: string;
  installed: boolean;
  version_installed: string;
  available_version: string;
  authors: string[];
  domain: string;
}

export interface HacsResponse {
  repositories: HacsRepository[];
}

// Automation interfaces
export interface AutomationConfig {
  alias: string;
  description?: string;
  mode?: "single" | "parallel" | "queued" | "restart";
  trigger: any[];
  condition?: any[];
  action: any[];
}

export interface AutomationResponse {
  automation_id: string;
}

// SSE interfaces
export interface SSEHeaders {
  onAbort?: () => void;
}

export interface SSEParams {
  token: string;
  events?: string[];
  entity_id?: string;
  domain?: string;
}

// History interfaces
export interface HistoryParams {
  entity_id: string;
  start_time?: string;
  end_time?: string;
  minimal_response?: boolean;
  significant_changes_only?: boolean;
}

// Scene interfaces
export interface SceneParams {
  action: "list" | "activate";
  scene_id?: string;
}

// Notification interfaces
export interface NotifyParams {
  message: string;
  title?: string;
  target?: string;
  data?: Record<string, any>;
}

// Automation parameter interfaces
export interface AutomationParams {
  action: "list" | "toggle" | "trigger";
  automation_id?: string;
}

export interface AddonParams {
  action: "list" | "info" | "install" | "uninstall" | "start" | "stop" | "restart";
  slug?: string;
  version?: string;
}

export interface PackageParams {
  action: "list" | "install" | "uninstall" | "update";
  category: "integration" | "plugin" | "theme" | "python_script" | "appdaemon" | "netdaemon";
  repository?: string;
  version?: string;
}

export interface AutomationConfigParams {
  action: "create" | "update" | "delete" | "duplicate";
  automation_id?: string;
  config?: {
    alias: string;
    description?: string;
    mode?: "single" | "parallel" | "queued" | "restart";
    trigger: any[];
    condition?: any[];
    action: any[];
  };
}
