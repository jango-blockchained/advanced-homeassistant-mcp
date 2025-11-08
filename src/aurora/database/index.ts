/**
 * Aurora Database Layer
 * Abstraction layer for SQLite database operations using Bun's built-in SQLite
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { Database } from 'bun:sqlite';
import { ALL_TABLES_SQL } from './schema';
import type {
  TimelineRow,
  TimelineBeatsRow,
  FrequencyDataRow,
  DeviceRow,
  AnalysisCacheRow,
  DatabaseStats,
} from './schema';

/**
 * Database connection options
 */
export interface DatabaseOptions {
  /** Database file path (default: ~/.aurora/aurora.db) */
  filePath?: string;
  /** Enable WAL mode for concurrent access */
  wal?: boolean;
  /** Enable foreign keys */
  foreignKeys?: boolean;
  /** Cache size in KB */
  cacheSize?: number;
  /** Journal mode (default: WAL) */
  journalMode?: 'WAL' | 'DELETE' | 'TRUNCATE';
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Aurora Database Manager
 * Handles all database operations with proper connection management and error handling
 */
export class AuroraDatabase {
  private db: Database | null = null;
  private filePath: string;
  private isInitialized: boolean = false;
  private readyPromise: Promise<void>;

  constructor(options: DatabaseOptions = {}) {
    const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '.';
    this.filePath =
      options.filePath ?? path.join(homeDir, '.aurora', 'aurora.db');
    this.readyPromise = this.initialize(options);
  }

  /**
   * Initialize database connection
   */
  private async initialize(_options: DatabaseOptions): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Mark as initialized (actual db load happens lazily)
      this.isInitialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensure database is ready
   */
  private async ensureReady(): Promise<void> {
    if (!this.isInitialized) {
      await this.readyPromise;
    }
    // Lazy-load the database on first access
    this.ensureDatabaseLoaded();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Lazy-load database connection
   */
  private ensureDatabaseLoaded(): void {
    if (this.db === null) {
      // Create new database instance using Bun's built-in SQLite
      this.db = new Database(this.filePath);

      if (this.db === null) {
        throw new Error('Failed to create database connection');
      }

      // Configure database settings
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA foreign_keys = ON');
      this.db.exec('PRAGMA cache_size = -2048');
      this.db.exec('PRAGMA busy_timeout = 5000');

      // Create tables
      for (const tableSql of ALL_TABLES_SQL) {
        this.db.exec(tableSql);
      }

      // Create migration table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          version TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          description TEXT
        );
      `);
    }
  }

  /**
   * Save timeline
   */
  async saveTimeline(
    id: string,
    name: string,
    duration: number,
    audioFeatures: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    audioFile?: string
  ): Promise<void> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const now = Date.now();
    const bpm = typeof audioFeatures.bpm === 'number' ? audioFeatures.bpm : null;
    const energy = typeof audioFeatures.energy === 'number' ? audioFeatures.energy : null;
    const mood = typeof audioFeatures.mood === 'string' ? audioFeatures.mood : null;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO timelines
      (id, name, audio_file, duration, bpm, energy, mood, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      audioFile ?? null,
      duration,
      bpm,
      energy,
      mood,
      JSON.stringify(metadata ?? {}),
      now,
      now
    );
  }

  /**
   * Get timeline by ID
   */
  async getTimeline(id: string): Promise<TimelineRow | null> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('SELECT * FROM timelines WHERE id = ?');
    const result = stmt.get(id) as TimelineRow | undefined;
    return result ?? null;
  }

  /**
   * List all timelines
   */
  async listTimelines(limit: number = 100, offset: number = 0): Promise<TimelineRow[]> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(
      'SELECT * FROM timelines ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    return stmt.all(limit, offset) as TimelineRow[];
  }

  /**
   * Delete timeline and all related data
   */
  async deleteTimeline(id: string): Promise<void> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('DELETE FROM timelines WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Save beats for timeline
   */
  async saveBeats(
    timelineId: string,
    beats: Array<{ timestamp: number; confidence?: number }>
  ): Promise<void> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    // Clear existing beats
    const deleteStmt = this.db.prepare('DELETE FROM timeline_beats WHERE timeline_id = ?');
    deleteStmt.run(timelineId);

    // Insert new beats
    const insertStmt = this.db.prepare(
      'INSERT INTO timeline_beats (timeline_id, beat_time, confidence) VALUES (?, ?, ?)'
    );
    for (const beat of beats) {
      insertStmt.run(timelineId, beat.timestamp, beat.confidence ?? 1.0);
    }
  }

  /**
   * Get beats for timeline
   */
  async getBeats(timelineId: string): Promise<TimelineBeatsRow[]> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(
      'SELECT * FROM timeline_beats WHERE timeline_id = ? ORDER BY beat_time'
    );
    return stmt.all(timelineId) as TimelineBeatsRow[];
  }

  /**
   * Save frequency data for timeline
   */
  async saveFrequencyData(
    timelineId: string,
    frequencyData: Array<Record<string, unknown>>
  ): Promise<void> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    // Clear existing data
    const deleteStmt = this.db.prepare('DELETE FROM frequency_data WHERE timeline_id = ?');
    deleteStmt.run(timelineId);

    // Insert new data
    const insertStmt = this.db.prepare(
      `INSERT INTO frequency_data
       (timeline_id, timestamp_sec, bass, mid, treble, amplitude, dominant_frequency)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const data of frequencyData) {
      const timestamp = typeof data.timestamp === 'number' ? data.timestamp : 0;
      const bass = typeof data.bass === 'number' ? data.bass : 0;
      const mid = typeof data.mid === 'number' ? data.mid : 0;
      const treble = typeof data.treble === 'number' ? data.treble : 0;
      const amplitude = typeof data.amplitude === 'number' ? data.amplitude : 0;
      const dominantFreq =
        typeof data.dominantFrequency === 'number' ? data.dominantFrequency : null;

      insertStmt.run(
        timelineId,
        timestamp,
        bass,
        mid,
        treble,
        amplitude,
        dominantFreq
      );
    }
  }

