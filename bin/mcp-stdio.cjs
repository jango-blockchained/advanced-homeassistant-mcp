#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

/**
 * MCP Server - Stdio Transport Mode (CommonJS)
 * 
 * This is the CommonJS entry point for running the MCP server via NPX in stdio mode.
 * It will delegate to the built stdio-server.js file.
 */

// Set environment variable for stdio transport
process.env.USE_STDIO_TRANSPORT = 'true';

// Load environment variables from .env file (if exists)
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    } else {
        // Load .env.example if it exists
        const examplePath = path.resolve(process.cwd(), '.env.example');
        if (fs.existsSync(examplePath)) {
            dotenv.config({ path: examplePath });
        }
    }
} catch (error) {
    // Silent error handling
}

// Ensure logs directory exists
try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
} catch (error) {
    // Silent error handling
}

// Try to spawn the server
try {
    // Check for simplified stdio server build first (preferred for CLI usage)
    const stdioServerPath = path.resolve(__dirname, '../dist/stdio-server.js');

    if (fs.existsSync(stdioServerPath)) {
        // Use Node.js for NPM/NPX compatibility
        const runtime = 'node';

        const serverProcess = spawn(runtime, [stdioServerPath], {
            stdio: ['inherit', 'inherit', 'inherit'],
            env: {
                ...process.env,
                USE_STDIO_TRANSPORT: 'true'
            }
        });

        // Exit when the server process exits
        serverProcess.on('exit', (code) => {
            process.exit(code || 0);
        });

        // Handle errors
        serverProcess.on('error', (err) => {
            console.error('Failed to start stdio server:', err.message);
            process.exit(1);
        });

        // Propagate signals
        process.on('SIGINT', () => serverProcess.kill('SIGINT'));
        process.on('SIGTERM', () => serverProcess.kill('SIGTERM'));
    } else {
        // Fall back to full server if available
        const fullServerPath = path.resolve(__dirname, '../dist/index.js');

        if (fs.existsSync(fullServerPath)) {
            const runtime = 'node';

            const serverProcess = spawn(runtime, [fullServerPath], {
                stdio: ['inherit', 'inherit', 'inherit'],
                env: {
                    ...process.env,
                    USE_STDIO_TRANSPORT: 'true'
                }
            });

            // Exit when the server process exits
            serverProcess.on('exit', (code) => {
                process.exit(code || 0);
            });

            // Handle errors
            serverProcess.on('error', (err) => {
                console.error('Failed to start server:', err.message);
                process.exit(1);
            });

            // Propagate signals
            process.on('SIGINT', () => serverProcess.kill('SIGINT'));
            process.on('SIGTERM', () => serverProcess.kill('SIGTERM'));
        } else {
            console.error('Error: No server implementation found. Please build the project first.');
            process.exit(1);
        }
    }
} catch (error) {
    console.error('Error starting server:', error.message);
    process.exit(1);
} 