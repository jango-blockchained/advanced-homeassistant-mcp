import { z } from "zod";

/**
 * MCP Tool annotations for trust & safety
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 */
export interface ToolAnnotations {
  /** Human-readable title for the tool */
  title?: string;
  /** If true, the tool does not modify any state (read-only operations) */
  readOnlyHint?: boolean;
  /** If true, the tool may perform destructive operations (delete, remove, etc.) */
  destructiveHint?: boolean;
  /** If true, the tool may interact with external systems or the real world */
  openWorldHint?: boolean;
  /** If true, the tool result should not be shown to the user */
  idempotentHint?: boolean;
}

/**
 * Interface for a tool that can be executed by the MCP
 * @interface Tool
 */
export interface Tool {
  /** Unique name identifier for the tool */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** Zod schema for validating tool parameters */
  parameters: z.ZodType<unknown>;
  /** Function to execute the tool with the given parameters */
  execute: (params: unknown) => Promise<unknown>;
  /** Optional MCP annotations for trust & safety */
  annotations?: ToolAnnotations;
}

/**
 * Parameters for controlling Home Assistant devices
 * @interface CommandParams
 */
export interface CommandParams {
  /** Command to execute (e.g., turn_on, turn_off) */
  command: string;
  /** Entity ID to control */
  entity_id?: string;
  /** Area ID to control all devices of the domain type */
  area_id?: string;
  /** Common parameters */
  state?: string;
  /** Light parameters */
  brightness?: number;
  color_temp?: number;
  rgb_color?: [number, number, number];
  /** Cover parameters */
  position?: number;
  tilt_position?: number;
  /** Climate parameters */
  temperature?: number;
  target_temp_high?: number;
  target_temp_low?: number;
  hvac_mode?: string;
  fan_mode?: string;
  humidity?: number;
}

/**
 * Home Assistant entity interface
 * @interface HassEntity
 */
export interface HassEntity {
  /** Entity ID in format domain.name */
  entity_id: string;
  /** Current state of the entity */
  state: string;
  /** Entity attributes */
  attributes: Record<string, any>;
  /** Last state change timestamp */
  last_changed?: string;
  /** Last update timestamp */
  last_updated?: string;
  /** Context information */
  context?: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}

/**
 * Home Assistant state interface
 * @interface HassState
 */
export interface HassState {
  /** Entity ID in format domain.name */
  entity_id: string;
  /** Current state of the entity */
  state: string;
  /** Entity attributes */
  attributes: {
    /** Human-readable name */
    friendly_name?: string;
    /** Entity description */
    description?: string;
    /** Additional attributes */
    [key: string]: unknown;
  };
}

/**
 * Home Assistant add-on interface
 * @interface HassAddon
 */
export interface HassAddon {
  /** Add-on name */
  name: string;
  /** Add-on slug identifier */
  slug: string;
  /** Add-on description */
  description: string;
  /** Add-on version */
  version: string;
  /** Whether the add-on is installed */
  installed: boolean;
  /** Whether the add-on is available */
  available: boolean;
  /** Current state of the add-on */
  state: string;
}

/**
 * Response from Home Assistant add-on API
 * @interface HassAddonResponse
 */
export interface HassAddonResponse {
  /** Response data */
  data: {
    /** List of add-ons */
    addons: HassAddon[];
  };
}

/**
 * Response from Home Assistant add-on info API
 * @interface HassAddonInfoResponse
 */
export interface HassAddonInfoResponse {
  /** Response data */
  data: {
    /** Add-on name */
    name: string;
    /** Add-on slug identifier */
    slug: string;
    /** Add-on description */
    description: string;
    /** Add-on version */
    version: string;
    /** Current state */
    state: string;
    /** Status information */
    status: string;
    /** Add-on options */
    options: Record<string, unknown>;
    /** Additional properties */
    [key: string]: unknown;
  };
}

/**
 * HACS repository interface
 * @interface HacsRepository
 */
