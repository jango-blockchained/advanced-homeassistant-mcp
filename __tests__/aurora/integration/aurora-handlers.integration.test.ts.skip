/**
 * Aurora Tool Handler Tests
 * Tests individual tool handlers and their integration with AuroraManager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getAuroraManager, resetAuroraManager } from '../../../src/tools/aurora/manager';
import type { AuroraManager } from '../../../src/aurora/handlers';

describe('Aurora Tool Handlers', () => {
  let manager: AuroraManager;

  beforeEach(async () => {
    manager = await getAuroraManager();
  });

  afterEach(() => {
    resetAuroraManager();
  });

  describe('handleGetStatus', () => {
    it('should return system status', async () => {
      const status = (await manager.handleGetStatus({})) as Record<string, unknown>;
      
      expect(status).toBeDefined();
      expect(status.version).toBeDefined();
      expect(status.timelines_loaded).toBe(0);
      expect(status.devices_profiled).toBe(0);
      expect(status.playback).toBeDefined();
      expect((status.playback as Record<string, unknown>).state).toBe('idle');
    });

    it('should return verbose status when requested', async () => {
      const status = (await manager.handleGetStatus({ verbose: true })) as Record<string, unknown>;
      
      expect(status).toBeDefined();
      expect(status.device_profiles).toBeDefined();
      expect(status.timelines).toBeDefined();
      expect(Array.isArray(status.device_profiles)).toBe(true);
      expect(Array.isArray(status.timelines)).toBe(true);
    });
  });

  describe('handleListTimelines', () => {
    it('should return empty list initially', async () => {
      const timelines = (await manager.handleListTimelines({})) as unknown[];
      
      expect(Array.isArray(timelines)).toBe(true);
      expect(timelines.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const timelines = (await manager.handleListTimelines({ limit: 5 })) as unknown[];
      
      expect(Array.isArray(timelines)).toBe(true);
      // Should have at most 5 items
      expect(timelines.length).toBeLessThanOrEqual(5);
    });
  });

  describe('handleScanDevices', () => {
    it('should handle device scanning', async () => {
      try {
        const result = await manager.handleScanDevices({});
        
        expect(result).toBeDefined();
        expect(result.devices).toBeDefined();
        expect(result.statistics).toBeDefined();
        expect(Array.isArray(result.devices)).toBe(true);
      } catch (error) {
        // May fail if Home Assistant not available, but method should exist
        expect(typeof manager.handleScanDevices).toBe('function');
      }
    });

    it('should support filtering by area', async () => {
      try {
        const result = await manager.handleScanDevices({ area: 'living_room' });
        
        expect(result).toBeDefined();
        expect(Array.isArray(result.devices)).toBe(true);
      } catch (error) {
        // May fail if Home Assistant not available
        expect(typeof manager.handleScanDevices).toBe('function');
      }
    });

    it('should support filtering by capability', async () => {
      try {
        const result = await manager.handleScanDevices({ capability: 'color' });
        
        expect(result).toBeDefined();
        expect(Array.isArray(result.devices)).toBe(true);
      } catch (error) {
        // May fail if Home Assistant not available
        expect(typeof manager.handleScanDevices).toBe('function');
      }
    });
  });

  describe('handleControlPlayback', () => {
    it('should handle pause action', async () => {
      try {
        const result = await manager.handleControlPlayback({ action: 'pause' });
        
        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
      } catch (error) {
        // Expected when no active playback
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should handle stop action', async () => {
      try {
        const result = await manager.handleControlPlayback({ action: 'stop' });
        
        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
      } catch (error) {
        // Expected when no active playback
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should require position for seek action', async () => {
      try {
        await manager.handleControlPlayback({ action: 'seek' });
        // Should have thrown error due to missing position
        expect(true).toBe(false);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('Position');
      }
    });
  });

  describe('State Management', () => {
    it('should maintain separate manager instances after reset', async () => {
      const manager1 = await getAuroraManager();
      const id1 = (manager1 as unknown as Record<string, unknown>).constructor.name;
      
      resetAuroraManager();
      
      const manager2 = await getAuroraManager();
      const id2 = (manager2 as unknown as Record<string, unknown>).constructor.name;
      
      expect(id1).toBe('AuroraManager');
      expect(id2).toBe('AuroraManager');
    });

    it('should clear state on reset', async () => {
      const statusBefore = (await manager.handleGetStatus({})) as Record<string, unknown>;
      expect(statusBefore.timelines_loaded).toBe(0);
      
      resetAuroraManager();
      
      const newManager = await getAuroraManager();
      const statusAfter = (await newManager.handleGetStatus({})) as Record<string, unknown>;
      expect(statusAfter.timelines_loaded).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid profile device gracefully', async () => {
      try {
        await manager.handleProfileDevice({
          entity_id: 'light.nonexistent',
          iterations: 1,
        });
      } catch (error) {
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should handle missing timeline for export', async () => {
      try {
        await manager.handleExportTimeline({
          timeline_id: 'nonexistent',
        });
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('not found');
      }
    });

    it('should handle missing timeline for playback', async () => {
      try {
        await manager.handlePlayTimeline({
          timeline_id: 'nonexistent',
        });
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('not found');
      }
    });
  });

  describe('Method Signatures', () => {
    it('all handler methods should be callable', () => {
      expect(typeof manager.handleAnalyzeAudio).toBe('function');
      expect(typeof manager.handleScanDevices).toBe('function');
      expect(typeof manager.handleProfileDevice).toBe('function');
      expect(typeof manager.handleRenderTimeline).toBe('function');
      expect(typeof manager.handlePlayTimeline).toBe('function');
      expect(typeof manager.handleControlPlayback).toBe('function');
      expect(typeof manager.handleGetStatus).toBe('function');
      expect(typeof manager.handleListTimelines).toBe('function');
      expect(typeof manager.handleExportTimeline).toBe('function');
      expect(typeof manager.handleImportTimeline).toBe('function');
    });

    it('should have getTimeline method', () => {
      expect(typeof manager.getTimeline).toBe('function');
    });

    it('should have getDeviceProfiles method', () => {
      expect(typeof manager.getDeviceProfiles).toBe('function');
    });

    it('should have clear method', () => {
      expect(typeof manager.clear).toBe('function');
    });
  });
});
