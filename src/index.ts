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
import { APP_CONFIG } from "./config/app.config";
import { logger } from "./utils/logger";
import { openApiConfig } from "./openapi";
import { tools } from "./tools/index";
import {
  securityHeadersMiddleware,
  rateLimiterMiddleware,
  validateRequestMiddleware,
  sanitizeInputMiddleware,
  errorHandlerMiddleware,
} from "./security/index";

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

  // The new app.config.ts schema is flat (PORT, NODE_ENV, HASS_HOST, ...).
  // Legacy config.ts properties (useStdioTransport, executionTimeout, port,
  // corsOrigin, debugHttp) were not migrated to the new schema. Read them
  // directly from process.env to keep the runtime behavior identical
  // while the schema consolidation settles.
  const useStdio =
    isStdioMode() ||
    process.env.USE_STDIO_TRANSPORT === "true" ||
    (process.env.USE_STDIO_TRANSPORT ?? "").toLowerCase() === "true";
  const useHttp = process.env.USE_HTTP_TRANSPORT !== "false"; // default ON
  const executionTimeout = parseInt(process.env.EXECUTION_TIMEOUT ?? "30000", 10);
  const corsOrigin = process.env.CORS_ORIGINS?.split(",") ?? ["*"];
  const debugHttp = process.env.DEBUG === "true" || process.env.LOG_LEVEL === "debug";
  const port = APP_CONFIG.PORT;

  // Get the server instance (singleton)
  const server = MCPServer.getInstance();

  // Register all tools from tools/index.ts
  tools.forEach((tool) => {
    server.registerTool(tool);
  });

  // Add middlewares
  server.use(loggingMiddleware);
  server.use(timeoutMiddleware(executionTimeout));

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
  if (useHttp) {
    logger.info("Using HTTP transport on port " + port);
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
        origin: corsOrigin,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge: 86400, // 24 hours
      }),
    );

    // Swagger UI setup. swaggerUi.serve is a RequestHandler array (it
    // actually serves the static swagger-ui assets). Express's `use`
    // overload for "path + handlers" expects a spread tuple, so we
    // spread swaggerUi.serve's handler array. The setup() call returns
    // a single handler that renders the spec. The cast to `any` works
    // around a known type-version mismatch between swagger-ui-express's
    // bundled @types/express and the project's @types/express v4
    // (the IRouterMatcher generic doesn't unify across the two).
    app.use(
      "/api-docs",
      ...(swaggerUi.serve as unknown as express.RequestHandler[]),
      swaggerUi.setup(openApiConfig, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Home Assistant MCP API Documentation",
      }) as unknown as express.RequestHandler,
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
      debug: debugHttp,
    });
    server.registerTransport(httpTransport);

    // Start listening on the port
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

// Run the main function only when this module is the entry point.
// Guarded so test files can `import('./src/index')` without triggering startup
// (and the process.exit on startup failure that would silently kill the runner).
//
// `import.meta.main` is a Bun-only feature; when the source is bundled to
// CJS by esbuild, `import.meta` is undefined and `import.meta.main` throws.
// We use a CJS-compatible fallback: `require.main === module` is true when
// this file is the entry point under Node, false when it's been imported.
const isEntryPoint =
  // Bun: import.meta.main is true for the entry file
  (typeof import.meta !== "undefined" && (import.meta as { main?: boolean }).main) ||
  // Node CJS: require.main === module is true for the entry file
  (typeof require !== "undefined" && (require as { main?: unknown }).main === module);

if (isEntryPoint) {
  main().catch((error) => {
    logger.error("Error starting MCP Server:", error);
    process.exit(1);
  });
}
