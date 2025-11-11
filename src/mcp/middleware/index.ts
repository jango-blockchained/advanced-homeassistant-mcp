/**
 * MCP Middleware System
 *
 * This module provides middleware functionality for the MCP server,
 * allowing for request/response processing pipelines.
 */

import { MCPMiddleware, MCPRequest, MCPResponse, MCPContext, MCPErrorCode } from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Middleware for validating requests against JSON Schema
 */
export const validationMiddleware: MCPMiddleware = async (
  request: MCPRequest,
  context: MCPContext,
  next: () => Promise<MCPResponse>,
): Promise<MCPResponse> => {
  const { method } = request;

  const tool = context.tools.get(method);
  if (!tool) {
    return {
      id: request.id,
      error: {
        code: MCPErrorCode.METHOD_NOT_FOUND,
        message: `Method not found: ${method}`,
      },
    };
  }

  if (tool.parameters && request.params) {
    try {
      // Zod validation happens here
      const validatedParams = tool.parameters.parse(request.params);
      request.params = validatedParams;
    } catch (error) {
      return {
        id: request.id,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: "Invalid parameters",
          data: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  return next();
};

/**
 * Middleware for handling authentication
 */
export const authMiddleware = (authKey: string): MCPMiddleware => {
  return async (
    request: MCPRequest,
    context: MCPContext,
    next: () => Promise<MCPResponse>,
  ): Promise<MCPResponse> => {
    // Check for authentication in params
    const authToken = request.params?.auth_token;

    if (!authToken || authToken !== authKey) {
      return {
        id: request.id,
        error: {
          code: MCPErrorCode.AUTHENTICATION_ERROR,
          message: "Authentication failed",
        },
      };
    }

    // Remove auth token from params to keep them clean
    if (request.params && typeof request.params === "object") {
      const { auth_token, ...cleanParams } = request.params;
      request.params = cleanParams;
    }

    return next();
  };
};

/**
 * Middleware for logging requests and responses
 */
export const loggingMiddleware: MCPMiddleware = async (
  request: MCPRequest,
  context: MCPContext,
  next: () => Promise<MCPResponse>,
): Promise<MCPResponse> => {
  const startTime = Date.now();
  logger.debug(`MCP Request: ${request.method}`, {
    id: request.id,
    method: request.method,
  });

  try {
    const response = await next();

    const duration = Date.now() - startTime;
    logger.debug(`MCP Response: ${request.method}`, {
      id: request.id,
      method: request.method,
      success: !response.error,
      duration,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`MCP Error: ${request.method}`, {
      id: request.id,
      method: request.method,
      error,
      duration,
    });

    throw error;
  }
};

/**
 * Middleware for handling timeouts
 */
export const timeoutMiddleware = (timeoutMs: number): MCPMiddleware => {
  return async (
    request: MCPRequest,
    context: MCPContext,
    next: () => Promise<MCPResponse>,
  ): Promise<MCPResponse> => {
    return Promise.race([
      next(),
      new Promise<MCPResponse>((resolve) => {
        setTimeout(() => {
          resolve({
            id: request.id,
            error: {
              code: MCPErrorCode.TIMEOUT,
              message: `Request timed out after ${timeoutMs}ms`,
            },
          });
        }, timeoutMs);
      }),
    ]);
  };
};

/**
 * Utility to combine multiple middlewares
 */
export function combineMiddlewares(middlewares: MCPMiddleware[]): MCPMiddleware {
  return async (
    request: MCPRequest,
    context: MCPContext,
    next: () => Promise<MCPResponse>,
  ): Promise<MCPResponse> => {
    // Create a function that runs through all middlewares
    let index = 0;

    const runMiddleware = async (): Promise<MCPResponse> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        return middleware(request, context, runMiddleware);
      } else {
        return next();
      }
    };

    return runMiddleware();
  };
}
