/**
 * Code Mode: give the model two tools (`search` and `execute`) instead of a
 * large flat tool list. See `docs-site/src/content/docs/guides/code-mode.mdx`.
 */

export {
  getCodeModeConfig,
  getCodeModeMode,
  isCodeModeEnabled,
  type CodeModeConfig,
  type CodeModeMode,
} from "./config.js";
export { buildCodeModeSpec, toToolSpec, type CodeModeSpec } from "./catalog.js";
export { createHostBridge, type HostBridge, type HostCallContext } from "./bridge.js";
export {
  CodeModeSandboxError,
  CodeModeTimeoutError,
  runInSandbox,
  type SandboxOptions,
  type SandboxResult,
} from "./sandbox.js";
export { codeModeExecuteTool, codeModeSearchTool, codeModeTools } from "./tools.js";
