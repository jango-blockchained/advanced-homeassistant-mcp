/**
 * Tests for Aurora TimelineExecutor sliding window optimization
 * Verifies that command queue remains bounded during playback
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { TimelineExecutor } from '../../src/aurora/execution/executor';
import type { RenderTimeline, DeviceTrack, TimedCommand, CommandParams } from '../../src/aurora/types';

describe('TimelineExecutor Sliding Window', () => {
  let executor: TimelineExecutor;
  let mockHassCallService: jest.Mock;
  let testTimeline: RenderTimeline;

  beforeEach(() => {
    mockHassCallService = jest.fn().mockResolvedValue({});
    executor = new TimelineExecutor(mockHassCallService);

    // Create a test timeline with many commands
    testTimeline = {
      id: 'test-timeline',
      name: 'Test Animation',
      duration: 10,
      audioFile: 'test.wav',
      audioFeatures: {
        bpm: 120,
        beats: [],
        frequencyData: [],
        energy: 0.7,
        mood: 'energetic',
        duration: 10
      },
      tracks: [] as DeviceTrack[],
      metadata: {
        version: '1.0.0',
        settings: {
          intensity: 0.7,
          colorMapping: 'frequency',
          brightnessMapping: 'amplitude',
          beatSync: true,
          smoothTransitions: true,
          minCommandInterval: 100
        },
        deviceCount: 1,
        commandCount: 5000,
        processingTime: 1.2
      },
      createdAt: new Date()
    };

    // Create a device track with many commands (simulating 10-minute animation)
    const commands: TimedCommand[] = [];
    for (let i = 0; i < 5000; i++) {
      commands.push({
        timestamp: (i / 100) * (10 / 50), // Spread 5000 commands over 10 seconds
        type: 'set_brightness',
        params: { brightness: Math.floor(Math.random() * 255) } as CommandParams,
        originalTimestamp: undefined
      });
    }

    testTimeline.tracks.push({
      entityId: 'light.test',
      deviceName: 'Test Light',
      commands,
      compensationMs: 100
    });
  });

  it('should initialize with bounded queue size', () => {
    expect(executor.getPendingCommandsCount()).toBe(0);
  });

  it('should respect MAX_QUEUE_SIZE limit during playback', async () => {
    await executor.play(testTimeline, 0);

    // Check that queue size stays under MAX_QUEUE_SIZE (5000)
    const queueSize = executor.getPendingCommandsCount();
    expect(queueSize).toBeLessThanOrEqual(5000);
    expect(queueSize).toBeGreaterThan(0);

    executor.stop();
  });

  it('should update sliding window as playback progresses', async () => {
    await executor.play(testTimeline, 0);

    const initialQueueSize = executor.getPendingCommandsCount();
    
    // Advance through playback
    await new Promise(resolve => setTimeout(resolve, 200));
    const midQueueSize = executor.getPendingCommandsCount();

    // Queue should have been updated (roughly same size due to sliding window)
    expect(Math.abs(midQueueSize - initialQueueSize)).toBeLessThan(100);

    executor.stop();
  });

  it('should handle seeking without queue explosion', async () => {
    await executor.play(testTimeline, 0);

    // Seek to middle of timeline
    await executor.seek(5.0);

    const queueSize = executor.getPendingCommandsCount();
    expect(queueSize).toBeLessThanOrEqual(5000);

    executor.stop();
  });

  it('should complete playback without memory issues', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    await executor.play(testTimeline, 0);

    // Wait for half duration then stop
    await new Promise(resolve => setTimeout(resolve, 500));

    const memoryUsed = process.memoryUsage().heapUsed - initialMemory;
    
    // Memory usage should be reasonable (less than 10MB for this test)
    expect(memoryUsed).toBeLessThan(10 * 1024 * 1024);

    executor.stop();
  });

  it('should return accurate queue statistics', async () => {
    await executor.play(testTimeline, 0);

    const stats = executor.getQueueStats();
    
    expect(stats.queued).toBeGreaterThan(0);
    expect(stats.queued).toBeLessThanOrEqual(5000);
    expect(stats.executed).toBeGreaterThanOrEqual(0);
    expect(stats.failed).toBe(0); // Should have no failures
    expect(stats.avgLatency).toBeGreaterThanOrEqual(0);

    executor.stop();
  });
});