  /**
   * Get frequency data for timeline
   */
  async getFrequencyData(timelineId: string): Promise<FrequencyDataRow[]> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(
      'SELECT * FROM frequency_data WHERE timeline_id = ? ORDER BY timestamp_sec'
    );
    return stmt.all(timelineId) as FrequencyDataRow[];
  }

  /**
   * Save device profile
   */
  async saveDevice(
    entityId: string,
    name: string,
    capabilities: Record<string, unknown>,
    profile?: Record<string, unknown>,
    manufacturer?: string,
    model?: string
  ): Promise<void> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const now = Date.now();
    let calibratedTime: number | null = null;
    let calibrationMethod = 'estimated';

    if (profile !== undefined && typeof profile === 'object' && profile !== null) {
      if ('lastCalibrated' in profile && profile.lastCalibrated instanceof Date) {
        calibratedTime = profile.lastCalibrated.getTime();
      }
      if ('calibrationMethod' in profile && typeof profile.calibrationMethod === 'string') {
        calibrationMethod = profile.calibrationMethod;
      }
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO devices
      (entity_id, name, manufacturer, model, capabilities_json, profile_json, last_calibrated, calibration_method, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entityId,
      name,
      manufacturer ?? null,
      model ?? null,
      JSON.stringify(capabilities),
      profile ? JSON.stringify(profile) : null,
      calibratedTime,
      calibrationMethod,
      now,
      now
    );
  }

