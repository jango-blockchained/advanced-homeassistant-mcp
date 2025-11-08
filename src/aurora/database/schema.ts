/**
 * Aurora Database Schema and Types
 * Defines SQLite table structures for timeline storage, device profiles, and analysis cache
 */

/**
 * Database initialization SQL - all tables and indexes
 */
export const ALL_TABLES_SQL = [
  // Tables
  `CREATE TABLE IF NOT EXISTS timelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    audio_file TEXT,
    duration REAL NOT NULL,
    bpm INTEGER,
    energy REAL,
    mood TEXT,
    metadata_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS timeline_beats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timeline_id TEXT NOT NULL,
    beat_time REAL NOT NULL,
    confidence REAL DEFAULT 1.0,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS frequency_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timeline_id TEXT NOT NULL,
    timestamp_sec REAL NOT NULL,
    bass REAL NOT NULL,
    mid REAL NOT NULL,
    treble REAL NOT NULL,
    amplitude REAL NOT NULL,
    dominant_frequency INTEGER,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS devices (
    entity_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    capabilities_json TEXT NOT NULL,
    profile_json TEXT,
    last_calibrated INTEGER,
    calibration_method TEXT DEFAULT 'estimated',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS device_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timeline_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    compensation_ms INTEGER DEFAULT 0,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES devices(entity_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS timed_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    timestamp_sec REAL NOT NULL,
    command_type TEXT NOT NULL,
    params_json TEXT,
    original_timestamp_sec REAL,
    FOREIGN KEY (track_id) REFERENCES device_tracks(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS render_metadata (
    timeline_id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    intensity REAL NOT NULL,
    color_mapping TEXT NOT NULL,
    brightness_mapping TEXT NOT NULL,
    beat_sync BOOLEAN DEFAULT 1,
    smooth_transitions BOOLEAN DEFAULT 1,
    min_command_interval INTEGER DEFAULT 50,
    device_count INTEGER NOT NULL,
    command_count INTEGER NOT NULL,
    processing_time_sec REAL NOT NULL,
    settings_json TEXT,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS analysis_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audio_hash TEXT UNIQUE NOT NULL,
    sample_rate INTEGER NOT NULL,
    channels INTEGER NOT NULL,
    duration_sec REAL NOT NULL,
    analysis_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    accessed_at INTEGER NOT NULL,
    hit_count INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS execution_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timeline_id TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    duration_sec REAL NOT NULL,
    status TEXT NOT NULL,
    device_count INTEGER NOT NULL,
    total_commands INTEGER NOT NULL,
    errors_json TEXT,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
  )`,
  // Indexes
  'CREATE INDEX IF NOT EXISTS idx_timelines_created_at ON timelines(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_timelines_name ON timelines(name)',
  'CREATE INDEX IF NOT EXISTS idx_timeline_beats_timeline_id ON timeline_beats(timeline_id)',
  'CREATE INDEX IF NOT EXISTS idx_timeline_beats_beat_time ON timeline_beats(beat_time)',
  'CREATE INDEX IF NOT EXISTS idx_frequency_data_timeline_id ON frequency_data(timeline_id)',
  'CREATE INDEX IF NOT EXISTS idx_frequency_data_timestamp ON frequency_data(timestamp_sec)',
  'CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name)',
  'CREATE INDEX IF NOT EXISTS idx_devices_manufacturer ON devices(manufacturer)',
  'CREATE INDEX IF NOT EXISTS idx_device_tracks_timeline_id ON device_tracks(timeline_id)',
  'CREATE INDEX IF NOT EXISTS idx_device_tracks_entity_id ON device_tracks(entity_id)',
  'CREATE INDEX IF NOT EXISTS idx_timed_commands_track_id ON timed_commands(track_id)',
  'CREATE INDEX IF NOT EXISTS idx_timed_commands_timestamp ON timed_commands(timestamp_sec)',
  'CREATE INDEX IF NOT EXISTS idx_render_metadata_version ON render_metadata(version)',
  'CREATE INDEX IF NOT EXISTS idx_analysis_cache_hash ON analysis_cache(audio_hash)',
  'CREATE INDEX IF NOT EXISTS idx_analysis_cache_created_at ON analysis_cache(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_execution_history_timeline_id ON execution_history(timeline_id)',
];

/**
 * Database types for row access
 */
export interface TimelineRow {
  id: string;
  name: string;
  audio_file?: string;
  duration: number;
  bpm?: number;
  energy?: number;
  mood?: string;
  metadata_json: string;
  created_at: number;
  updated_at: number;
}

export interface TimelineBeatsRow {
  id: number;
  timeline_id: string;
  beat_time: number;
  confidence: number;
}

export interface FrequencyDataRow {
  id: number;
  timeline_id: string;
  timestamp_sec: number;
  bass: number;
  mid: number;
  treble: number;
  amplitude: number;
  dominant_frequency?: number;
}

export interface DeviceRow {
  entity_id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  capabilities_json: string;
  profile_json?: string;
  last_calibrated?: number;
  calibration_method: string;
  created_at: number;
  updated_at: number;
}

export interface DeviceTrackRow {
  id: number;
  timeline_id: string;
  entity_id: string;
  device_name: string;
  compensation_ms: number;
}

export interface TimedCommandRow {
  id: number;
  track_id: number;
  timestamp_sec: number;
  command_type: string;
  params_json?: string;
  original_timestamp_sec?: number;
}

export interface RenderMetadataRow {
  timeline_id: string;
  version: string;
  intensity: number;
  color_mapping: string;
  brightness_mapping: string;
  beat_sync: number;
  smooth_transitions: number;
  min_command_interval: number;
  device_count: number;
  command_count: number;
  processing_time_sec: number;
  settings_json?: string;
}

export interface AnalysisCacheRow {
  id: number;
  audio_hash: string;
  sample_rate: number;
  channels: number;
  duration_sec: number;
  analysis_json: string;
  created_at: number;
  accessed_at: number;
  hit_count: number;
}

export interface ExecutionHistoryRow {
  id: number;
  timeline_id: string;
  start_time: number;
  end_time: number;
  duration_sec: number;
  status: string;
  device_count: number;
  total_commands: number;
  errors_json?: string;
}

export interface DatabaseStats {
  timelineCount: number;
  deviceCount: number;
  totalCommands: number;
  cacheSize: number;
  databaseSizeBytes: number;
}

export interface Migration {
  version: string;
  timestamp: number;
  description?: string;
}
