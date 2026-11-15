/**
 * QuickJS-based sandbox for Code Mode.
 *
 * `node:vm` is explicitly not a security boundary, and in Bun it is not even a
 * reliable one: `this.constructor.constructor("return process")()` escapes the
 * context. Code Mode therefore runs generated code in a real QuickJS VM
 * compiled to WebAssembly. The sandbox has no filesystem, no environment, no
 * `require`, and no `fetch`; the only host capability is the single
 * `__codemode_host` bridge, which exchanges JSON strings.
 */

import { newQuickJSAsyncWASMModule, type QuickJSHandle } from "quickjs-emscripten";
import { logger } from "../utils/logger.js";
import { getCodeModeConfig } from "./config.js";
import { safeJsonStringify, type HostBridge } from "./bridge.js";

export interface SandboxOptions {
  code: string;
  bridge: HostBridge;
  /** Optional JSON-safe object exposed as `spec` inside the sandbox. */
  spec?: unknown;
  timeoutMs: number;
  maxOutputBytes: number;
  memoryLimitBytes: number;
  maxStackSizeBytes: number;
  /** Maximum sandboxes running concurrently; defaults to config `CODE_MODE_MAX_CONCURRENT`. */
  maxConcurrent?: number;
}

export interface SandboxResult {
  value: unknown;
  logs: string[];
  durationMs: number;
}

