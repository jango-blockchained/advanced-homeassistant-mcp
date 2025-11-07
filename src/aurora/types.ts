/**
 * Aurora Sound-to-Light System - Type Definitions
 */

// ============================================================================
// Audio Analysis Types
// ============================================================================

export interface AudioFeatures {
  /** Beats per minute */
  bpm: number;
  /** Detected beats with timestamps (in seconds) */
  beats: number[];
  /** Frequency analysis per time slice */
  frequencyData: FrequencySlice[];
  /** Overall mood/energy (0-1) */
  energy: number;
  /** Detected mood */
  mood?: 'calm' | 'energetic' | 'intense' | 'dramatic' | 'ambient';
  /** Duration in seconds */
  duration: number;
}

export interface FrequencySlice {
  /** Timestamp in seconds */
  timestamp: number;
  /** Bass frequencies (20-250 Hz) - normalized 0-1 */
  bass: number;
  /** Mid frequencies (250-4000 Hz) - normalized 0-1 */
  mid: number;
  /** Treble frequencies (4000-20000 Hz) - normalized 0-1 */
  treble: number;
  /** Overall amplitude - normalized 0-1 */
  amplitude: number;
  /** Dominant frequency in Hz */
  dominantFrequency: number;
}

export interface AudioBuffer {
  /** Audio sample rate (e.g., 44100 Hz) */
  sampleRate: number;
  /** Number of channels (1 = mono, 2 = stereo) */
  channels: number;
  /** Audio samples per channel */
  data: Float32Array[];
  /** Duration in seconds */
  duration: number;
}

// ============================================================================
// Device Types
// ============================================================================

export interface LightDevice {
  /** Home Assistant entity ID */
  entityId: string;
  /** Friendly name */
  name: string;
  /** Device manufacturer/model */
  manufacturer?: string;
  model?: string;
  /** Device capabilities */
  capabilities: DeviceCapabilities;
  /** Device profile with timing characteristics */
  profile?: DeviceProfile;
  /** Area/zone assignment */
  area?: string;
  /** Device state */
  state: 'on' | 'off' | 'unavailable';
}

export interface DeviceCapabilities {
  /** Supports RGB color */
  supportsColor: boolean;
  /** Supports color temperature */
  supportsColorTemp: boolean;
  /** Supports brightness */
  supportsBrightness: boolean;
  /** Supports effects */
  supportsEffects: boolean;
  /** Supported effects list */
  effects?: string[];
  /** Min color temperature in mireds */
  minMireds?: number;
  /** Max color temperature in mireds */
  maxMireds?: number;
  /** Min color temperature in Kelvin */
  minColorTempKelvin?: number;
  /** Max color temperature in Kelvin */
  maxColorTempKelvin?: number;
  /** Min brightness (usually 0) */
  minBrightness?: number;
  /** Max brightness (usually 255) */
  maxBrightness?: number;
  /** Supported color modes (e.g., 'hs', 'rgb', 'xy', 'color_temp') */
  colorModes?: string[];
  /** Current color mode */
  currentColorMode?: string;
  /** Brightness range as percentage */
  brightnessPercentage?: number;
  /** Effect speed capability (0-1, 0 = no support) */
  effectSpeed?: number;
}

export interface DeviceProfile {
  /** Entity ID this profile belongs to */
  entityId: string;
  /** Command to visible change latency in milliseconds */
  latencyMs: number;
  /** Minimum transition time in milliseconds */
  minTransitionMs: number;
  /** Maximum transition time in milliseconds */
  maxTransitionMs: number;
  /** Color accuracy (0-1, where 1 is perfect) */
  colorAccuracy?: number;
  /** Brightness linearity (0-1, where 1 is perfectly linear) */
  brightnessLinearity?: number;
  /** Last calibration timestamp */
  lastCalibrated: Date;
  /** Calibration method used */
  calibrationMethod: 'auto' | 'manual' | 'estimated';
  /** Additional notes */
  notes?: string;
  // Enhanced measurement data
  /** Effect performance metrics */
  effectsPerformance?: EffectPerformance[];
  /** Detailed transition measurements */
  transitionProfiles?: TransitionProfile[];
  /** Color accuracy data by mode */
  colorAccuracyByMode?: Record<string, number>;
  /** Brightness curve linearity data */
  brightnessCurve?: BrightnessCurveData;
  /** Response time consistency (standard deviation) */
  responseTimeConsistency?: number;
  /** Peak response time (99th percentile) */
  peakResponseTimeMs?: number;
  /** Average power consumption during operations */
  avgPowerConsumption?: number;
  /** Manufacturer/model information for reference */
  deviceInfo?: {
    manufacturer?: string;
    model?: string;
    hwVersion?: string;
    swVersion?: string;
  };
  /** Last test results */
  lastTestResults?: ProfileTestResult[];
}