export interface HacsRepository {
  /** Repository name */
  name: string;
  /** Repository description */
  description: string;
  /** Repository category */
  category: string;
  /** Whether the repository is installed */
  installed: boolean;
  /** Installed version */
  version_installed: string;
  /** Available version */
  available_version: string;
  /** Repository authors */
  authors: string[];
  /** Repository domain */
  domain: string;
}

/**
 * Response from HACS API
 * @interface HacsResponse
 */
export interface HacsResponse {
  /** List of repositories */
  repositories: HacsRepository[];
}

/**
 * Home Assistant automation trigger definition
 * @interface AutomationTrigger
 */
export interface AutomationTrigger {
  /** Optional trigger identifier */
  id?: string;
  /** Trigger platform (state, time, event, etc.) */
  platform: string;
  /** Related entity IDs */
  entity_id?: string | string[];
  /** Source state for state triggers */
  from?: string;
  /** Target state for state triggers */
  to?: string;
  /** Attribute for state triggers */
  attribute?: string;
  /** Duration the trigger state must hold */
  for?: string | number | Record<string, unknown>;
  /** Trigger time for time-based triggers */
  at?: string;
  /** Event payload for event triggers */
  event?: Record<string, unknown>;
  /** Device trigger identifier */
  device_id?: string;
  /** Domain for device triggers */
  domain?: string;
  /** Trigger type for device triggers */
  type?: string;
  /** Zone information for zone triggers */
  zone?: Record<string, unknown>;
  /** Additional trigger properties */
  [key: string]: unknown;
}

/**
 * Home Assistant automation condition definition
 * @interface AutomationCondition
 */
export interface AutomationCondition {
  /** Optional alias */
  alias?: string;
  /** Condition type (state, numeric_state, and/or, etc.) */
  condition: string;
  /** Whether the condition is enabled */
  enabled?: boolean;
  /** Related entity IDs */
  entity_id?: string | string[];
  /** Expected entity state */
  state?: string;
  /** Attribute to evaluate */
  attribute?: string;
  /** Duration the condition must hold */
  for?: string | number | Record<string, unknown>;
  /** Numeric threshold upper bound */
  above?: number | string;
  /** Numeric threshold lower bound */
  below?: number | string;
  /** Nested conditions */
  conditions?: AutomationCondition[];
  /** Embedded action sequence for choose/then */
  sequence?: AutomationAction[];
  /** Additional condition properties */
  [key: string]: unknown;
}

/**
 * Home Assistant automation action definition
 * @interface AutomationAction
 */
export interface AutomationAction {
  /** Optional alias */
  alias?: string;
  /** Service to call */
  service?: string;
  /** Target selector */
  target?: Record<string, unknown>;
  /** Service data */
  data?: Record<string, unknown>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Related entity IDs */
  entity_id?: string | string[];
  /** Related device */
  device_id?: string;
  /** Domain for service/device actions */
  domain?: string;
  /** Device trigger type */
  type?: string;
  /** Conditional branches */
  choose?: Array<{
    /** Optional alias */
    alias?: string;
    /** Conditions for the branch */
    conditions?: AutomationCondition[];
    /** Sequence executed when conditions pass */
    sequence: AutomationAction[];
    /** Default sequence when conditions fail */
    default?: AutomationAction[];
    /** Additional branch properties */
    [key: string]: unknown;
  }>;
  /** Nested action sequence */
  sequence?: AutomationAction[];
  /** If-condition list */
  if?: AutomationCondition[];
  /** Then branch for if actions */
  then?: AutomationAction[];
  /** Else branch for if actions */
  else?: AutomationAction[];
  /** Repeat configuration */
  repeat?: {
    /** Repeat count */
    count?: number | string | Record<string, unknown>;
    /** While conditions */
    while?: AutomationCondition[];
    /** Until conditions */
    until?: AutomationCondition[];
    /** Sequence to repeat */
    sequence?: AutomationAction[];
    /** Items to iterate */
    for_each?: unknown[];
    /** Additional repeat properties */
    [key: string]: unknown;
  };
  /** Delay configuration */
  delay?: number | string | Record<string, unknown>;
  /** Wait template */
  wait_template?: string;
  /** Wait-for-trigger configuration */
  wait_for_trigger?: AutomationTrigger[];
  /** Parallel action sequences */
  parallel?: AutomationAction[];
  /** Additional action properties */
  [key: string]: unknown;
}

