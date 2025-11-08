/**
 * MCP Server Configuration
 * 
 * This file re-exports the configuration from config.ts for compatibility.
 * All configuration logic is in config.ts with schema validation.
 */

import { loadEnvironmentVariables } from './config/loadEnv.js';
import { APP_CONFIG as TYPED_CONFIG } from './config.ts';

// Load environment variables
loadEnvironmentVariables();

// Re-export the typed config for compatibility with imports using config.js
export const APP_CONFIG = {
    // Map camelCase to UPPER_CASE for backward compatibility
    PORT: TYPED_CONFIG.port,
    NODE_ENV: TYPED_CONFIG.environment,
    EXECUTION_TIMEOUT: TYPED_CONFIG.executionTimeout,
    STREAMING_ENABLED: TYPED_CONFIG.streamingEnabled,
    USE_STDIO_TRANSPORT: TYPED_CONFIG.useStdioTransport,
    USE_HTTP_TRANSPORT: TYPED_CONFIG.useHttpTransport,
    DEBUG_MODE: TYPED_CONFIG.debugMode,
    DEBUG_STDIO: TYPED_CONFIG.debugStdio,
    DEBUG_HTTP: TYPED_CONFIG.debugHttp,
    SILENT_STARTUP: TYPED_CONFIG.silentStartup,
    CORS_ORIGIN: TYPED_CONFIG.corsOrigin,
    // Also export camelCase for consistency
    ...TYPED_CONFIG
};

export default APP_CONFIG; 