export interface EffectPerformance {
  /** Effect name */
  effectName: string;
  /** Whether effect is supported/available */
  supported: boolean;
  /** Response time in ms */
  responseTimeMs?: number;
  /** Smoothness rating (0-1) */
  smoothness?: number;
  /** Color accuracy when using effect (0-1) */
  colorAccuracy?: number;
  /** Notes about effect behavior */
  notes?: string;
}

export interface TransitionProfile {
  /** Transition duration in seconds */
  duration: number;
  /** Actual time taken in milliseconds */
  actualTimeMs: number;
  /** Smoothness rating (0-1) */
  smoothness: number;
  /** Number of measurements */
  samples: number;
  /** Consistency (standard deviation) */
  consistency: number;
}

export interface BrightnessCurveData {
  /** Measured brightness at different input levels */
  measurements: Array<{
    input: number;
    output: number;
    timestamp: Date;
  }>;
  /** Linear regression fit (R² value) */
  linearityFit?: number;
  /** Curve type (linear, logarithmic, etc.) */
  curveType?: string;
}

// ============================================================================
// Rendering Types
// ============================================================================

export interface RenderTimeline {
  /** Unique timeline ID */
  id: string;
  /** Timeline name */
  name: string;
  /** Associated audio file path */
  audioFile?: string;
  /** Audio features used for rendering */
  audioFeatures: AudioFeatures;
  /** Duration in seconds */
  duration: number;
  /** Device-specific command tracks */
  tracks: DeviceTrack[];
  /** Rendering metadata */
  metadata: RenderMetadata;
  /** Created timestamp */
  createdAt: Date;
}

export interface DeviceTrack {
  /** Entity ID for this track */
  entityId: string;
  /** Device name */
  deviceName: string;
  /** Timed commands for this device */
  commands: TimedCommand[];
  /** Track-specific compensation offset in milliseconds */
  compensationMs: number;
}

export interface TimedCommand {
  /** Execution timestamp in seconds from timeline start */
  timestamp: number;
  /** Command type */
  type: 'turn_on' | 'turn_off' | 'set_color' | 'set_brightness' | 'set_color_temp' | 'effect';
  /** Command parameters */
  params: CommandParams;
  /** Original timestamp before compensation */
  originalTimestamp?: number;
}

export interface CommandParams {
  /** RGB color [r, g, b] (0-255) */
  rgb_color?: [number, number, number];
  /** Brightness (0-255) */
  brightness?: number;
  /** Color temperature in mireds */
  color_temp?: number;
  /** Transition time in seconds */
  transition?: number;
  /** Effect name */
  effect?: string;
}

export interface RenderMetadata {
  /** Renderer version */
  version: string;
  /** Render settings used */
  settings: RenderSettings;
  /** Number of devices involved */
  deviceCount: number;
  /** Total number of commands */
  commandCount: number;
  /** Processing time in seconds */
  processingTime: number;
}

export interface RenderSettings {
  /** Effect intensity (0-1) */
  intensity: number;
  /** Color mapping mode */
  colorMapping: 'frequency' | 'mood' | 'custom';
  /** Brightness mapping mode */
  brightnessMapping: 'amplitude' | 'energy' | 'beats' | 'custom';
  /** Enable beat synchronization */
  beatSync: boolean;
  /** Enable smooth transitions */
  smoothTransitions: boolean;
  /** Minimum time between commands (ms) */
  minCommandInterval: number;
  /** Zone-specific settings */
  zoneSettings?: Record<string, ZoneSettings>;
}

