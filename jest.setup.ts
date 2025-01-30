import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
config({ path: resolve(__dirname, envFile) });

// Set default test environment variables if not provided
process.env.TEST_HASS_HOST = process.env.TEST_HASS_HOST || 'http://localhost:8123';
process.env.TEST_HASS_TOKEN = process.env.TEST_HASS_TOKEN || 'test_token';
process.env.TEST_HASS_SOCKET_URL = process.env.TEST_HASS_SOCKET_URL || 'ws://localhost:8123/api/websocket';
process.env.TEST_PORT = process.env.TEST_PORT || '3001';

// Ensure test environment
process.env.NODE_ENV = 'test'; 