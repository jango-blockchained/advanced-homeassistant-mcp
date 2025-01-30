import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import { TextEncoder, TextDecoder } from 'util';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.HASS_URL = 'http://localhost:8123';
process.env.HASS_TOKEN = 'test_token';
process.env.CLAUDE_API_KEY = 'test_api_key';
process.env.CLAUDE_MODEL = 'test_model';

// Add TextEncoder and TextDecoder to global scope
Object.defineProperty(global, 'TextEncoder', {
    value: TextEncoder,
    writable: true
});

Object.defineProperty(global, 'TextDecoder', {
    value: TextDecoder,
    writable: true
});

// Configure console for tests
const originalConsole = { ...console };
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

// Increase test timeout
jest.setTimeout(30000);

// Mock WebSocket
jest.mock('ws', () => {
    return {
        WebSocket: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            send: jest.fn(),
            close: jest.fn(),
            removeAllListeners: jest.fn()
        }))
    };
});

// Mock chalk
jest.mock('chalk', () => ({
    default: {
        red: (text: string) => text,
        green: (text: string) => text,
        yellow: (text: string) => text,
        blue: (text: string) => text,
        magenta: (text: string) => text,
        cyan: (text: string) => text,
        white: (text: string) => text,
        gray: (text: string) => text,
        grey: (text: string) => text,
        black: (text: string) => text,
        bold: (text: string) => text,
        dim: (text: string) => text,
        italic: (text: string) => text,
        underline: (text: string) => text,
        inverse: (text: string) => text,
        hidden: (text: string) => text,
        strikethrough: (text: string) => text,
        visible: (text: string) => text,
    }
}));

// Reset mocks between tests
beforeEach(() => {
    jest.clearAllMocks();
});

// Cleanup after tests
afterEach(() => {
    jest.clearAllTimers();
}); 