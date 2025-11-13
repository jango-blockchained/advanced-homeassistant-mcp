/**
 * Home Assistant Model Context Protocol (MCP) Server
 * A standardized protocol for AI tools to interact with Home Assistant
 */

import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { MCPServer } from "./mcp/MCPServer";
import { loggingMiddleware, timeoutMiddleware } from "./mcp/middleware/index";
import { StdioTransport } from "./mcp/transports/stdio.transport";
import { HttpTransport } from "./mcp/transports/http.transport";
import { APP_CONFIG } from "./config";
import { logger } from "./utils/logger";
import { openApiConfig } from "./openapi";
import {
  securityHeadersMiddleware,
  rateLimiterMiddleware,
  validateRequestMiddleware,
  sanitizeInputMiddleware,
  errorHandlerMiddleware,
} from "./security/index";

// Home Assistant tools
import { LightsControlTool } from "./tools/homeassistant/lights.tool";
import { ClimateControlTool } from "./tools/homeassistant/climate.tool";
import { ListDevicesTool } from "./tools/homeassistant/list-devices.tool";
import { AutomationTool } from "./tools/homeassistant/automation.tool";
import { SceneTool } from "./tools/homeassistant/scene.tool";
import { NotifyTool } from "./tools/homeassistant/notify.tool";

// Import additional tools from tools/index.ts
import { tools } from "./tools/index";

/**
 * Check if running in stdio mode via command line args
 */
function isStdioMode(): boolean {
  return process.argv.includes("--stdio");
}

/**
 * Main function to start the MCP server
 */
