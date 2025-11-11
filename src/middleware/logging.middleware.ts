/**
 * Logging Middleware
 *
 * This middleware provides request logging functionality.
 * It logs incoming requests and their responses.
 *
 * @module logging-middleware
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { APP_CONFIG } from "../config/app.config.ts";

/**
 * Interface for extended request object with timing information
 */
interface TimedRequest extends Request {
  startTime?: number;
}

/**
 * Calculate the response time in milliseconds
 * @param startTime - Start time in milliseconds
 * @returns Response time in milliseconds
 */
const getResponseTime = (startTime: number): number => {
  const NS_PER_SEC = 1e9; // nanoseconds per second
  const NS_TO_MS = 1e6; // nanoseconds to milliseconds
  const diff = process.hrtime();
  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS - startTime;
};

/**
 * Get client IP address from request
 * @param req - Express request object
 * @returns Client IP address
 */
const getClientIp = (req: Request): string => {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown"
  );
};

/**
 * Format log message for request
 * @param req - Express request object
 * @returns Formatted log message
 */
const formatRequestLog = (req: TimedRequest): string => {
  return `${req.method} ${req.originalUrl} - IP: ${getClientIp(req)}`;
};

/**
 * Format log message for response
 * @param req - Express request object
 * @param res - Express response object
 * @param time - Response time in milliseconds
 * @returns Formatted log message
 */
const formatResponseLog = (req: TimedRequest, res: Response, time: number): string => {
  return `${req.method} ${req.originalUrl} - ${res.statusCode} - ${time.toFixed(2)}ms`;
};

/**
 * Request logging middleware
 * Logs information about incoming requests and their responses
 */
export const requestLogger = (req: TimedRequest, res: Response, next: NextFunction): void => {
  if (!APP_CONFIG.LOGGING.LOG_REQUESTS) {
    next();
    return;
  }

  // Record start time
  req.startTime = Date.now();

  // Log request
  logger.http(formatRequestLog(req));

  // Log response
  res.on("finish", () => {
    const responseTime = Date.now() - (req.startTime || 0);
    const logLevel = res.statusCode >= 400 ? "warn" : "http";
    logger[logLevel](formatResponseLog(req, res, responseTime));
  });

  next();
};

/**
 * Error logging middleware
 * Logs errors that occur during request processing
 */
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
    error: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query,
    ip: getClientIp(req),
  });
  next(err);
};
