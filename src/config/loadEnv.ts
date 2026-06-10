import { config as dotenvConfig } from "dotenv";
import path from "path";
import fs from "fs";

/**
 * Maps NODE_ENV values to their corresponding environment file names
 */
const ENV_FILE_MAPPING: Record<string, string> = {
  production: ".env.prod",
  development: ".env.dev",
  test: ".env.test",
};

/**
 * Loads environment variables from the appropriate files based on NODE_ENV.
 * First loads environment-specific file, then overrides with generic .env if it exists.
 * This function executes synchronously to ensure variables are loaded before use.
 */
export function loadEnvironmentVariables(): void {
  // Determine the current environment (default to 'development')
  const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase();

  // Get the environment-specific file name
  const envSpecificFile = ENV_FILE_MAPPING[nodeEnv];
  if (!envSpecificFile) {
    // Boot-time informational message — written to stderr (won't pollute
    // stdout which is reserved for the stdio MCP transport). Per
    // AGENTS.md, use the winston logger; but at this point in
    // startup the logger may not be configured, so we use stderr
    // directly as a safe fallback. The winston logger takes over
    // for application-level logging.
    process.stderr.write(
      `[loadEnv] Unknown NODE_ENV value: ${nodeEnv}. Using .env.dev as fallback.\n`,
    );
  }

  const envFile = envSpecificFile || ".env.dev";
  const envPath = path.resolve(process.cwd(), envFile);

  // Load the environment-specific file if it exists
  try {
    if (fs.existsSync(envPath)) {
      dotenvConfig({ path: envPath });
      process.stderr.write(`[loadEnv] Loaded environment variables from ${envFile}\n`);
    } else {
      process.stderr.write(`[loadEnv] Environment-specific file ${envFile} not found.\n`);
    }
  } catch (error) {
    process.stderr.write(
      `[loadEnv] Error checking environment file ${envFile}: ${String(error)}\n`,
    );
  }

  // Finally, check if there is a generic .env file present
  // If so, load it with the override option, so its values take precedence
  const genericEnvPath = path.resolve(process.cwd(), ".env");
  try {
    if (fs.existsSync(genericEnvPath)) {
      dotenvConfig({ path: genericEnvPath, override: true });
      process.stderr.write("[loadEnv] Loaded and overrode with generic .env file\n");
    }
  } catch (error) {
    process.stderr.write(`[loadEnv] Error checking generic .env file: ${String(error)}\n`);
  }
}

// Export the environment file mapping for reference
export const ENV_FILES = ENV_FILE_MAPPING;