async function main(): Promise<void> {
  logger.info("Starting Home Assistant MCP Server...");

  // Check if we're in stdio mode from command line
  const useStdio = isStdioMode() || APP_CONFIG.useStdioTransport;

  // Configure server
  const EXECUTION_TIMEOUT = APP_CONFIG.executionTimeout;
  const _STREAMING_ENABLED = APP_CONFIG.streamingEnabled;

  // Get the server instance (singleton)
  const server = MCPServer.getInstance();

  // Register Home Assistant tools (BaseTool classes)
  server.registerTool(new LightsControlTool());
  server.registerTool(new ClimateControlTool());
  server.registerTool(new ListDevicesTool());
  server.registerTool(new AutomationTool());
  server.registerTool(new SceneTool());
  server.registerTool(new NotifyTool());

  // Register additional tools from tools/index.ts (excluding homeassistant tools which are already registered above)
  const homeAssistantToolNames = [
    "lights_control",
    "climate_control",
    "list_devices",
    "automation",
    "scene",
    "notify",
  ];
  tools.forEach((tool) => {
    if (!homeAssistantToolNames.includes(tool.name)) {
      server.registerTool(tool);
    }
  });

  // Add middlewares
  server.use(loggingMiddleware);
  server.use(timeoutMiddleware(EXECUTION_TIMEOUT));

  // Initialize transports
  if (useStdio) {
    logger.info("Using Standard I/O transport");

    // Create and configure the stdio transport with debug enabled for stdio mode
    const stdioTransport = new StdioTransport({
      debug: true, // Always enable debug in stdio mode for better visibility
      silent: false, // Never be silent in stdio mode
    });

    // Explicitly set the server reference to ensure access to tools
    stdioTransport.setServer(server);

    // Register the transport
    server.registerTransport(stdioTransport);

    // Special handling for stdio mode - don't start other transports
    if (isStdioMode()) {
      logger.info("Running in pure stdio mode (from CLI)");
      // Start the server
      await server.start();
      logger.info("MCP Server started successfully");

      // Handle shutdown
      const shutdown = async (): Promise<void> => {
        logger.info("Shutting down MCP Server...");
        try {
          await server.shutdown();
          logger.info("MCP Server shutdown complete");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown:", error);
          process.exit(1);
        }
      };

      // Register shutdown handlers
      process.on("SIGINT", () => {
        shutdown().catch((err) => logger.error("Shutdown error:", err));
      });
      process.on("SIGTERM", () => {
        shutdown().catch((err) => logger.error("Shutdown error:", err));
      });

      // Exit the function early as we're in stdio-only mode
      return;
    }
  }

  // HTTP transport (only if not in pure stdio mode)
  if (APP_CONFIG.useHttpTransport) {
    logger.info("Using HTTP transport on port " + APP_CONFIG.port);
    const app = express();

    // Body parser middleware with size limit
    app.use(express.json({ limit: "50kb" }));

    // Apply security middleware in order
    app.use(securityHeadersMiddleware);
    app.use(rateLimiterMiddleware);
    app.use(validateRequestMiddleware);
    app.use(sanitizeInputMiddleware);

    // CORS configuration
    app.use(
      cors({
        origin: APP_CONFIG.corsOrigin,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge: 86400, // 24 hours
      }),
    );

    // Swagger UI setup
    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(openApiConfig, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Home Assistant MCP API Documentation",
      }),
    );

    // MCP Discovery endpoint for Smithery
    app.get("/.well-known/mcp-config", (_req: Request, res: Response) => {
      res.json({
        schemaVersion: "1.0",
        name: "Home Assistant MCP Server",
        version: process.env.npm_package_version ?? "1.1.0",
        description: "An advanced MCP server for Home Assistant. 🔋 Batteries included.",
        vendor: {
          name: "jango-blockchained",
          url: "https://github.com/jango-blockchained",
        },
        repository: {
          type: "git",
          url: "https://github.com/jango-blockchained/homeassistant-mcp",
        },
        runtime: "container",
        transport: {
          type: "http",
          protocol: "json-rpc",
          version: "2.0",
        },
        configuration: {
          type: "object",
          required: ["hassToken"],
          properties: {
            hassToken: {
              type: "string",
              title: "Home Assistant Token",
              description:
                "Long-lived access token for connecting to Home Assistant API. Generate this from your Home Assistant profile.",
              sensitive: true,
            },
            hassHost: {
              type: "string",
              default: "http://homeassistant.local:8123",
              title: "Home Assistant Host",
              description: "The URL of your Home Assistant instance",
            },
            hassSocketUrl: {
              type: "string",
              default: "ws://homeassistant.local:8123",
              title: "Home Assistant WebSocket URL",
              description: "The WebSocket URL for real-time Home Assistant events",
            },
            port: {
              type: "number",
              default: 7123,
              title: "MCP Server Port",
              description: "The port on which the MCP server will listen for connections.",
            },
            debug: {
              type: "boolean",
              default: false,
              title: "Debug Mode",
              description: "Enable detailed debug logging for troubleshooting.",
            },
          },
        },
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
          streaming: false,
        },
        categories: ["smart-home", "automation", "iot", "home-assistant"],
        endpoints: {
          health: "/health",
          api: "/api/mcp",
          docs: "/api-docs",
        },
        authentication: {
          type: "environment",
          variables: ["HASS_TOKEN", "HASS_HOST", "HASS_SOCKET_URL"],
        },
      });
    });

    // Health check endpoint
    app.get("/health", (_req: Request, res: Response) => {
      res.json({
        status: "ok",
        version: process.env.npm_package_version ?? "1.0.0",
      });
    });

    // Error handler middleware (must be last)
    app.use(errorHandlerMiddleware);

    const httpTransport = new HttpTransport({
      expressApp: app,
      apiPrefix: "/api",
      debug: APP_CONFIG.debugHttp,
    });
    server.registerTransport(httpTransport);

    // Start listening on the port
    const port = APP_CONFIG.port;
    app.listen(port, () => {
      logger.info(`HTTP server listening on port ${port}`);
    });
  }

  // Start the server (will start transports)
  await server.start();
  logger.info("MCP Server started successfully");

  // Handle shutdown
  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down MCP Server...");
    try {
      await server.shutdown();
      logger.info("MCP Server shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on("SIGINT", () => {
    shutdown().catch((err) => logger.error("Shutdown error:", err));
  });
  process.on("SIGTERM", () => {
    shutdown().catch((err) => logger.error("Shutdown error:", err));
  });
}

// Run the main function
main().catch((error) => {
  logger.error("Error starting MCP Server:", error);
  process.exit(1);
});
