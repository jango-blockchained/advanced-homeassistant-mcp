/**
 * Log Rotation Utility
 *
 * This module provides functionality for managing log file rotation and cleanup.
 * It handles log file archiving, compression, and deletion based on configuration.
 *
 * @module log-rotation
 */

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { logger } from "./logger.js";
import { APP_CONFIG } from "../config/app.config.ts";
import { unlink } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

const globPromise = promisify(glob);

/**
 * Interface for log file information
 */
interface LogFileInfo {
  path: string;
  filename: string;
  date: Date;
  size: number;
}

/**
 * Parse size string to bytes
 * @param size - Size string (e.g., '20m', '1g')
 * @returns Size in bytes
 */
const parseSize = (size: string): number => {
  const units = {
    b: 1,
    k: 1024,
    m: 1024 * 1024,
    g: 1024 * 1024 * 1024,
  };
  const match = size.toLowerCase().match(/^(\d+)([bkmg])$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  const [, value, unit] = match;
  return parseInt(value) * units[unit as keyof typeof units];
};

/**
 * Parse duration string to days
 * @param duration - Duration string (e.g., '14d', '2w')
 * @returns Duration in days
 */
const parseDuration = (duration: string): number => {
  const units = {
    d: 1,
    w: 7,
    m: 30,
  };
  const match = duration.toLowerCase().match(/^(\d+)([dwm])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const [, value, unit] = match;
  return parseInt(value) * units[unit as keyof typeof units];
};

/**
 * Get information about log files
 * @returns Array of log file information
 */
const getLogFiles = async (): Promise<LogFileInfo[]> => {
  const logDir = APP_CONFIG.LOGGING.DIR;
  const files: string[] = await glob("*.log*", { cwd: logDir });

  const fileInfos: LogFileInfo[] = [];
  for (const file of files) {
    const filePath = path.join(logDir, file);
    const stats = await fs.stat(filePath);
    const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);

    if (dateMatch) {
      fileInfos.push({
        path: filePath,
        filename: file,
        date: new Date(dateMatch[0]),
        size: stats.size,
      });
    }
  }

  return fileInfos;
};

/**
 * Clean up old log files
 */
export async function cleanupOldLogs(logDir: string, maxDays: number): Promise<void> {
  try {
    const files: string[] = await glob("*.log*", { cwd: logDir });

    const now = Date.now();
    const maxAge = maxDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = join(logDir, file);
      const stats = await fs.stat(filePath);
      const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);

      if (dateMatch && stats.ctimeMs < now - maxAge) {
        await unlink(filePath);
        logger.debug(`Deleted old log file: ${file}`);
      }
    }
  } catch (error) {
    logger.error("Error cleaning up old logs:", error);
  }
}

/**
 * Check and rotate log files based on size
 */
const checkLogSize = async (): Promise<void> => {
  try {
    const maxSize = parseSize(APP_CONFIG.LOGGING.MAX_SIZE);
    const files = await getLogFiles();

    for (const file of files) {
      if (file.size > maxSize && !file.filename.endsWith(".gz")) {
        // Current log file is handled by winston-daily-rotate-file
        if (!file.filename.includes(new Date().toISOString().split("T")[0])) {
          logger.debug(`Log file exceeds max size: ${file.filename}`);
        }
      }
    }
  } catch (error) {
    logger.error("Error checking log sizes:", error);
  }
};

/**
 * Initialize log rotation
 * Sets up periodic checks for log rotation and cleanup
 */
export const initLogRotation = (): void => {
  // Check log sizes every hour
  setInterval(
    () => {
      checkLogSize().catch((error) => {
        logger.error("Error checking log sizes:", error);
      });
    },
    60 * 60 * 1000,
  );

  // Clean up old logs daily
  setInterval(
    () => {
      cleanupOldLogs(APP_CONFIG.LOGGING.DIR, parseDuration(APP_CONFIG.LOGGING.MAX_DAYS)).catch(
        (error) => {
          logger.error("Error cleaning up old logs:", error);
        },
      );
    },
    24 * 60 * 60 * 1000,
  );

  // Initial check
  checkLogSize().catch((error) => {
    logger.error("Error in initial log size check:", error);
  });

  // Initial cleanup
  cleanupOldLogs(APP_CONFIG.LOGGING.DIR, parseDuration(APP_CONFIG.LOGGING.MAX_DAYS)).catch(
    (error) => {
      logger.error("Error in initial log cleanup:", error);
    },
  );

  logger.info("Log rotation initialized");
};
