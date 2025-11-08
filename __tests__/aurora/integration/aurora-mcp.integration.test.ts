/**
 * Aurora MCP Integration Tests
 * Verifies all Aurora tools work through the MCP interface
 */

import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import { MCPServer } from '../../../src/mcp/MCPServer';
import { getAuroraManager, resetAuroraManager } from '../../../src/tools/aurora/manager';
import type { Tool } from '../../../src/types/index';

describe('Aurora MCP Integration', () => {
  let server: MCPServer;
  let auroraTools: Tool[] = [];

  beforeAll(() => {
    // Get the MCP server instance
    server = MCPServer.getInstance();

    // Collect all registered Aurora tools
    const allTools = (server as unknown as { tools: Map<string, Tool> }).tools;
    const auroraToolNames = [
      'aurora_analyze_audio',
      'aurora_scan_devices',
      'aurora_profile_device',
      'aurora_render_timeline',
      'aurora_play_timeline',
      'aurora_control_playback',
      'aurora_get_status',
      'aurora_list_timelines',
      'aurora_export_timeline',
      'aurora_import_timeline',
    ];

    auroraTools = Array.from(allTools.values())
      .filter((tool: Tool) => auroraToolNames.includes(tool.name));
  });

  afterEach(() => {
    // Reset Aurora manager state
    resetAuroraManager();
  });

  describe('Tool Registration', () => {
    it('should have all 10 Aurora tools registered', () => {
      expect(auroraTools.length).toBe(10);
    });

    it('should have aurora_analyze_audio tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_analyze_audio');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('audio');
    });

    it('should have aurora_scan_devices tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_scan_devices');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('device');
    });

    it('should have aurora_profile_device tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_profile_device');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('profile');
    });

    it('should have aurora_render_timeline tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_render_timeline');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('timeline');
    });

    it('should have aurora_play_timeline tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_play_timeline');
      expect(tool).toBeDefined();
    });

    it('should have aurora_control_playback tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_control_playback');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('playback');
    });

    it('should have aurora_get_status tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_get_status');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('status');
    });

    it('should have aurora_list_timelines tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_list_timelines');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('timeline');
    });

    it('should have aurora_export_timeline tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_export_timeline');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('export');
    });

    it('should have aurora_import_timeline tool', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_import_timeline');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('import');
    });
  });

  describe('Tool Parameter Schema', () => {
    it('aurora_analyze_audio should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_analyze_audio');
      expect(tool?.parameters).toBeDefined();
      
      // Should have audio_file as required parameter
      const schema = (tool?.parameters as any)._def?.shape || {};
      expect(schema.audio_file).toBeDefined();
    });

    it('aurora_scan_devices should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_scan_devices');
      expect(tool?.parameters).toBeDefined();
    });

    it('aurora_profile_device should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_profile_device');
      expect(tool?.parameters).toBeDefined();
      
      // entity_id should be required
      const schema = (tool?.parameters as any)._def?.shape || {};
      expect(schema.entity_id).toBeDefined();
    });

    it('aurora_render_timeline should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_render_timeline');
      expect(tool?.parameters).toBeDefined();
      
      // audio_file should be required
      const schema = (tool?.parameters as any)._def?.shape || {};
      expect(schema.audio_file).toBeDefined();
    });

    it('aurora_play_timeline should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_play_timeline');
      expect(tool?.parameters).toBeDefined();
      
      // timeline_id should be required
      const schema = (tool?.parameters as any)._def?.shape || {};
      expect(schema.timeline_id).toBeDefined();
    });

    it('aurora_control_playback should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_control_playback');
      expect(tool?.parameters).toBeDefined();
      
      // action should be required
      const schema = (tool?.parameters as any)._def?.shape || {};
      expect(schema.action).toBeDefined();
    });

    it('aurora_get_status should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_get_status');
      expect(tool?.parameters).toBeDefined();
    });

    it('aurora_list_timelines should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_list_timelines');
      expect(tool?.parameters).toBeDefined();
    });

    it('aurora_export_timeline should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_export_timeline');
      expect(tool?.parameters).toBeDefined();
      
      // timeline_id should be required
      const schema = (tool?.parameters as any)._def?.shape || {};
      expect(schema.timeline_id).toBeDefined();
    });

    it('aurora_import_timeline should have valid schema', () => {
      const tool = auroraTools.find(t => t.name === 'aurora_import_timeline');
      expect(tool?.parameters).toBeDefined();
      
      // input_path should be required
      const schema = (tool?.parameters as any)._def?.shape || {};
      expect(schema.input_path).toBeDefined();
    });
  });

  describe('Aurora Manager Initialization', () => {
    it('should initialize AuroraManager successfully', async () => {
      const manager = await getAuroraManager();
      expect(manager).toBeDefined();
      expect(typeof manager.handleAnalyzeAudio).toBe('function');
      expect(typeof manager.handleScanDevices).toBe('function');
    });

    it('should return same instance on multiple calls', async () => {
      const manager1 = await getAuroraManager();
      const manager2 = await getAuroraManager();
      expect(manager1).toBe(manager2);
    });

    it('should reset manager properly', async () => {
      let manager = await getAuroraManager();
      expect(manager).toBeDefined();
      
      resetAuroraManager();
      
      // After reset, new instance should be created
      const newManager = await getAuroraManager();
      expect(newManager).toBeDefined();
    });
  });

  describe('Tool Execution Capability', () => {
    it('all Aurora tools should have execute function', () => {
      auroraTools.forEach(tool => {
        expect(typeof tool.execute).toBe('function');
      });
    });

    it('aurora_get_status should execute without parameters', async () => {
      const tool = auroraTools.find(t => t.name === 'aurora_get_status');
      if (tool?.execute) {
        const result = await tool.execute({});
        expect(result).toBeDefined();
      }
    });

    it('aurora_list_timelines should execute without parameters', async () => {
      const tool = auroraTools.find(t => t.name === 'aurora_list_timelines');
      if (tool?.execute) {
        const result = await tool.execute({});
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('Tool Integration Flow', () => {
    it('should handle get_status -> list_timelines flow', async () => {
      const statusTool = auroraTools.find(t => t.name === 'aurora_get_status');
      const listTool = auroraTools.find(t => t.name === 'aurora_list_timelines');

      if (statusTool?.execute && listTool?.execute) {
        const status = await statusTool.execute({});
        const timelines = await listTool.execute({});

        expect(status).toBeDefined();
        expect(Array.isArray(timelines)).toBe(true);
      }
    });

    it('should reset state properly between operations', async () => {
      const tool = auroraTools.find(t => t.name === 'aurora_get_status');
      
      if (tool?.execute) {
        const status1 = await tool.execute({});
        expect(status1).toBeDefined();

        resetAuroraManager();

        const status2 = await tool.execute({});
        expect(status2).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('aurora_profile_device should handle missing entity', async () => {
      const tool = auroraTools.find(t => t.name === 'aurora_profile_device');
      
      if (tool?.execute) {
        const result = await tool.execute({
          entity_id: 'light.nonexistent',
          iterations: 1,
        });
        
        // Should either error or return error status
        expect(result).toBeDefined();
      }
    });

    it('aurora_play_timeline should handle missing timeline', async () => {
      const tool = auroraTools.find(t => t.name === 'aurora_play_timeline');
      
      if (tool?.execute) {
        const result = await tool.execute({
          timeline_id: 'nonexistent-timeline',
        });
        
        // Should either error or return error status
        expect(result).toBeDefined();
      }
    });

    it('aurora_export_timeline should handle missing timeline', async () => {
      const tool = auroraTools.find(t => t.name === 'aurora_export_timeline');
      
      if (tool?.execute) {
        const result = await tool.execute({
          timeline_id: 'nonexistent-timeline',
        });
        
        // Should either error or return error status
        expect(result).toBeDefined();
      }
    });
  });
});
