import type { OpenAPIV3 } from "openapi-types";

export const openApiConfig: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "Home Assistant MCP API",
    description: `
# Home Assistant Model Context Protocol API

The Model Context Protocol (MCP) provides a standardized interface for AI tools to interact with Home Assistant.
This API documentation covers all available endpoints and features of the MCP server.

## Features
- Tool Management
- Real-time Communication
- Health Monitoring
- Rate Limiting
- Authentication
- Server-Sent Events (SSE)
`,
    version: "1.0.0",
    contact: {
      name: "Home Assistant MCP",
      url: "https://github.com/your-repo/homeassistant-mcp",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check endpoint",
        description: "Returns the current health status and version of the server",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthCheck",
                },
              },
            },
          },
        },
      },
    },
    "/api/tools": {
      get: {
        tags: ["Tools"],
        summary: "List available tools",
        description: "Returns a list of all registered tools and their capabilities",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of available tools",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Tool",
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/api/mcp/execute": {
      post: {
        tags: ["MCP"],
        summary: "Execute a tool command",
        description: "Executes a command using a registered tool",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ExecuteRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Command executed successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ExecuteResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/api/mcp/stream": {
      get: {
        tags: ["SSE"],
        summary: "Stream events",
        description: "Opens a Server-Sent Events connection for real-time updates",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "SSE stream established",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Error code",
          },
          message: {
            type: "string",
            description: "Error message",
          },
        },
        required: ["code", "message"],
      },
      HealthCheck: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["ok", "error"],
            description: "Current health status",
          },
          version: {
            type: "string",
            description: "Server version",
          },
        },
        required: ["status", "version"],
      },
      Tool: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Tool name",
          },
          description: {
            type: "string",
            description: "Tool description",
          },
          parameters: {
            type: "object",
            description: "Tool parameters schema",
          },
          returns: {
            type: "object",
            description: "Tool return value schema",
          },
        },
        required: ["name", "description"],
      },
      ExecuteRequest: {
        type: "object",
        properties: {
          tool: {
            type: "string",
            description: "Name of the tool to execute",
          },
          params: {
            type: "object",
            description: "Tool parameters",
          },
        },
        required: ["tool"],
      },
      ExecuteResponse: {
        type: "object",
        properties: {
          result: {
            type: "object",
            description: "Tool execution result",
          },
          error: {
            type: "string",
            description: "Error message if execution failed",
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token for authentication",
      },
    },
  },
  tags: [
    {
      name: "Health",
      description: "Health check endpoints for monitoring server status",
    },
    {
      name: "MCP",
      description: "Model Context Protocol endpoints for tool execution",
    },
    {
      name: "Tools",
      description: "Tool management endpoints for listing and configuring tools",
    },
    {
      name: "SSE",
      description: "Server-Sent Events endpoints for real-time updates",
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
};