  /**
   * Get device profile
   */
  async getDevice(entityId: string): Promise<DeviceRow | null> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('SELECT * FROM devices WHERE entity_id = ?');
    const result = stmt.get(entityId) as DeviceRow | undefined;
    return result ?? null;
  }

  /**
   * List all devices
   */
  async listDevices(): Promise<DeviceRow[]> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('SELECT * FROM devices ORDER BY name');
    return stmt.all() as DeviceRow[];
  }

  /**
   * Delete device
   */
  async deleteDevice(entityId: string): Promise<void> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('DELETE FROM devices WHERE entity_id = ?');
    stmt.run(entityId);
  }

  /**
   * Get or create cache entry for audio analysis
   */
  async getCacheEntry(audioHash: string): Promise<AnalysisCacheRow | null> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const getStmt = this.db.prepare('SELECT * FROM analysis_cache WHERE audio_hash = ?');
    const entry = getStmt.get(audioHash) as AnalysisCacheRow | undefined;

    if (entry) {
      // Update access time and hit count
      const updateStmt = this.db.prepare(
        'UPDATE analysis_cache SET accessed_at = ?, hit_count = hit_count + 1 WHERE audio_hash = ?'
      );
      updateStmt.run(Date.now(), audioHash);
    }

    return entry ?? null;
  }

  /**
   * Save analysis to cache
   */
  async saveCacheEntry(
    audioHash: string,
    sampleRate: number,
    channels: number,
    durationSec: number,
    analysis: Record<string, unknown>
  ): Promise<void> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO analysis_cache
      (audio_hash, sample_rate, channels, duration_sec, analysis_json, created_at, accessed_at, hit_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      audioHash,
      sampleRate,
      channels,
      durationSec,
      JSON.stringify(analysis),
      now,
      now,
      0
    );
  }

  /**
   * Clear old cache entries
   */
  async clearOldCache(maxAgeDays: number = 30): Promise<number> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;

    const stmt = this.db.prepare('DELETE FROM analysis_cache WHERE accessed_at < ?');
    const result = stmt.run(cutoffTime);
    return result.changes ?? 0;
  }

  /**
   * Record execution history
   */
  async recordExecution(
    timelineId: string,
    deviceCount: number,
    totalCommands: number,
    status: string = 'completed',
    duration?: number,
    errors?: Array<Record<string, unknown>>
  ): Promise<number> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const startTime = Date.now();
    const durationMs = duration !== null && duration !== undefined ? duration * 1000 : 0;
    const endTime = startTime + durationMs;

    const stmt = this.db.prepare(`
      INSERT INTO execution_history
      (timeline_id, start_time, end_time, duration_sec, status, device_count, total_commands, errors_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      timelineId,
      startTime,
      endTime,
      duration ?? durationMs / 1000,
      status,
      deviceCount,
      totalCommands,
      errors ? JSON.stringify(errors) : null
    );

    return Number(result.lastInsertRowid ?? 0);
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const countTimelines = this.db.prepare('SELECT COUNT(*) as count FROM timelines').get() as {
      count: number;
    };
    const countDevices = this.db.prepare('SELECT COUNT(*) as count FROM devices').get() as {
      count: number;
    };
    const countCommands = this.db.prepare('SELECT COUNT(*) as count FROM timed_commands').get() as {
      count: number;
    };
    const countCache = this.db.prepare('SELECT COUNT(*) as count FROM analysis_cache').get() as {
      count: number;
    };

    const fileStat = await fs.stat(this.filePath);

    return {
      timelineCount: countTimelines.count,
      deviceCount: countDevices.count,
      totalCommands: countCommands.count,
      cacheSize: countCache.count,
      databaseSizeBytes: fileStat.size,
    };
  }

  /**
   * Vacuum database
   */
  async vacuum(): Promise<void> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    this.db.exec('VACUUM;');
  }

  /**
   * Run a transaction
   */
  async transaction<T>(callback: () => T): Promise<T> {
    await this.ensureReady();
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    return this.db.transaction(callback)();
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Global database instance
 */
let globalDb: AuroraDatabase | null = null;

/**
 * Get or create global database instance
 */
export function getDatabase(options?: DatabaseOptions): AuroraDatabase {
  if (globalDb === null) {
    globalDb = new AuroraDatabase(options);
  }
  return globalDb;
}

/**
 * Close global database instance
 */
export function closeDatabase(): void {
  if (globalDb !== null) {
    globalDb.close();
    globalDb = null;
  }
}
