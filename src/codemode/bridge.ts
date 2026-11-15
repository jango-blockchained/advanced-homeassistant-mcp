/**
 * Host-side bridge for Code Mode.
 *
 * Sandboxed QuickJS code never receives a host object. It calls one async
 * function (`__codemode_host`) with an operation name and a JSON payload. This
 * module executes that operation in the host process and returns JSON. Errors
 * are serialized as `{ ok: false, error }` instead of thrown across the
 * boundary, so host `Error` objects never leak into the sandbox.
 */

import { logger } from "../utils/logger.js";
import { get_hass } from "../hass/index.js";
import type { CodeModeConfig } from "./config.js";

export interface HostCallContext {
  /** Epoch milliseconds at which the whole execution must stop. */
  deadline: number;
  /** Shared abort signal, fired when the execution times out or is canceled. */
  signal: AbortSignal;
}

export type HostBridge = (
  operation: string,
  payload: unknown,
  context: HostCallContext,
) => Promise<unknown>;

const MAX_LOG_LINE = 2_000;

/** JSON.stringify that never throws on BigInt/circular values. */
export function safeJsonStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, function (_key: string, inner: unknown) {
      if (typeof inner === "bigint") return inner.toString();
      if (inner !== null && typeof inner === "object") {
        if (seen.has(inner)) return "[Circular]";
        seen.add(inner);
      }
      return inner;
    });
  } catch (error) {
    return JSON.stringify({
      ok: false,
      name: "SerializationError",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function truncate(text: string, max = MAX_LOG_LINE): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function optionalObject(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected an object");
  }
  return value as Record<string, unknown>;
}

function getHassBaseUrl(): string {
  return process.env.HASS_HOST ?? "http://homeassistant.local:8123";
}

function getHassToken(): string {
  const token = process.env.HASS_TOKEN ?? "";
  if (!token) {
    throw new Error("HASS_TOKEN is not configured");
  }
  return token;
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/**
 * Make a raw Home Assistant REST request.
 *
 * The path is forced under `/api/` and the resolved origin must match
 * HASS_HOST. This prevents sandboxed code from turning `hass.request` into an
 * arbitrary-network proxy (or from exfiltrating the token to another host).
 */
async function hassRequest(options: unknown, context: HostCallContext): Promise<unknown> {
  const opts = optionalObject(options);
  if (!opts) throw new Error("hass.request expects an options object");

  const method = String(opts.method ?? "GET").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }

  const rawPath = requireString(opts.path, "path");
  if (!rawPath.startsWith("/api/") && rawPath !== "/api") {
    throw new Error("path must start with /api/");
  }
  if (rawPath.split("/").some((segment) => segment === ".." || segment === ".")) {
    throw new Error("path must not contain . or .. segments");
  }

  const base = new URL(getHassBaseUrl());
  const url = new URL(rawPath, base);
  if (url.origin !== base.origin) {
    throw new Error("hass.request may only call the configured HASS_HOST");
  }
  if (!url.pathname.startsWith("/api/") && url.pathname !== "/api") {
    throw new Error("resolved path must stay under /api/");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getHassToken()}`,
    Accept: "application/json",
  };

  let body: string | undefined;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: context.signal,
    redirect: "error",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Home Assistant API error: ${response.status} ${response.statusText} - ${truncate(text)}`,
    );
  }

  if (!text) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return text;
}

async function callHassService(payload: unknown): Promise<unknown> {
  const opts = optionalObject(payload) ?? {};
  const domain = requireString(opts.domain, "domain");
  const service = requireString(opts.service, "service");
  const data = optionalObject(opts.data) ?? {};
  const hass = await get_hass();
  return hass.callService(domain, service, data);
}

async function getHassState(payload: unknown): Promise<unknown> {
  const opts = optionalObject(payload) ?? {};
  const entityId = requireString(opts.entity_id, "entity_id");
  const hass = await get_hass();
  return hass.getState(entityId);
}

async function getHassStates(): Promise<unknown> {
  const hass = await get_hass();
  return hass.getStates();
}

async function getHassServices(context: HostCallContext): Promise<unknown> {
  return hassRequest({ method: "GET", path: "/api/services" }, context);
}