export class CodeModeTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Code execution timed out after ${timeoutMs}ms`);
    this.name = "CodeModeTimeoutError";
  }
}

export class CodeModeSandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeModeSandboxError";
  }
}

type PendingJobsResult =
  | { ok: true; executed: number }
  | { ok: false; handle: QuickJSHandle };

interface MutablePointerArray {
  value: { ptr: number; typedArray: Int32Array };
  dispose(): void;
}

/**
 * Build an async drain for QuickJS's pending job queue (`JS_ExecutePendingJob`).
 *
 * Guest promise continuations only run when the host pumps them. Guest jobs
 * may call the asyncified `__codemode_host` bridge, which unwinds the Wasm
 * stack via Asyncify. Such a job can therefore never be executed through the
 * library's synchronous `executePendingJobs()`: the unwind returns a dummy
 * value through the sync FFI and the caller cannot tell the call suspended,
 * so it reads a garbage out-parameter (or, with the asyncify debug build,
 * trips the "is running asynchronously" assertion) and corrupts the runtime.
 *
 * The fix funnels the drain through the module's `cwrap` with `{async: true}`,
 * the same path `evalCodeAsync` uses for `QTS_Eval_MaybeAsync`. Emscripten
 * then routes the call through `ccall`, which detects the Asyncify unwind and
 * returns a Promise that resolves once the host call settles and the Wasm
 * stack is replayed; when nothing suspends, it resolves with the plain value.
 * Without this, no unwind information reaches the caller.
 *
 * `newQuickJSAsyncWASMModule().module.cwrap` and friends are marked
 * `protected`/`private` in the type declarations but are stable at runtime
 * for this pinned dependency; the shape is verified defensively here and a
 * missing piece throws a CodeModeSandboxError instead of corrupting state.
 */
function createPendingJobsRunner(
  quickJS: unknown,
  runtime: unknown,
  vm: {
    typeof(handle: QuickJSHandle): string;
    getNumber(handle: QuickJSHandle): number;
    getMemory(rt: number): { heapValueHandle(ptr: number): QuickJSHandle };
  },
): (maxJobsToExecute: number) => Promise<PendingJobsResult> {
  const internalsOf = quickJS as {
    module?: {
      cwrap?: (
        name: string,
        returnType: string,
        argTypes: string[],
        options?: { async?: boolean },
      ) => (rtPtr: number, maxJobs: number, ctxPtrOut: number) => number | Promise<number>;
    };
    ffi?: { QTS_FreeValuePointerRuntime?: (rt: number, ptr: number) => void };
  };
  const module_ = internalsOf.module;
  const freeValuePointer = internalsOf.ffi?.QTS_FreeValuePointerRuntime;
  const internals = runtime as {
    rt: { value: number };
    memory: { newMutablePointerArray(length: number): MutablePointerArray };
  };
  if (
    typeof module_?.cwrap !== "function" ||
    typeof freeValuePointer !== "function" ||
    !internals.rt ||
    typeof internals.rt.value !== "number" ||
    typeof internals.memory?.newMutablePointerArray !== "function"
  ) {
    throw new CodeModeSandboxError(
      "quickjs-emscripten asyncify internals are unavailable; cannot pump pending jobs safely",
    );
  }
  const call = module_.cwrap(
    "QTS_ExecutePendingJob",
    "number",
    ["number", "number", "number"],
    { async: true },
  );
  const rtPtr = internals.rt.value;

  return async function runPendingJobs(maxJobsToExecute) {
    const ctxPtrOut = internals.memory.newMutablePointerArray(1);
    let valuePtr: number;
    try {
      valuePtr = Number(await call(rtPtr, maxJobsToExecute, ctxPtrOut.value.ptr));
    } catch (error) {
      ctxPtrOut.dispose();
      throw error;
    }
    const ctxPtr = ctxPtrOut.value.typedArray[0];
    ctxPtrOut.dispose();

    if (ctxPtr === 0) {
      // No job ran (or nothing to report); the returned value is ours to free.
      freeValuePointer(rtPtr, valuePtr);
      return { ok: true, executed: 0 };
    }
    const handle = vm.getMemory(rtPtr).heapValueHandle(valuePtr);
    if (vm.typeof(handle) === "number") {
      const executed = vm.getNumber(handle);
      handle.dispose();
      return { ok: true, executed };
    }
    return { ok: false, handle };
  };
}

/**
 * Bootstrap code runs inside QuickJS before user code.
 *
 * `__codemode_host` is the only async host function. Everything the model sees
 * (`hass`, `tools`, `sleep`, `console`) is a QuickJS-native wrapper around it,
 * so no host object or host `Error` ever crosses the boundary.
 */
const BOOTSTRAP = String.raw`
(() => {
  const call = async (op, payload) => {
    const raw = await __codemode_host(
      op,
      JSON.stringify(payload === undefined ? null : payload),
    );
    const response = JSON.parse(raw);
    if (!response.ok) {
      const error = new Error(response.error || "Host call failed");
      if (response.name) error.name = response.name;
      throw error;
    }
    return response.value;
  };

  const hass = Object.freeze({
    getStates: () => call("hass.getStates"),
    getState: (entity_id) => call("hass.getState", { entity_id }),
    callService: (domain, service, data) =>
      call("hass.callService", { domain, service, data }),
    request: (options) => call("hass.request", options),
    getServices: () => call("hass.getServices"),
    getConfig: () => call("hass.getConfig"),
    getHistory: (options) => call("hass.getHistory", options),
  });

  const tools = Object.freeze({
    list: () => call("tools.list"),
    call: (name, args) => call("tools.call", { name, args }),
  });

  const format = (value) => {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  globalThis.hass = hass;
  globalThis.tools = tools;
  globalThis.sleep = (ms) => call("sleep", { ms });
  globalThis.console = Object.freeze({
    log: (...args) => __codemode_log(args.map(format).join(" ")),
    info: (...args) => __codemode_log(args.map(format).join(" ")),
    warn: (...args) => __codemode_log("WARN " + args.map(format).join(" ")),
    error: (...args) => __codemode_log("ERROR " + args.map(format).join(" ")),
  });
})();
`;

function dumpError(
  vm: { dump: (handle: QuickJSHandle) => unknown },
  handle: QuickJSHandle,
): string {
  try {
    const dumped = vm.dump(handle);
    if (typeof dumped === "string") return dumped;
    if (dumped !== null && typeof dumped === "object") {
      const record = dumped as { name?: unknown; message?: unknown; stack?: unknown };
      if (typeof record.message === "string") {
        const name = typeof record.name === "string" ? record.name : "Error";
        return `${name}: ${record.message}`;
      }
      if (typeof record.stack === "string") return record.stack;
      return safeJsonStringify(dumped);
    }
    return String(dumped);
  } catch {
    return "Unknown sandbox error";
  }
}

function normalizeError(raw: string, timeoutMs: number): Error {
  if (/interrupt/i.test(raw)) {
    return new CodeModeTimeoutError(timeoutMs);
  }
  return new CodeModeSandboxError(raw);
}

/**
 * Module-level semaphore capping concurrent sandbox executions. Each execution
 * owns a WASM module, so unbounded concurrency would multiply memory usage.
 * Queued executions wait for a slot; the wait happens before the deadline is
 * set, so time spent queued does not eat the execution budget.
 */
let activeSandboxes = 0;
const sandboxWaiters: Array<() => void> = [];

async function acquireSandboxSlot(limit: number): Promise<void> {
  if (activeSandboxes < limit) {
    activeSandboxes += 1;
    return;
  }
  // The slot is handed off directly by releaseSandboxSlot (no decrement),
  // so this continuation resumes owning a slot already counted.
  await new Promise<void>((resolve) => {
    sandboxWaiters.push(resolve);
  });
}

function releaseSandboxSlot(): void {
  const next = sandboxWaiters.shift();
  if (next) {
    next();
    return;
  }
  activeSandboxes -= 1;
}

/** Number of interrupted modules discarded so far (see runInSandbox cleanup). */
let interruptedModuleCount = 0;

/**
 * Execute an async arrow function in the sandbox.
 *
 * The function receives the globals installed by the bootstrap and must return
 * a JSON-serializable value. `undefined` is normalized to `null`.
 */
export async function runInSandbox(options: SandboxOptions): Promise<SandboxResult> {
  const maxConcurrent = options.maxConcurrent ?? getCodeModeConfig().maxConcurrent;
  await acquireSandboxSlot(maxConcurrent);
  try {
    return await runInSandboxInner(options);
  } finally {
    releaseSandboxSlot();
  }
}

async function runInSandboxInner(options: SandboxOptions): Promise<SandboxResult> {
  const { code, bridge, spec, timeoutMs, maxOutputBytes, memoryLimitBytes, maxStackSizeBytes } =
    options;

  const startTime = Date.now();
  // The deadline is set after the VM is bootstrapped so module creation does
  // not eat the user's execution budget. Until then the interrupt handler is
  // effectively disabled.
  let deadline = Number.POSITIVE_INFINITY;
  // Each execution gets its own WebAssembly module. QuickJS's asyncify build
  // permits only one async call at a time per module, and an interrupted
  // module can be left corrupted. A fresh module keeps executions isolated and
  // allows concurrent MCP requests.
  const quickJS = await newQuickJSAsyncWASMModule();

  let interrupted = false;
  const runtime = quickJS.newRuntime({
    interruptHandler: () => {
      const hit = Date.now() > deadline;
      if (hit) interrupted = true;
      return hit;
    },
    memoryLimitBytes,
    maxStackSizeBytes,
  });
  const vm = runtime.newContext();

  let settled = false;
  let sandboxSettled = false;
  let timedOut = false;
  let resolveDone!: (result: { value?: string; error?: string }) => void;
  const done = new Promise<{ value?: string; error?: string }>((resolve) => {
    resolveDone = resolve;
  });

  const logs: string[] = [];
  const controller = new AbortController();

  const settle = (result: { value?: string; error?: string }): void => {
    if (settled) return;
    settled = true;
    resolveDone(result);
  };

  const hostFunction = vm.newAsyncifiedFunction(
    "__codemode_host",
    async (operationHandle, payloadHandle) => {
      const operation = String(vm.dump(operationHandle));
      let payload: unknown = null;
      try {
        payload = JSON.parse(String(vm.dump(payloadHandle)));
      } catch {
        payload = null;
      }

      try {
        if (controller.signal.aborted || Date.now() > deadline) {
          throw new CodeModeTimeoutError(timeoutMs);
        }

        const work = bridge(operation, payload, {
          deadline,
          signal: controller.signal,
        });
        // If the execution times out, stop waiting on the host call even if the
        // underlying HA client has no abort support. The original promise is
        // left to settle in the background.
        work.catch(() => undefined);

        let onAbort: (() => void) | undefined;
        const aborted = new Promise<never>((_resolve, reject) => {
          onAbort = (): void => reject(new CodeModeTimeoutError(timeoutMs));
          if (controller.signal.aborted) {
            onAbort();
          } else {
            controller.signal.addEventListener("abort", onAbort, { once: true });
          }
        });

        try {
          const value = await Promise.race([work, aborted]);
          return vm.newString(safeJsonStringify({ ok: true, value }));
        } finally {
          if (onAbort) controller.signal.removeEventListener("abort", onAbort);
        }
      } catch (error) {
        return vm.newString(
          safeJsonStringify({
            ok: false,
            name: error instanceof Error ? error.name : "Error",
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
  );
  vm.setProp(vm.global, "__codemode_host", hostFunction);
  hostFunction.dispose();

  const logFunction = vm.newFunction("__codemode_log", (lineHandle) => {
    if (logs.length >= 200) return;
    const line: unknown = vm.dump(lineHandle);
    if (typeof line === "string") {
      const clean = line.replace(/[\r\n]+/g, " ");
      logs.push(clean.length > 4_000 ? `${clean.slice(0, 4_000)}…` : clean);
    }
  });
  vm.setProp(vm.global, "__codemode_log", logFunction);
  logFunction.dispose();

  const doneFunction = vm.newFunction("__codemode_done", (valueHandle) => {
    sandboxSettled = true;
    const raw: unknown = vm.dump(valueHandle);
    if (typeof raw !== "string") {
      settle({ error: "Code Mode result must be JSON-serializable" });
      return;
    }
    const rawByteLength = new TextEncoder().encode(raw).length;
    if (rawByteLength > maxOutputBytes) {
      settle({
        error: `Code Mode result is ${rawByteLength} bytes; the limit is ${maxOutputBytes} bytes`,
      });
      return;
    }
    settle({ value: raw });
  });
  vm.setProp(vm.global, "__codemode_done", doneFunction);
  doneFunction.dispose();

  const failFunction = vm.newFunction("__codemode_fail", (errorHandle) => {
    sandboxSettled = true;
    settle({ error: dumpError(vm, errorHandle) });
  });
  vm.setProp(vm.global, "__codemode_fail", failFunction);
  failFunction.dispose();

  const disposeVm = (): void => {
    try {
      vm.dispose();
    } catch (error) {
      logger.debug(
        `[code-mode] sandbox dispose failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  try {
    const bootstrap = vm.evalCode(BOOTSTRAP);
    if (bootstrap.error) {
      const message = dumpError(vm, bootstrap.error);
      bootstrap.error.dispose();
      disposeVm();
      throw new CodeModeSandboxError(`Failed to initialize sandbox: ${message}`);
    }
    bootstrap.value.dispose();

    if (spec !== undefined) {
      const specJson = JSON.stringify(spec);
      const injected = vm.evalCode(`globalThis.spec = JSON.parse(${JSON.stringify(specJson)});`);
      if (injected.error) {
        const message = dumpError(vm, injected.error);
        injected.error.dispose();
        disposeVm();
        throw new CodeModeSandboxError(`Failed to inject spec: ${message}`);
      }
      injected.value.dispose();
    }
  } catch (error) {
    if (!settled) settle({ error: error instanceof Error ? error.message : String(error) });
    throw error;
  }

  deadline = Date.now() + timeoutMs;

  // QuickJS jobs (promise continuations) only run while the host pumps them.
  // The asyncified host bridge suspends the Wasm stack while a host call is
  // in flight, so any job may itself unwind out of whatever export executes
  // it. Pumping through the synchronous `executePendingJobs()` lets such a
  // job unwind through an export that cannot report the suspension, which
  // corrupts the Asyncify state machine. Drain jobs through an asyncified
  // call instead, and never pump re-entrantly.
  let runPendingJobs: (maxJobsToExecute: number) => Promise<PendingJobsResult>;
  try {
    runPendingJobs = createPendingJobsRunner(quickJS, runtime, vm);
  } catch (error) {
    disposeVm();
    throw error;
  }
  let drainRunning = false;
  const drainJobs = async (): Promise<void> => {
    if (drainRunning) return;
    drainRunning = true;
    try {
      for (;;) {
        if (sandboxSettled) return;
        if (!runtime.hasPendingJob()) return;
        let result: PendingJobsResult;
        try {
          result = await runPendingJobs(-1);
        } catch (error) {
          settle({ error: error instanceof Error ? error.message : String(error) });
          return;
        }
        if (!result.ok) {
          const message = dumpError(vm, result.handle);
          result.handle.dispose();
          settle({ error: message });
          return;
        }
        if (result.executed === 0) return;
      }
    } finally {
      drainRunning = false;
    }
  };
  const pump = setInterval(() => {
    void drainJobs();
  }, 1);
  pump.unref?.();

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    settle({ error: new CodeModeTimeoutError(timeoutMs).message });
  }, timeoutMs);
  timer.unref?.();

  const wrapped = `(async () => {
    try {
      const fn = (${code});
      if (typeof fn !== "function") {
        throw new Error("code must evaluate to an async arrow function");
      }
      const result = await fn();
      __codemode_done(JSON.stringify(result === undefined ? null : result));
    } catch (error) {
      const name = (error && error.name) || "Error";
      const message = (error && error.message) || String(error);
      const stack = (error && error.stack) ? "\\n" + error.stack : "";
      __codemode_fail(name + ": " + message + stack);
    }
  })()`;

  void vm
    .evalCodeAsync(wrapped)
    .then((result) => {
      if (result.error) {
        const message = dumpError(vm, result.error);
        result.error.dispose();
        if (!sandboxSettled) settle({ error: normalizeError(message, timeoutMs).message });
      } else {
        result.value.dispose();
      }
    })
    .catch((error: unknown) => {
      if (!sandboxSettled) {
        settle({ error: error instanceof Error ? error.message : String(error) });
      }
    });

  const outcome = await done;

  clearInterval(pump);
  clearTimeout(timer);

  // Disposing a runtime that was interrupted mid-execution can make QuickJS
  // abort the WASM module while unwinding. A suspended async call (the usual
  // timeout case) disposes cleanly, so only skip the interrupt case. Each
  // execution owns its own module, so a skipped dispose is reclaimed by GC.
  if (!interrupted || sandboxSettled) {
    disposeVm();
  } else {
    interruptedModuleCount += 1;
    logger.warn(
      `[code-mode] discarding interrupted QuickJS module (total ${interruptedModuleCount})`,
    );
  }

  const durationMs = Date.now() - startTime;
  // The interrupt handler usually fires slightly before the host timer, so
  // `timedOut` can still be false even though the deadline stopped execution.
  const hitDeadline =
    timedOut || interrupted || (outcome.error !== undefined && Date.now() >= deadline);

  if (hitDeadline && outcome.error !== undefined) {
    throw new CodeModeTimeoutError(timeoutMs);
  }
  if (outcome.error !== undefined) {
    throw normalizeError(outcome.error, timeoutMs);
  }

  let value: unknown = null;
  if (outcome.value !== undefined) {
    try {
      value = JSON.parse(outcome.value) as unknown;
    } catch {
      value = outcome.value;
    }
  }

  return { value, logs, durationMs };
}
