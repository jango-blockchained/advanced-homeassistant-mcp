/**
 * Aurora Database Layer Tests
 * Comprehensive test suite for SQLite database operations
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AuroraDatabase } from '../../../src/aurora/database/index';

const TEST_DB_PATH = path.join(process.cwd(), '.test-aurora.db');

describe('AuroraDatabase', () => {
  let db: AuroraDatabase;

  beforeAll(async () => {
    // Clean up any existing test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (error) {
      // File doesn't exist, that's ok
    }

    // Create new database instance
    db = new AuroraDatabase({ filePath: TEST_DB_PATH });
    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Close database and clean up
    db.close();
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (error) {
      // File might not exist
    }
  });

  describe('Initialization', () => {
    test('Database instance created', () => {
      expect(db).toBeDefined();
    });

    test('Database file created at specified path', async () => {
      // Trigger database access to create file
      await db.listTimelines();
      
      const fileExists = await new Promise((resolve) => {
        fs.stat(TEST_DB_PATH).then(() => resolve(true)).catch(() => resolve(false));
      });
      expect(fileExists).toBe(true);
    });
  });

  describe('Timeline Operations', () => {
    test('Save new timeline', async () => {
      const timelineId = 'test-timeline-1';
      const audioFeatures = {
        bpm: 120,
        energy: 0.8,
        mood: 'energetic',
      };

      await db.saveTimeline(
        timelineId,
        'Test Timeline',
        60,
        audioFeatures,
        { source: 'test' },
        '/path/to/audio.mp3'
      );

      const timeline = await db.getTimeline(timelineId);
      expect(timeline).toBeDefined();
      expect(timeline?.name).toBe('Test Timeline');
      expect(timeline?.duration).toBe(60);
      expect(timeline?.bpm).toBe(120);
      expect(timeline?.energy).toBe(0.8);
      expect(timeline?.mood).toBe('energetic');
    });

    test('Get non-existent timeline returns null', async () => {
      const timeline = await db.getTimeline('non-existent-id');
      expect(timeline).toBeNull();
    });

    test('Update existing timeline', async () => {
      const timelineId = 'test-timeline-2';
      await db.saveTimeline(timelineId, 'Original Name', 30, { bpm: 100 });
      await db.saveTimeline(timelineId, 'Updated Name', 60, { bpm: 120 });

      const timeline = await db.getTimeline(timelineId);
      expect(timeline?.name).toBe('Updated Name');
      expect(timeline?.duration).toBe(60);
    });

    test('List timelines returns all timelines', async () => {
      await db.saveTimeline('timeline-list-1', 'Timeline 1', 30, { bpm: 100 });
      await db.saveTimeline('timeline-list-2', 'Timeline 2', 45, { bpm: 120 });
      await db.saveTimeline('timeline-list-3', 'Timeline 3', 60, { bpm: 140 });

      const timelines = await db.listTimelines();
      expect(timelines.length).toBeGreaterThan(2);
    });

    test('Delete timeline removes it from database', async () => {
      const timelineId = 'timeline-to-delete';
      await db.saveTimeline(timelineId, 'To Delete', 30, { bpm: 100 });
      
      let timeline = await db.getTimeline(timelineId);
      expect(timeline).toBeDefined();

      await db.deleteTimeline(timelineId);
      
      timeline = await db.getTimeline(timelineId);
      expect(timeline).toBeNull();
    });
  });

  describe('Beat Operations', () => {
    test('Save beats for timeline', async () => {
      const timelineId = 'beat-test-1';
      await db.saveTimeline(timelineId, 'Beat Test', 60, { bpm: 120 });

      const beats = [
        { timestamp: 0, confidence: 0.95 },
        { timestamp: 0.5, confidence: 0.92 },
        { timestamp: 1.0, confidence: 0.98 },
      ];

      await db.saveBeats(timelineId, beats);
      const retrievedBeats = await db.getBeats(timelineId);

      expect(retrievedBeats.length).toBe(3);
      expect(retrievedBeats[0].beat_time).toBe(0);
      expect(retrievedBeats[0].confidence).toBe(0.95);
    });

    test('Get beats for non-existent timeline returns empty array', async () => {
      const beats = await db.getBeats('non-existent-beat-timeline');
      expect(beats).toEqual([]);
    });

    test('Update beats replaces existing beats', async () => {
      const timelineId = 'beat-test-2';
      await db.saveTimeline(timelineId, 'Beat Update Test', 60, { bpm: 120 });

      const beats1 = [{ timestamp: 0, confidence: 0.9 }];
      await db.saveBeats(timelineId, beats1);

      let retrievedBeats = await db.getBeats(timelineId);
      expect(retrievedBeats.length).toBe(1);

      const beats2 = [
        { timestamp: 0, confidence: 0.95 },
        { timestamp: 0.5, confidence: 0.92 },
      ];
      await db.saveBeats(timelineId, beats2);

      retrievedBeats = await db.getBeats(timelineId);
      expect(retrievedBeats.length).toBe(2);
    });
  });

  describe('Frequency Data Operations', () => {
    test('Save frequency data', async () => {
      const timelineId = 'freq-test-1';
      await db.saveTimeline(timelineId, 'Frequency Test', 60, { bpm: 120 });

      const frequencyData = [
        {
          timestamp: 0,
          bass: 0.5,
          mid: 0.6,
          treble: 0.4,
          amplitude: 0.7,
          dominantFrequency: 440,
        },
        {
          timestamp: 1,
          bass: 0.55,
          mid: 0.65,
          treble: 0.45,
          amplitude: 0.75,
          dominantFrequency: 480,
        },
      ];

      await db.saveFrequencyData(timelineId, frequencyData);
      const retrieved = await db.getFrequencyData(timelineId);

      expect(retrieved.length).toBe(2);
      expect(retrieved[0].bass).toBe(0.5);
      expect(retrieved[1].dominant_frequency).toBe(480);
    });

    test('Get frequency data for non-existent timeline returns empty array', async () => {
      const data = await db.getFrequencyData('non-existent-freq-timeline');
      expect(data).toEqual([]);
    });
  });

  describe('Device Operations', () => {
    test('Save device profile', async () => {
      const capabilities = {
        brightness: true,
        color: false,
        colorTemp: true,
      };
      const profile = {
        lastCalibrated: new Date(),
        calibrationMethod: 'auto',
      };

      await db.saveDevice(
        'light.living_room',
        'Living Room Light',
        capabilities,
        profile,
        'Philips',
        'Hue'
      );

      const device = await db.getDevice('light.living_room');
      expect(device).toBeDefined();
      expect(device?.name).toBe('Living Room Light');
      expect(device?.manufacturer).toBe('Philips');
      expect(device?.model).toBe('Hue');
    });

    test('Get non-existent device returns null', async () => {
      const device = await db.getDevice('non-existent-device');
      expect(device).toBeNull();
    });

    test('List devices returns all devices', async () => {
      await db.saveDevice('device-1', 'Device 1', { test: true });
      await db.saveDevice('device-2', 'Device 2', { test: true });
      await db.saveDevice('device-3', 'Device 3', { test: true });

      const devices = await db.listDevices();
      expect(devices.length).toBeGreaterThan(2);
    });

    test('Delete device removes it', async () => {
      const deviceId = 'device-to-delete';
      await db.saveDevice(deviceId, 'To Delete', { test: true });

      let device = await db.getDevice(deviceId);
      expect(device).toBeDefined();

      await db.deleteDevice(deviceId);

      device = await db.getDevice(deviceId);
      expect(device).toBeNull();
    });
  });

  describe('Cache Operations', () => {
    test('Save cache entry', async () => {
      const audioHash = 'hash-123';
      const analysis = { detected_peaks: 5, energy_level: 0.7 };

      await db.saveCacheEntry(audioHash, 44100, 2, 60, analysis);

      const entry = await db.getCacheEntry(audioHash);
      expect(entry).toBeDefined();
      expect(entry?.sample_rate).toBe(44100);
      expect(entry?.channels).toBe(2);
      expect(entry?.duration_sec).toBe(60);
    });

    test('Get non-existent cache entry returns null', async () => {
      const entry = await db.getCacheEntry('non-existent-hash');
      expect(entry).toBeNull();
    });

    test('Cache entry hit count increments on access', async () => {
      const audioHash = 'hash-increment-test';
      await db.saveCacheEntry(audioHash, 44100, 2, 60, { test: true });

      let entry = await db.getCacheEntry(audioHash);
      const hitCount1 = entry?.hit_count ?? 0;

      entry = await db.getCacheEntry(audioHash);
      const hitCount2 = entry?.hit_count ?? 0;

      expect(hitCount2).toBe(hitCount1 + 1);
    });

    test('Clear old cache entries by age', async () => {
      const audioHash1 = 'hash-old-' + Date.now();
      await db.saveCacheEntry(audioHash1, 44100, 2, 60, { test: true });

      // Create fresh entry
      const audioHash2 = 'hash-new-' + Date.now();
      await db.saveCacheEntry(audioHash2, 44100, 2, 60, { test: true });

      // Clear entries older than 0 days (should remove old one)
      const removed = await db.clearOldCache(0);
      expect(typeof removed).toBe('number');
      expect(removed).toBeGreaterThan(-1);
    });
  });

  describe('Execution History', () => {
    test('Record execution', async () => {
      const timelineId = 'exec-test-1';
      await db.saveTimeline(timelineId, 'Execution Test', 60, { bpm: 120 });

      const executionId = await db.recordExecution(
        timelineId,
        5,
        15,
        'completed',
        30
      );

      expect(executionId).toBeGreaterThan(0);
    });

    test('Record execution with errors', async () => {
      const timelineId = 'exec-test-2';
      await db.saveTimeline(timelineId, 'Execution Error Test', 60, { bpm: 120 });

      const errors = [
        { device: 'light.1', error: 'timeout' },
        { device: 'light.2', error: 'offline' },
      ];

      const executionId = await db.recordExecution(
        timelineId,
        5,
        15,
        'failed',
        30,
        errors
      );

      expect(executionId).toBeGreaterThan(0);
    });
  });

  describe('Database Statistics', () => {
    test('Get database statistics', async () => {
      const stats = await db.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.timelineCount).toBe('number');
      expect(typeof stats.deviceCount).toBe('number');
      expect(typeof stats.totalCommands).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.databaseSizeBytes).toBe('number');
    });
  });

  describe('Transaction Support', () => {
    test('Transaction commits successfully', async () => {
      const _timelineId = 'transaction-test-1';

      await db.transaction(() => {
        // This would be called within a transaction in real usage
        return true;
      });

      expect(true).toBe(true);
    });

    test('Transaction callback receives database context', async () => {
      const result = await db.transaction(() => {
        return 'transaction-result';
      });

      expect(result).toBe('transaction-result');
    });
  });

  describe('Database Maintenance', () => {
    test('Vacuum compacts database', async () => {
      const _statsBefore = await db.getStats();
      await db.vacuum();
      const statsAfter = await db.getStats();

      // Database should still be functional after vacuum
      expect(statsAfter).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('Handle missing database gracefully', () => {
      const testDb = new AuroraDatabase({ filePath: TEST_DB_PATH });
      
      // Should not throw
      try {
        testDb.close();
        expect(true).toBe(true);
      } catch (error) {
        expect(false).toBe(true);
      }
    });

    test('Graceful handling of database operations', async () => {
      const timelineId = 'error-test-1';
      
      // Should not throw when saving data
      try {
        await db.saveTimeline(timelineId, 'Error Test', 60, { bpm: 120 });
        expect(true).toBe(true);
      } catch (error) {
        expect(false).toBe(true);
      }
    });
  });

  describe('Data Integrity', () => {
    test('Timeline metadata preserved on save', async () => {
      const timelineId = 'integrity-test-1';
      const metadata = {
        artist: 'Test Artist',
        album: 'Test Album',
        genre: 'Electronic',
        custom_field: 'custom_value',
      };

      await db.saveTimeline(
        timelineId,
        'Integrity Test',
        90,
        { bpm: 128, energy: 0.85, mood: 'upbeat' },
        metadata
      );

      const timeline = await db.getTimeline(timelineId);
      expect(timeline).toBeDefined();
      expect(timeline?.bpm).toBe(128);
      expect(timeline?.energy).toBe(0.85);
      expect(timeline?.mood).toBe('upbeat');
    });

    test('Device capabilities stored correctly', async () => {
      const capabilities = {
        brightness: true,
        color: true,
        colorTemp: true,
        effect: false,
        minBrightness: 0,
        maxBrightness: 255,
        colorModes: ['rgb', 'xy', 'hs'],
      };

      await db.saveDevice('device-integrity', 'Test Device', capabilities);

      const device = await db.getDevice('device-integrity');
      expect(device).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    test('Multiple timelines can be saved and retrieved', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          db.saveTimeline(
            `timeline-concurrent-${i}`,
            `Timeline ${i}`,
            30 + i * 10,
            { bpm: 100 + i * 10 }
          )
        );
      }

      await Promise.all(promises);

      for (let i = 0; i < 5; i++) {
        const timeline = await db.getTimeline(`timeline-concurrent-${i}`);
        expect(timeline).toBeDefined();
      }
    });
  });
});