async function getHassConfig(context: HostCallContext): Promise<unknown> {
  return hassRequest({ method: "GET", path: "/api/config" }, context);
}

async function getHassHistory(payload: unknown, context: HostCallContext): Promise<unknown> {
  const opts = optionalObject(payload) ?? {};
  const entityId = requireString(opts.entity_id, "entity_id");
  const startTime =
    typeof opts.start_time === "string" && opts.start_time.length > 0
      ? opts.start_time
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const query = new URLSearchParams({ filter_entity_id: entityId });
  if (typeof opts.end_time === "string" && opts.end_time.length > 0) {
    query.set("end_time", opts.end_time);
  }

  return hassRequest(
    {
      method: "GET",
      path: `/api/history/period/${encodeURIComponent(startTime)}?${query.toString()}`,
    },
    context,
  );
}

/**
 * Parse JSON-string tool results so code can compose with objects instead of
 * strings. Non-JSON strings (and every other value) pass through unchanged.
 */
function parseToolResult(result: unknown): unknown {
  if (typeof result !== "string") return result;
  const trimmed = result.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return result;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return result;
  }
}

async function listTools(): Promise<unknown> {
  const { tools } = await import("../tools/index.js");
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    annotations: tool.annotations,
  }));
}

async function callTool(payload: unknown): Promise<unknown> {
  const opts = optionalObject(payload) ?? {};
  const name = requireString(opts.name, "name");
  const args = optionalObject(opts.args) ?? {};

  if (name === "search" || name === "execute") {
    throw new Error("Code Mode tools cannot be called from inside execute()");
  }

  const { getToolByName } = await import("../tools/index.js");
  const tool = getToolByName(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  const parsed = tool.parameters.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid arguments for ${name}: ${issues}`);
  }

  const result = await tool.execute(parsed.data);
  return parseToolResult(result);
}

async function sleep(payload: unknown, context: HostCallContext): Promise<null> {
  const opts = optionalObject(payload) ?? {};
  const requested = Number(opts.ms ?? 0);
  if (!Number.isFinite(requested) || requested < 0) {
    throw new Error("ms must be a non-negative number");
  }

  const remaining = context.deadline - Date.now();
  if (remaining <= 0) throw new Error("execution deadline exceeded");

  const ms = Math.min(requested, 10_000, remaining);
  if (ms <= 0) return null;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new Error("execution aborted"));
    };
    if (context.signal.aborted) {
      onAbort();
      return;
    }
    context.signal.addEventListener("abort", onAbort, { once: true });
  });

  return null;
}

/**
 * Build the host bridge used by sandboxed code.
 *
 * Every operation is logged at debug level (operation name only; payloads can
 * contain entity data, so they are not logged).
 */
export function createHostBridge(config: CodeModeConfig): HostBridge {
  // Per-execution budget: createHostBridge is called fresh for every execute,
  // so this counter only tracks calls within one execution.
  let hostCalls = 0;
  return async (operation, payload, context) => {
    hostCalls += 1;
    if (hostCalls > config.maxHostCalls) {
      throw new Error(`host call limit (${config.maxHostCalls}) exceeded for this execution`);
    }

    if (context.signal.aborted) {
      throw new Error("execution aborted");
    }

    logger.debug(`[code-mode] host call: ${operation}`);

    switch (operation) {
      case "hass.getStates":
        return getHassStates();
      case "hass.getState":
        return getHassState(payload);
      case "hass.callService":
        return callHassService(payload);
      case "hass.request":
        if (!config.allowRawHttp) {
          throw new Error("hass.request is disabled (CODE_MODE_ALLOW_RAW_HTTP=false)");
        }
        return hassRequest(payload, context);
      case "hass.getServices":
        return getHassServices(context);
      case "hass.getConfig":
        return getHassConfig(context);
      case "hass.getHistory":
        return getHassHistory(payload, context);
      case "tools.list":
        return listTools();
      case "tools.call":
        if (!config.allowToolCalls) {
          throw new Error("tools.call is disabled (CODE_MODE_ALLOW_TOOL_CALLS=false)");
        }
        return callTool(payload);
      case "sleep":
        return sleep(payload, context);
      default:
        throw new Error(`Unknown Code Mode operation: ${operation}`);
    }
  };
}
