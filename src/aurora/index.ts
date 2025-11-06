/**
 * Aurora Sound-to-Light System
 * Main entry point
 */

export { AudioCapture } from './audio/capture';
export { AudioAnalyzer } from './audio/analyzer';
export { DeviceScanner } from './devices/scanner';
export { DeviceProfiler } from './devices/profiler';
export { AudioLightMapper } from './rendering/mapper';
export { SynchronizationCalculator } from './rendering/synchronizer';
export { TimelineGenerator } from './rendering/timeline';
export { TimelineExecutor } from './execution/executor';

export * from './types';

/**
 * Aurora Module Configuration
 */
export const AURORA_VERSION = '0.1.0';
export const AURORA_MODULE_NAME = 'aurora';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  audio: {
    sampleRate: 44100,
    fftSize: 2048,
    hopSize: 512,
  },
  profiling: {
    autoProfile: true,
    reprofileInterval: 30, // days
    testIterations: 3,
    testTimeout: 5, // seconds
  },
  rendering: {
    intensity: 0.7,
    colorMapping: 'frequency' as const,
    brightnessMapping: 'amplitude' as const,
    beatSync: true,
    smoothTransitions: true,
    minCommandInterval: 100, // ms
  },
  execution: {
    maxCommandsPerSecond: 20,
    enableBatching: true,
    retryFailedCommands: true,
    maxRetries: 3,
  },
};
