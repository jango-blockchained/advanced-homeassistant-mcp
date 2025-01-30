import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { z } from 'zod';
import { DomainSchema } from '../../src/schemas.js';

type MockResponse = { success: true };
type MockFn = jest.Mock<Promise<MockResponse>, any[]>;

// Define types for tool and server
interface Tool {
    name: string;
    description: string;
    execute: (params: any) => Promise<MockResponse>;
    parameters: z.ZodType<any>;
}

interface MockService {
    [key: string]: MockFn;
}

interface MockServices {
    light: {
        turn_on: MockFn;
        turn_off: MockFn;
    };
    climate: {
        set_temperature: MockFn;
    };
}

interface MockHassInstance {
    services: MockServices;
}

// Mock LiteMCP class
class MockLiteMCP {
    private tools: Tool[] = [];

    constructor(public name: string, public version: string) { }

    addTool(tool: Tool) {
        this.tools.push(tool);
    }

    getTools() {
        return this.tools;
    }
}

const createMockFn = () => {
    const fn = jest.fn();
    fn.mockReturnValue(Promise.resolve({ success: true as const }));
    return fn as unknown as MockFn;
};

// Mock the Home Assistant instance
const mockHassServices: MockHassInstance = {
    services: {
        light: {
            turn_on: createMockFn(),
            turn_off: createMockFn(),
        },
        climate: {
            set_temperature: createMockFn(),
        },
    },
};

jest.mock('../../src/hass/index.js', () => ({
    get_hass: jest.fn().mockReturnValue(Promise.resolve(mockHassServices)),
}));

describe('MCP Server Context and Tools', () => {
    let server: MockLiteMCP;

    beforeEach(async () => {
        server = new MockLiteMCP('home-assistant', '0.1.0');

        // Add the control tool to the server
        server.addTool({
            name: 'control',
            description: 'Control Home Assistant devices',
            parameters: DomainSchema,
            execute: createMockFn(),
        });
    });

    it('should initialize with correct name and version', () => {
        expect(server.name).toBe('home-assistant');
        expect(server.version).toBe('0.1.0');
    });

    it('should add and retrieve tools', () => {
        const tools = server.getTools();
        expect(tools).toHaveLength(1);
        expect(tools[0].name).toBe('control');
    });
}); 