import { logger } from "./utils/logger";

const check = async (): Promise<void> => {
  try {
    const response = await fetch("http://localhost:3000/health");
    if (!response.ok) {
      logger.error("Health check failed:", response.status);
      process.exit(1);
    }
    logger.info("Health check passed");
    process.exit(0);
  } catch (error) {
    logger.error("Health check failed:", error);
    process.exit(1);
  }
};

// Execute check - no need for outer catch since check handles all errors
void check();
