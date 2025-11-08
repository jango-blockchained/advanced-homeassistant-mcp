/**
 * Configuration for the Model Context Protocol (MCP) server
 * Values can be overridden using environment variables
 */

import { loadEnvironmentVariables } from './config/loadEnv.js';
import { MCPServerConfigSchema, MCPServerConfigType } from './schemas/config.schema.js';
import { logger } from './utils/logger.js';

// Load environment variables before loading config
loadEnvironmentVariables();

function loadConfig(): MCPServerConfigType {
    try {
        const rawConfig = {
            // Server configuration
            port: parseInt(process.env.PORT || '3000', 10),
            environment: process.env.NODE_ENV || 'development',

            // Execution settings
            executionTimeout: parseInt(process.env.EXECUTION_TIMEOUT || '30000', 10),
            streamingEnabled: process.env.STREAMING_ENABLED === 'true',

            // Transport settings
            useStdioTransport: process.env.USE_STDIO_TRANSPORT === 'true',
            useHttpTransport: process.env.USE_HTTP_TRANSPORT === 'true',

            // Debug and logging
            debugMode: process.env.DEBUG_MODE === 'true',
            debugStdio: process.env.DEBUG_STDIO === 'true',
            debugHttp: process.env.DEBUG_HTTP === 'true',
            silentStartup: process.env.SILENT_STARTUP === 'true',

            // CORS settings
            corsOrigin: process.env.CORS_ORIGIN || '*',

            // Rate limiting
            rateLimit: {
                maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
                maxAuthRequests: parseInt(process.env.RATE_LIMIT_MAX_AUTH_REQUESTS || '5', 10),
            },
        };

        // Validate and parse configuration
        const validatedConfig = MCPServerConfigSchema.parse(rawConfig);

        // Log validation success
        if (!validatedConfig.silentStartup) {
            logger.info('Configuration validated successfully');
            if (validatedConfig.debugMode) {
                logger.debug('Current configuration:', validatedConfig);
            }
        }

        return validatedConfig;
    } catch (error) {
        // Log validation errors
        logger.error('Configuration validation failed:', error);
        throw new Error('Invalid configuration. Please check your environment variables.');
    }
}

export const APP_CONFIG = loadConfig();
export type { MCPServerConfigType };
export default APP_CONFIG; 