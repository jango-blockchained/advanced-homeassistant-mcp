/**
 * Code Mode configuration.
 *
 * Code Mode replaces a large tool surface with two tools — `search` and
 * `execute` — that let the model write JavaScript against a typed SDK. The
 * code runs inside a QuickJS WASM sandbox (see `sandbox.ts`), not in the
 * host Node/Bun process.
 *
 * The mode is opt-in so existing deployments keep their current tool list:
 *
 *   CODE_MODE=off   (default) classic tools only
 *   CODE_MODE=only  expose `search` + `execute` only
 *   CODE_MODE=both  expose classic tools and the two Code Mode tools
 */

export type CodeModeMode = "off" | "only" | "both";

const ONLY_VALUES = new Set(["1", "true", "yes", "on", "only", "code"]);
const BOTH_VALUES = new Set(["both", "all", "add"]);

/**
 * Resolve the Code Mode mode from `CODE_MODE`.
 *
 * Unknown values fall back to `off` rather than throwing: a typo in an env
 * var should not prevent the server from starting.
 */
export function getCodeModeMode(): CodeModeMode {
  const raw = (process.env.CODE_MODE ?? "").trim().toLowerCase();
  if (ONLY_VALUES.has(raw)) return "only";
  if (BOTH_VALUES.has(raw)) return "both";
  return "off";
}

/** Whether Code Mode is enabled at all. */
export function isCodeModeEnabled(): boolean {
  return getCodeModeMode() !== "off";
}

function readPositiveInt(name: string, fallback: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

export interface CodeModeConfig {
  mode: CodeModeMode;
  /** Wall-clock budget for one `search`/`execute` call. */
  timeoutMs: number;
  /** Maximum JSON-serialized result returned to the model. */
  maxOutputBytes: number;
  /** QuickJS heap limit per execution. */
  memoryLimitBytes: number;
  /** QuickJS stack limit per execution. */
  maxStackSizeBytes: number;
  /** Allow `tools.call(...)` from sandboxed code. */
  allowToolCalls: boolean;
  /** Allow `hass.request(...)` (raw Home Assistant REST) from sandboxed code. */
  allowRawHttp: boolean;
  /** Maximum number of host bridge calls allowed per execution. */
  maxHostCalls: number;
  /** Maximum number of sandboxes executing concurrently. */
  maxConcurrent: number;
}

/** Read Code Mode settings from the environment. */
export function getCodeModeConfig(): CodeModeConfig {
  return {
    mode: getCodeModeMode(),
    timeoutMs: readPositiveInt("CODE_MODE_TIMEOUT_MS", 30_000, 300_000),
    maxOutputBytes: readPositiveInt("CODE_MODE_MAX_OUTPUT_BYTES", 256 * 1024, 4 * 1024 * 1024),
    memoryLimitBytes: readPositiveInt(
      "CODE_MODE_MEMORY_LIMIT_BYTES",
      64 * 1024 * 1024,
      512 * 1024 * 1024,
    ),
    maxStackSizeBytes: readPositiveInt("CODE_MODE_MAX_STACK_BYTES", 1024 * 1024, 16 * 1024 * 1024),
    allowToolCalls: readBoolean("CODE_MODE_ALLOW_TOOL_CALLS", true),
    allowRawHttp: readBoolean("CODE_MODE_ALLOW_RAW_HTTP", true),
    maxHostCalls: readPositiveInt("CODE_MODE_MAX_HOST_CALLS", 100, 10_000),
    maxConcurrent: readPositiveInt("CODE_MODE_MAX_CONCURRENT", 4, 16),
  };
}
