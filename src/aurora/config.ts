/**
 * Aurora Default Configuration
 * Provides default settings for audio analysis and rendering
 */

export const DEFAULT_CONFIG = {
  audio: {
    sampleRate: 44100,
    fftSize: 2048,
    hopSize: 512,
    minAmplitude: 0.01,
    frequencyBands: 64,
  },
  rendering: {
    intensity: 0.7,
    minCommandInterval: 50, // milliseconds
    colorMapping: 'frequency' as const,
    beatSync: true,
    brightnessMapping: 'energy' as const,
    smoothTransitions: true,
    transitionDuration: 200, // milliseconds
  },
  devices: {
    maxDevices: 50,
    scanTimeout: 5000, // milliseconds
    retryAttempts: 3,
  },
  execution: {
    maxQueueSize: 1000,
    commandTimeout: 5000, // milliseconds
    maxConcurrentCommands: 10,
  },
};