export interface ZoneSettings {
  /** Zone name */
  name: string;
  /** Entity IDs in this zone */
  entities: string[];
  /** Zone-specific color mapping */
  colorMapping?: 'frequency' | 'mood' | 'custom';
  /** Zone-specific intensity multiplier */
  intensityMultiplier?: number;
  /** Delay offset for this zone in milliseconds */
  delayMs?: number;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface ExecutionState {
  /** Current playback state */
  state: 'idle' | 'playing' | 'paused' | 'stopped';
  /** Current timeline being executed */
  timeline?: RenderTimeline;
  /** Current playback position in seconds */
  position: number;
  /** Start time (Date) */
  startedAt?: Date;
  /** Execution mode */
  mode: 'live' | 'prerendered';
  /** Command queue stats */
  queueStats: QueueStats;
}

export interface QueueStats {
  /** Commands in queue */
  queued: number;
  /** Commands executed */
  executed: number;
  /** Commands failed */
  failed: number;
  /** Average execution latency in ms */
  avgLatency: number;
}

export interface ExecutionCommand {
  /** Target entity ID */
  entityId: string;
  /** Command to execute */
  command: TimedCommand;
  /** Scheduled execution time (absolute timestamp) */
  scheduledTime: number;
  /** Retry count */
  retries: number;
  /** Execution status */
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

// ============================================================================
// Profiling Types
// ============================================================================

export interface ProfileTestResult {
  /** Entity ID tested */
  entityId: string;
  /** Test type */
  testType: 'latency' | 'color' | 'brightness' | 'transition';
  /** Test result success */
  success: boolean;
  /** Measured value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Test timestamp */
  timestamp: Date;
  /** Error message if failed */
  error?: string;
}

export interface ProfileTestSuite {
  /** Entity ID being tested */
  entityId: string;
  /** All test results */
  results: ProfileTestResult[];
  /** Overall success */
  success: boolean;
  /** Generated profile */
  profile?: DeviceProfile;
  /** Test duration in seconds */
  duration: number;
}

// ============================================================================
// AI/ML Types
// ============================================================================

export interface AIOptimizationParams {
  /** Target mood/style */
  mood?: string;
  /** Genre of music */
  genre?: string;
  /** User preferences */
  preferences?: UserPreferences;
  /** Historical performance data */
  history?: OptimizationHistory[];
}

export interface UserPreferences {
  /** Preferred color palette */
  colorPalette?: string[];
  /** Preferred intensity (0-1) */
  intensity?: number;
  /** Preferred transition speed */
  transitionSpeed?: 'slow' | 'medium' | 'fast';
  /** Enable bass emphasis */
  bassEmphasis?: boolean;
}

export interface OptimizationHistory {
  /** Audio features */
  features: AudioFeatures;
  /** Settings used */
  settings: RenderSettings;
  /** User rating (1-5) */
  rating?: number;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AuroraConfig {
  /** Enable Aurora module */
  enabled: boolean;
  /** Audio settings */
  audio: AudioConfig;
  /** Device profiling settings */
  profiling: ProfilingConfig;
  /** Rendering settings */
  rendering: RenderSettings;
  /** Execution settings */
  execution: ExecutionConfig;
  /** Storage paths */
  storage: StorageConfig;
}

export interface AudioConfig {
  /** Sample rate for analysis */
  sampleRate: number;
  /** FFT size (power of 2) */
  fftSize: number;
  /** Analysis hop size */
  hopSize: number;
  /** Microphone device ID */
  microphoneDeviceId?: string;
}

export interface ProfilingConfig {
  /** Enable automatic profiling */
  autoProfile: boolean;
  /** Re-profile interval in days */
  reprofileInterval: number;
  /** Number of test iterations */
  testIterations: number;
  /** Test timeout in seconds */
  testTimeout: number;
}

export interface ExecutionConfig {
  /** Maximum commands per second */
  maxCommandsPerSecond: number;
  /** Enable command batching */
  enableBatching: boolean;
  /** Retry failed commands */
  retryFailedCommands: boolean;
  /** Maximum retries */
  maxRetries: number;
}

export interface StorageConfig {
  /** Path to device profiles */
  profilesPath: string;
  /** Path to rendered timelines */
  timelinesPath: string;
  /** Path to audio cache */
  audioCachePath: string;
}
