import { ToolRegistry, ToolCategory, EnhancedTool } from '../../src/tools/index.js';

describe('ToolRegistry', () => {
    let registry: ToolRegistry;
    let mockTool: EnhancedTool;

    beforeEach(() => {
        registry = new ToolRegistry();
        mockTool = {
            name: 'test_tool',
            description: 'A test tool',
            metadata: {
                category: ToolCategory.DEVICE,
                platform: 'test',
                version: '1.0.0',
                caching: {
                    enabled: true,
                    ttl: 1000
                }
            },
            execute: jest.fn().mockResolvedValue({ success: true }),
            validate: jest.fn().mockResolvedValue(true),
            preExecute: jest.fn().mockResolvedValue(undefined),
            postExecute: jest.fn().mockResolvedValue(undefined)
        };
    });

    describe('Tool Registration', () => {
        it('should register a tool successfully', () => {
            registry.registerTool(mockTool);
            const retrievedTool = registry.getTool('test_tool');
            expect(retrievedTool).toBe(mockTool);
        });

        it('should categorize tools correctly', () => {
            registry.registerTool(mockTool);
            const deviceTools = registry.getToolsByCategory(ToolCategory.DEVICE);
            expect(deviceTools).toContain(mockTool);
        });

        it('should handle multiple tools in the same category', () => {
            const mockTool2 = {
                ...mockTool,
                name: 'test_tool_2'
            };
            registry.registerTool(mockTool);
            registry.registerTool(mockTool2);
            const deviceTools = registry.getToolsByCategory(ToolCategory.DEVICE);
            expect(deviceTools).toHaveLength(2);
            expect(deviceTools).toContain(mockTool);
            expect(deviceTools).toContain(mockTool2);
        });
    });

    describe('Tool Execution', () => {
        it('should execute a tool with all hooks', async () => {
            registry.registerTool(mockTool);
            await registry.executeTool('test_tool', { param: 'value' });

            expect(mockTool.validate).toHaveBeenCalledWith({ param: 'value' });
            expect(mockTool.preExecute).toHaveBeenCalledWith({ param: 'value' });
            expect(mockTool.execute).toHaveBeenCalledWith({ param: 'value' });
            expect(mockTool.postExecute).toHaveBeenCalled();
        });

        it('should throw error for non-existent tool', async () => {
            await expect(registry.executeTool('non_existent', {}))
                .rejects.toThrow('Tool non_existent not found');
        });

        it('should handle validation failure', async () => {
            mockTool.validate = jest.fn().mockResolvedValue(false);
            registry.registerTool(mockTool);

            await expect(registry.executeTool('test_tool', {}))
                .rejects.toThrow('Invalid parameters');
        });

        it('should execute without optional hooks', async () => {
            const simpleTool: EnhancedTool = {
                name: 'simple_tool',
                description: 'A simple tool',
                metadata: {
                    category: ToolCategory.SYSTEM,
                    platform: 'test',
                    version: '1.0.0'
                },
                execute: jest.fn().mockResolvedValue({ success: true })
            };

            registry.registerTool(simpleTool);
            const result = await registry.executeTool('simple_tool', {});
            expect(result).toEqual({ success: true });
        });
    });

    describe('Caching', () => {
        it('should cache tool results when enabled', async () => {
            registry.registerTool(mockTool);
            const params = { test: 'value' };

            // First execution
            await registry.executeTool('test_tool', params);
            expect(mockTool.execute).toHaveBeenCalledTimes(1);

            // Second execution within TTL
            await registry.executeTool('test_tool', params);
            expect(mockTool.execute).toHaveBeenCalledTimes(1);
        });

        it('should not cache results when disabled', async () => {
            const uncachedTool: EnhancedTool = {
                ...mockTool,
                metadata: {
                    ...mockTool.metadata,
                    caching: {
                        enabled: false,
                        ttl: 1000
                    }
                }
            };

            registry.registerTool(uncachedTool);
            const params = { test: 'value' };

            // Multiple executions
            await registry.executeTool('test_tool', params);
            await registry.executeTool('test_tool', params);

            expect(uncachedTool.execute).toHaveBeenCalledTimes(2);
        });

        it('should expire cache after TTL', async () => {
            mockTool.metadata.caching!.ttl = 100; // Short TTL for testing
            registry.registerTool(mockTool);
            const params = { test: 'value' };

            // First execution
            await registry.executeTool('test_tool', params);

            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            // Second execution after TTL
            await registry.executeTool('test_tool', params);

            expect(mockTool.execute).toHaveBeenCalledTimes(2);
        });

        it('should clean expired cache entries', async () => {
            mockTool.metadata.caching!.ttl = 100;
            registry.registerTool(mockTool);
            const params = { test: 'value' };

            // Execute and cache
            await registry.executeTool('test_tool', params);

            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            // Clean cache
            registry.cleanCache();

            // Verify cache is cleaned by forcing a new execution
            await registry.executeTool('test_tool', params);
            expect(mockTool.execute).toHaveBeenCalledTimes(2);
        });
    });

    describe('Category Management', () => {
        it('should return empty array for unknown category', () => {
            const tools = registry.getToolsByCategory('unknown' as ToolCategory);
            expect(tools).toEqual([]);
        });

        it('should handle tools across multiple categories', () => {
            const systemTool: EnhancedTool = {
                ...mockTool,
                name: 'system_tool',
                metadata: {
                    ...mockTool.metadata,
                    category: ToolCategory.SYSTEM
                }
            };

            const automationTool: EnhancedTool = {
                ...mockTool,
                name: 'automation_tool',
                metadata: {
                    ...mockTool.metadata,
                    category: ToolCategory.AUTOMATION
                }
            };

            registry.registerTool(mockTool); // DEVICE category
            registry.registerTool(systemTool);
            registry.registerTool(automationTool);

            expect(registry.getToolsByCategory(ToolCategory.DEVICE)).toHaveLength(1);
            expect(registry.getToolsByCategory(ToolCategory.SYSTEM)).toHaveLength(1);
            expect(registry.getToolsByCategory(ToolCategory.AUTOMATION)).toHaveLength(1);
        });
    });
}); 