import { z } from 'zod';
import { get_hass } from '../hass/index.js';

// Tool category types
export enum ToolCategory {
    DEVICE = 'device',
    SYSTEM = 'system',
    AUTOMATION = 'automation'
}

// Tool priority levels
export enum ToolPriority {
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low'
}

interface ToolParameters {
    [key: string]: any;
}

interface Tool<Params extends ToolParameters = ToolParameters> {
    name: string;
    description: string;
    execute(params: Params): Promise<any>;
}

interface ToolMetadata {
    category: ToolCategory;
    platform: string;
    version: string;
    caching?: {
        enabled: boolean;
        ttl: number;
    };
}

// Enhanced tool interface
export interface EnhancedTool extends Tool {
    metadata: ToolMetadata;
    validate?: (params: any) => Promise<boolean>;
    preExecute?: (params: any) => Promise<void>;
    postExecute?: (result: any) => Promise<void>;
}

// Tool registry for managing and organizing tools
export class ToolRegistry {
    private tools: Map<string, EnhancedTool> = new Map();
    private categories: Map<ToolCategory, Set<string>> = new Map();
    private cache: Map<string, { data: any; timestamp: number }> = new Map();

    constructor() {
        // Initialize categories
        Object.values(ToolCategory).forEach(category => {
            this.categories.set(category, new Set());
        });
    }

    // Register a new tool
    public registerTool(tool: EnhancedTool): void {
        this.tools.set(tool.name, tool);
        this.categories.get(tool.metadata.category)?.add(tool.name);
    }

    // Get tool by name
    public getTool(name: string): EnhancedTool | undefined {
        return this.tools.get(name);
    }

    // Get all tools in a category
    public getToolsByCategory(category: ToolCategory): EnhancedTool[] {
        const toolNames = this.categories.get(category);
        if (!toolNames) return [];
        return Array.from(toolNames).map(name => this.tools.get(name)!);
    }

    // Execute a tool with validation and hooks
    public async executeTool(name: string, params: any): Promise<any> {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }

        // Check cache if enabled
        if (tool.metadata.caching?.enabled) {
            const cacheKey = `${name}:${JSON.stringify(params)}`;
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < tool.metadata.caching.ttl) {
                return cached.data;
            }
        }

        // Validate parameters
        if (tool.validate) {
            const isValid = await tool.validate(params);
            if (!isValid) {
                throw new Error('Invalid parameters');
            }
        }

        // Pre-execution hook
        if (tool.preExecute) {
            await tool.preExecute(params);
        }

        // Execute tool
        const result = await tool.execute(params);

        // Post-execution hook
        if (tool.postExecute) {
            await tool.postExecute(result);
        }

        // Update cache if enabled
        if (tool.metadata.caching?.enabled) {
            const cacheKey = `${name}:${JSON.stringify(params)}`;
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
        }

        return result;
    }

    // Clean up expired cache entries
    public cleanCache(): void {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            const tool = this.tools.get(key.split(':')[0]);
            if (tool?.metadata.caching?.ttl && now - value.timestamp > tool.metadata.caching.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Create and export the global tool registry
export const toolRegistry = new ToolRegistry();

// Tool decorator for easy registration
function registerTool(metadata: Partial<ToolMetadata>) {
    return function (constructor: any) {
        return constructor;
    };
}

// Example usage:
@registerTool({
    category: ToolCategory.DEVICE,
    platform: 'hass',
    version: '1.0.0',
    caching: {
        enabled: true,
        ttl: 60000
    }
})
export class LightControlTool implements EnhancedTool {
    name = 'light_control';
    description = 'Control light devices';
    metadata: ToolMetadata = {
        category: ToolCategory.DEVICE,
        platform: 'hass',
        version: '1.0.0',
        caching: {
            enabled: true,
            ttl: 60000
        }
    };
    parameters = z.object({
        command: z.enum(['turn_on', 'turn_off', 'toggle']),
        entity_id: z.string(),
        brightness: z.number().min(0).max(255).optional(),
        color_temp: z.number().optional(),
        rgb_color: z.tuple([z.number(), z.number(), z.number()]).optional()
    });

    async validate(params: any): Promise<boolean> {
        try {
            this.parameters.parse(params);
            return true;
        } catch {
            return false;
        }
    }

    async execute(params: any): Promise<any> {
        // Implementation here
        return { success: true };
    }
} 