/**
 * Aurora Module
 * Export all Aurora components
 */

export { AuroraEngine } from './engine.js';
export { auroraManager } from './manager.js';
export { getAuroraInstructions, formatInstructionsForAgent, validateConfig } from './instructions.js';
export { auroraTools } from './tool.js';
export * from './types.js';

// Audio module exports
export { AudioAnalyzer } from './audio/analyzer.js';
export { AudioCapture } from './audio/capture.js';
export { ChunkedAudioAnalyzer } from './audio/chunked-analyzer.js';
export { AudioDownloader } from './audio/downloader.js';
export { LocalAudioPlayer } from './audio/player.js';
export { MicrophoneCapture } from './audio/microphone.js';
export { AudioInputHandler } from './audio/input.js';

// Device module exports
export { DeviceScanner } from './devices/scanner.js';
export { DeviceProfiler } from './devices/profiler.js';
export { DeviceMeasurementCollector } from './devices/measurement.js';

// Rendering module exports
export { TimelineGenerator } from './rendering/timeline.js';
export { AudioLightMapper } from './rendering/mapper.js';
export { SynchronizationCalculator } from './rendering/synchronizer.js';

// Execution module exports
export { TimelineExecutor } from './execution/executor.js';

// Configuration exports
export { DEFAULT_CONFIG } from './config.js';
