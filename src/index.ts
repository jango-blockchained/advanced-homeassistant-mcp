/**
 * Home Assistant Model Context Protocol (MCP) Server
 * A standardized protocol for AI tools to interact with Home Assistant
 */

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { MCPServer } from './mcp/MCPServer.js';
import { loggingMiddleware, timeoutMiddleware } from './mcp/middleware/index.js';
import { StdioTransport } from './mcp/transports/stdio.transport.js';
import { HttpTransport } from './mcp/transports/http.transport.js';
import { APP_CONFIG } from './config.js';
import { logger } from "./utils/logger.js";
import { openApiConfig } from './openapi.js';
import { apiLimiter, authLimiter } from './middleware/rate-limit.middleware.js';
import { SecurityMiddleware } from './security/enhanced-middleware.js';

// Home Assistant tools
import { LightsControlTool } from './tools/homeassistant/lights.tool.js';
import { ClimateControlTool } from './tools/homeassistant/climate.tool.js';

// Home Assistant optional tools - these can be added as needed
// import { ControlTool } from './tools/control.tool.js';
// import { SceneTool } from './tools/scene.tool.js';
// import { AutomationTool } from './tools/automation.tool.js';
// import { NotifyTool } from './tools/notify.tool.js';
// import { ListDevicesTool } from './tools/list-devices.tool.js';
// import { HistoryTool } from './tools/history.tool.js';

/**
 * Check if running in stdio mode via command line args
 */
function isStdioMode(): boolean {
  return process.argv.includes('--stdio');
}

/**
 * Main function to start the MCP server
 */
async function main() {
  logger.info('Starting Home Assistant MCP Server...');

  // Check if we're in stdio mode from command line
  const useStdio = isStdioMode() || APP_CONFIG.useStdioTransport;

  // Configure server
  const EXECUTION_TIMEOUT = APP_CONFIG.executionTimeout;
  const STREAMING_ENABLED = APP_CONFIG.streamingEnabled;

  // Get the server instance (singleton)
  const server = MCPServer.getInstance();

  // Register Home Assistant tools
  server.registerTool(new LightsControlTool());
  server.registerTool(new ClimateControlTool());

  // Add optional tools here as needed
  // server.registerTool(new ControlTool());
  // server.registerTool(new SceneTool());
  // server.registerTool(new NotifyTool());
  // server.registerTool(new ListDevicesTool());
  // server.registerTool(new HistoryTool());

  // Add middlewares
  server.use(loggingMiddleware);
  server.use(timeoutMiddleware(EXECUTION_TIMEOUT));

  // Initialize transports
  if (useStdio) {
    logger.info('Using Standard I/O transport');

    // Create and configure the stdio transport with debug enabled for stdio mode
    const stdioTransport = new StdioTransport({
      debug: true, // Always enable debug in stdio mode for better visibility
      silent: false // Never be silent in stdio mode
    });

    // Explicitly set the server reference to ensure access to tools
    stdioTransport.setServer(server);

    // Register the transport
    server.registerTransport(stdioTransport);

    // Special handling for stdio mode - don't start other transports
    if (isStdioMode()) {
      logger.info('Running in pure stdio mode (from CLI)');
      // Start the server
      await server.start();
      logger.info('MCP Server started successfully');

      // Handle shutdown
      const shutdown = async () => {
        logger.info('Shutting down MCP Server...');
        try {
          await server.shutdown();
          logger.info('MCP Server shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      };

      // Register shutdown handlers
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Exit the function early as we're in stdio-only mode
      return;
    }
  }

  // HTTP transport (only if not in pure stdio mode)
  if (APP_CONFIG.useHttpTransport) {
    logger.info('Using HTTP transport on port ' + APP_CONFIG.port);
    const app = express();

    // Apply enhanced security middleware
    app.use(SecurityMiddleware.applySecurityHeaders);

    // CORS configuration
    app.use(cors({
      origin: APP_CONFIG.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400 // 24 hours
    }));

    // Apply rate limiting to all routes
    app.use('/api', apiLimiter);
    app.use('/auth', authLimiter);

    // Swagger UI setup
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiConfig, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Home Assistant MCP API Documentation'
    }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    const httpTransport = new HttpTransport({
      port: APP_CONFIG.port,
      corsOrigin: APP_CONFIG.corsOrigin,
      apiPrefix: "/api/mcp",
      debug: APP_CONFIG.debugHttp
    });
    server.registerTransport(httpTransport);
  }

  // Start the server
  await server.start();
  logger.info('MCP Server started successfully');

  // Handle shutdown
  const shutdown = async () => {
    logger.info('Shutting down MCP Server...');
    try {
      await server.shutdown();
      logger.info('MCP Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Run the main function
main().catch(error => {
  logger.error('Error starting MCP Server:', error);
  process.exit(1);
});
