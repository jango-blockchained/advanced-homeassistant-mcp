import { jest } from '@jest/globals';

// Mock environment variables
process.env.HASS_URL = 'http://localhost:8123';
process.env.HASS_TOKEN = 'test_token';
process.env.CLAUDE_API_KEY = 'test_api_key';
process.env.CLAUDE_MODEL = 'test_model';

// Global Jest settings
jest.setTimeout(30000); // 30 seconds timeout

// Mock semver to avoid the SemVer constructor issue
jest.mock('semver', () => ({
    default: class SemVer {
        constructor(version) {
            this.version = version;
        }
        toString() {
            return this.version;
        }
    },
    valid: (v) => v,
    clean: (v) => v,
    satisfies: () => true,
    gt: () => false,
    gte: () => true,
    lt: () => false,
    lte: () => true,
    eq: () => true,
    neq: () => false,
})); 