/**
 * Automation configuration interface
 * @interface AutomationConfig
 */
export interface AutomationConfig {
  /** Automation name */
  alias: string;
  /** Automation description */
  description?: string;
  /** How multiple triggers are handled */
  mode?: "single" | "parallel" | "queued" | "restart";
  /** List of triggers */
  trigger: AutomationTrigger[];
  /** List of conditions */
  condition?: AutomationCondition[];
  /** List of actions */
  action: AutomationAction[];
  /** Automation scoped variables */
  variables?: Record<string, unknown>;
  /** Trace configuration */
  trace?: Record<string, unknown>;
  /** Additional automation configuration properties */
  [key: string]: unknown;
}

/**
 * Response from automation API
 * @interface AutomationResponse
 */
export interface AutomationResponse {
  /** Created/updated automation ID */
  automation_id: string;
}

/**
 * SSE headers interface
 * @interface SSEHeaders
 */
export interface SSEHeaders {
  /** Callback for connection abort */
  onAbort?: () => void;
}

/**
 * SSE parameters interface
 * @interface SSEParams
 */
export interface SSEParams {
  /** Authentication token */
  token: string;
  /** Event types to subscribe to */
  events?: string[];
  /** Entity ID to monitor */
  entity_id?: string;
  /** Domain to monitor */
  domain?: string;
}

/**
 * History query parameters
 * @interface HistoryParams
 */
export interface HistoryParams {
  /** Entity ID to get history for */
  entity_id: string;
  /** Start time in ISO format */
  start_time?: string;
  /** End time in ISO format */
  end_time?: string;
  /** Whether to return minimal response */
  minimal_response?: boolean;
  /** Whether to only return significant changes */
  significant_changes_only?: boolean;
}

/**
 * Scene management parameters
 * @interface SceneParams
 */
export interface SceneParams {
  /** Action to perform */
  action: "list" | "activate";
  /** Scene ID for activation */
  scene_id?: string;
}

/**
 * Notification parameters
 * @interface NotifyParams
 */
export interface NotifyParams {
  /** Notification message */
  message: string;
  /** Notification title */
  title?: string;
  /** Notification target */
  target?: string;
  /** Additional notification data */
  data?: Record<string, any>;
}

/**
 * Automation management parameters
 * @interface AutomationParams
 */
export interface AutomationParams {
  /** Action to perform */
  action: "list" | "toggle" | "trigger";
  /** Automation ID */
  automation_id?: string;
}

/**
 * Add-on management parameters
 * @interface AddonParams
 */
export interface AddonParams {
  /** Action to perform */
  action: "list" | "info" | "install" | "uninstall" | "start" | "stop" | "restart";
  /** Add-on slug */
  slug?: string;
  /** Version to install */
  version?: string;
}

/**
 * Package management parameters
 * @interface PackageParams
 */
export interface PackageParams {
  /** Action to perform */
  action: "list" | "install" | "uninstall" | "update";
  /** Package category */
  category: "integration" | "plugin" | "theme" | "python_script" | "appdaemon" | "netdaemon";
  /** Repository URL or name */
  repository?: string;
  /** Version to install */
  version?: string;
}

/**
 * Automation configuration parameters
 * @interface AutomationConfigParams
 */
export interface AutomationConfigParams {
  /** Action to perform */
  action: "create" | "update" | "delete" | "duplicate";
  /** Automation ID */
  automation_id?: string;
  /** Automation configuration */
  config?: AutomationConfig;
}
