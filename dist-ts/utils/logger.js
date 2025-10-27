/**
 * Logger Module
 *
 * This module provides a consistent logging interface for all MCP components.
 * It handles log formatting, error handling, and ensures log output is directed
 * to the appropriate destination based on the runtime environment.
 */
import winston from 'winston';
import path from 'path';
import fs from 'fs';
// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
// Special handling for stdio mode to ensure stdout stays clean for JSON-RPC
const isStdioMode = process.env.USE_STDIO_TRANSPORT === 'true';
const isDebugStdio = process.env.DEBUG_STDIO === 'true';
// Create base format that works with TypeScript
const baseFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.json());
// Create logger with appropriate transports
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'error',
    format: baseFormat,
    defaultMeta: { service: 'mcp-server' },
    transports: [
        // Always log to files
        new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logsDir, 'combined.log') })
    ]
});
// Handle console output based on environment
if (process.env.NODE_ENV !== 'production' || process.env.CONSOLE_LOGGING === 'true') {
    // Only add console/stderr logging if NOT in standard stdio mode
    if (!isStdioMode) {
        // Use console transport in normal (non-stdio) mode
        logger.add(new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
        }));
    }
    else if (isDebugStdio) {
        // If in stdio mode AND debug is specifically enabled, log simple format to stderr
        logger.add(new winston.transports.Stream({
            stream: process.stderr,
            format: winston.format.combine(winston.format.simple() // Keep stderr logs simple
            )
        }));
    }
    // Implicit else: If isStdioMode is true and isDebugStdio is false, add NO console/stderr transport.
}
// Export the winston logger with MCPLogger interface
export { logger };
// Export default logger for convenience
export default logger;
