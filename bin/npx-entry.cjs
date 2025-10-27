#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Set environment variable - enable stdio transport
process.env.USE_STDIO_TRANSPORT = 'true';

// Check if we're being called from Cursor (check for Cursor specific env vars)
const isCursor = process.env.CURSOR_SESSION || process.env.CURSOR_CHANNEL;

    // For Cursor, we need to ensure consistent stdio handling
    if (isCursor) {
        // Essential for Cursor compatibility
        process.env.LOG_LEVEL = 'info';
        process.env.CURSOR_COMPATIBLE = 'true';

        // Ensure we have a clean environment for Cursor
        delete process.env.SILENT_MCP_RUNNING;
    } else {
        // For normal operation, use error level (minimal logging)
        process.env.LOG_LEVEL = 'error';
    }

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Check if .env exists, create from example if not
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
}

// Define a function to ensure the child process is properly cleaned up on exit
function setupCleanExit(childProcess) {
    const exitHandler = () => {
        if (childProcess && !childProcess.killed) {
            childProcess.kill();
        }
        process.exit();
    };

    // Handle various termination signals
    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);
    process.on('exit', exitHandler);
}

// Start the MCP server
try {
    // Critical: For Cursor, we need a very specific execution environment
    if (isCursor) {
        // Careful process cleanup for Cursor (optional but can help)
        try {
            const { execSync } = require('child_process');
            execSync('pkill -f "node.*stdio-server" || true', { stdio: 'ignore' });
        } catch (e) {
            // Ignore errors from process cleanup
        }

        // Allow some time for process cleanup
        setTimeout(() => {
            const scriptPath = path.join(__dirname, 'mcp-stdio.cjs');

            // For Cursor, we need very specific stdio handling
            // Using pipe for both stdin and stdout is critical
            const childProcess = spawn('node', [scriptPath], {
                stdio: ['pipe', 'pipe', 'pipe'], // All piped for maximum control
                env: {
                    ...process.env,
                    USE_STDIO_TRANSPORT: 'true',
                    CURSOR_COMPATIBLE: 'true',
                    // Make sure stdin/stdout are treated as binary
                    NODE_OPTIONS: '--no-force-async-hooks-checks'
                }
            });

            // Ensure no buffering to prevent missed messages 
            childProcess.stdin.setDefaultEncoding('utf8');

            // Create bidirectional pipes
            process.stdin.pipe(childProcess.stdin);
            childProcess.stdout.pipe(process.stdout);
            childProcess.stderr.pipe(process.stderr);

            // Setup error handling
            childProcess.on('error', (err) => {
                console.error('Failed to start server:', err.message);
                process.exit(1);
            });

            // Ensure child process is properly cleaned up
            setupCleanExit(childProcess);

        }, 500); // Short delay to ensure clean start
    }
    // For regular use, if silent-mcp.sh exists, use it
    else if (!isCursor && fs.existsSync(path.join(process.cwd(), 'silent-mcp.sh')) &&
        fs.statSync(path.join(process.cwd(), 'silent-mcp.sh')).isFile()) {
        // Execute the silent-mcp.sh script
        const childProcess = spawn('/bin/bash', [path.join(process.cwd(), 'silent-mcp.sh')], {
            stdio: ['inherit', 'inherit', 'ignore'], // Redirect stderr to /dev/null
            env: {
                ...process.env,
                USE_STDIO_TRANSPORT: 'true',
                LOG_LEVEL: 'error'
            }
        });

        childProcess.on('error', (err) => {
            console.error('Failed to start server:', err.message);
            process.exit(1);
        });

        // Ensure child process is properly cleaned up
        setupCleanExit(childProcess);
    }
    // Otherwise run normally (direct non-Cursor)
    else {
        const scriptPath = path.join(__dirname, 'mcp-stdio.cjs');

        // Try to use Bun if available, otherwise fall back to Node.js
        const runtime = process.env.BUN_INSTALL ? 'bun' : 'node';

        const childProcess = spawn(runtime, [scriptPath], {
            stdio: ['inherit', 'inherit', 'inherit'], // All stdio modes inherited for proper streaming
            env: {
                ...process.env,
                USE_STDIO_TRANSPORT: 'true'
            }
        });

        childProcess.on('error', (err) => {
            // If Bun not found, retry with Node.js
            if (runtime === 'bun' && err.code === 'ENOENT') {
                const nodeProcess = spawn('node', [scriptPath], {
                    stdio: ['inherit', 'inherit', 'inherit'],
                    env: {
                        ...process.env,
                        USE_STDIO_TRANSPORT: 'true'
                    }
                });

                nodeProcess.on('error', (nodeErr) => {
                    console.error('Failed to start server:', nodeErr.message);
                    process.exit(1);
                });

                nodeProcess.on('exit', (code) => {
                    process.exit(code || 0);
                });

                setupCleanExit(nodeProcess);
                return;
            }

            console.error('Failed to start server:', err.message);
            process.exit(1);
        });

        // Exit when child exits (critical fix for npx behavior)
        childProcess.on('exit', (code) => {
            process.exit(code || 0);
        });

        // Ensure child process is properly cleaned up
        setupCleanExit(childProcess);
    }
} catch (error) {
    console.error('Error starting server:', error.message);
    process.exit(1);
} 