// Mock chalk module
jest.mock('chalk', () => ({
    default: {
        red: (text) => text,
        green: (text) => text,
        yellow: (text) => text,
        blue: (text) => text,
        magenta: (text) => text,
        cyan: (text) => text,
        white: (text) => text,
        gray: (text) => text,
        grey: (text) => text,
        black: (text) => text,
        bold: (text) => text,
        dim: (text) => text,
        italic: (text) => text,
        underline: (text) => text,
        inverse: (text) => text,
        hidden: (text) => text,
        strikethrough: (text) => text,
        visible: (text) => text,
    }
}));

// Mock environment variables
process.env.HASS_URL = 'http://localhost:8123';
process.env.HASS_TOKEN = 'test_token';
process.env.CLAUDE_API_KEY = 'test_api_key';
process.env.CLAUDE_MODEL = 'test_model';

// Global Jest settings
jest.setTimeout(30000); // 30 seconds timeout 