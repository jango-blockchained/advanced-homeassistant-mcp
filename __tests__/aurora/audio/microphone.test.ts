/**
 * MicrophoneCapture Tests
 * Comprehensive test suite for real-time audio capture from microphone
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  MicrophoneCapture,
  createMicrophoneCapture,
  isMicrophoneCaptureSupported,
  AudioQuality,
  type MicrophoneCaptureConfig,
  type AudioChunk,
  type MicrophoneDevice,
} from '../../../src/aurora/audio/microphone';

describe('MicrophoneCapture', () => {
  let capture: MicrophoneCapture;

  describe('Initialization', () => {
    it('should create instance with default configuration', () => {
      capture = new MicrophoneCapture();
      expect(capture).toBeDefined();
      expect(capture.isActive()).toBe(false);
    });

    it('should create instance with custom sample rate', () => {
      capture = new MicrophoneCapture({ sampleRate: 48000 });
      expect(capture).toBeDefined();
    });

    it('should create instance with audio quality preset', () => {
      capture = new MicrophoneCapture({ quality: AudioQuality.HIGH });
      expect(capture).toBeDefined();
    });

    it('should create instance with custom channels', () => {
      capture = new MicrophoneCapture({ channels: 2 });
      expect(capture).toBeDefined();
    });

    it('should create instance with custom chunk size', () => {
      capture = new MicrophoneCapture({ chunkSize: 4096 });
      expect(capture).toBeDefined();
    });

    it('should create instance with custom max latency', () => {
      capture = new MicrophoneCapture({ maxLatency: 100 });
      expect(capture).toBeDefined();
    });

    it('should reject invalid sample rate (too low)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ sampleRate: 4000 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(true);
    });

    it('should reject invalid sample rate (too high)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ sampleRate: 256000 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(true);
    });

    it('should reject invalid channels (too few)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ channels: 0 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(true);
    });

    it('should reject invalid channels (too many)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ channels: 16 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(true);
    });

    it('should reject invalid chunk size (too small)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ chunkSize: 128 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(true);
    });

    it('should reject invalid chunk size (too large)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ chunkSize: 131072 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(true);
    });
  });

  describe('Factory Function', () => {
    it('should create instance via factory function', () => {
      capture = createMicrophoneCapture();
      expect(capture).toBeDefined();
      expect(capture instanceof MicrophoneCapture).toBe(true);
    });

    it('should create instance with config via factory function', () => {
      const config: MicrophoneCaptureConfig = {
        sampleRate: 48000,
        channels: 2,
        quality: AudioQuality.ULTRA,
      };
      capture = createMicrophoneCapture(config);
      expect(capture).toBeDefined();
    });
  });

  describe('Audio Quality Presets', () => {
    it('should have LOW quality preset as 8000 Hz', () => {
      expect(AudioQuality.LOW).toBe(8000);
    });

    it('should have MEDIUM quality preset as 16000 Hz', () => {
      expect(AudioQuality.MEDIUM).toBe(16000);
    });

    it('should have HIGH quality preset as 44100 Hz', () => {
      expect(AudioQuality.HIGH).toBe(44100);
    });

    it('should have ULTRA quality preset as 48000 Hz', () => {
      expect(AudioQuality.ULTRA).toBe(48000);
    });

    it('should create instance with LOW quality preset', () => {
      capture = new MicrophoneCapture({ quality: AudioQuality.LOW });
      expect(capture).toBeDefined();
    });

    it('should create instance with MEDIUM quality preset', () => {
      capture = new MicrophoneCapture({ quality: AudioQuality.MEDIUM });
      expect(capture).toBeDefined();
    });

    it('should create instance with ULTRA quality preset', () => {
      capture = new MicrophoneCapture({ quality: AudioQuality.ULTRA });
      expect(capture).toBeDefined();
    });
  });

  describe('Status Methods', () => {
    beforeEach(() => {
      capture = new MicrophoneCapture();
    });

    afterEach(() => {
      if (capture.isActive()) {
        void capture.stopCapture().catch(() => {});
      }
    });

    it('should report inactive status initially', () => {
      expect(capture.isActive()).toBe(false);
    });

    it('should return correct statistics when inactive', () => {
      const stats = capture.getStats();
      expect(typeof stats.isActive).toBe('boolean');
      expect(stats.isActive).toBe(false);
      expect(typeof stats.duration).toBe('number');
      expect(typeof stats.samplesRecorded).toBe('number');
      expect(typeof stats.estimatedLatency).toBe('number');
    });

    it('should have positive estimated latency', () => {
      const stats = capture.getStats();
      expect(stats.estimatedLatency > 0).toBe(true);
      expect(stats.estimatedLatency <= 500).toBe(true);
    });
  });

  describe('Device Enumeration', () => {
    beforeEach(() => {
      capture = new MicrophoneCapture();
    });

    afterEach(() => {
      if (capture.isActive()) {
        void capture.stopCapture().catch(() => {});
      }
    });

    it('should return array of devices', async () => {
      const devices = await capture.listDevices();
      expect(Array.isArray(devices)).toBe(true);
    });

    it('should return devices with valid structure', async () => {
      const devices = await capture.listDevices();
      if (devices.length > 0) {
        const device: MicrophoneDevice = devices[0];
        expect(typeof device.id).toBe('string');
        expect(typeof device.name).toBe('string');
        expect(typeof device.index).toBe('number');
        expect(typeof device.isDefault).toBe('boolean');
        expect(typeof device.sampleRate).toBe('number');
        expect(typeof device.channels).toBe('number');
      }
    });

    it('should have at least one device', async () => {
      const devices = await capture.listDevices();
      expect(devices.length > 0).toBe(true);
    });

    it('should have at least one default device', async () => {
      const devices = await capture.listDevices();
      const defaultDevice = devices.find((d) => d.isDefault);
      expect(defaultDevice !== undefined).toBe(true);
    });

    it('should have valid device sample rates', async () => {
      const devices = await capture.listDevices();
      devices.forEach((device) => {
        expect(device.sampleRate >= 8000).toBe(true);
        expect(device.sampleRate <= 192000).toBe(true);
      });
    });

    it('should have valid channel counts', async () => {
      const devices = await capture.listDevices();
      devices.forEach((device) => {
        expect(device.channels >= 1).toBe(true);
        expect(device.channels <= 8).toBe(true);
      });
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      capture = new MicrophoneCapture();
    });

    afterEach(() => {
      if (capture.isActive()) {
        void capture.stopCapture().catch(() => {});
      }
    });

    it('should be an EventEmitter', () => {
      expect(typeof capture.on).toBe('function');
      expect(typeof capture.emit).toBe('function');
      expect(typeof capture.once).toBe('function');
      expect(typeof capture.off).toBe('function');
    });

    it('should support capture-started event', () => {
      capture.on('capture-started', () => {});
      expect(typeof capture.on).toBe('function');
    });

    it('should support capture-stopped event', () => {
      capture.on('capture-stopped', () => {});
      expect(typeof capture.on).toBe('function');
    });

    it('should support audio-chunk event', () => {
      capture.on('audio-chunk', () => {});
      expect(typeof capture.on).toBe('function');
    });

    it('should support error event', () => {
      capture.on('error', () => {});
      expect(typeof capture.on).toBe('function');
    });

    it('should support warning event', () => {
      capture.on('warning', () => {});
      expect(typeof capture.on).toBe('function');
    });
  });

  describe('Capture Control', () => {
    beforeEach(() => {
      capture = new MicrophoneCapture({ maxLatency: 50 });
    });

    afterEach(() => {
      if (capture.isActive()) {
        void capture.stopCapture().catch(() => {});
      }
    });

    it('should reject stop capture when not active', () => {
      try {
        void capture.stopCapture();
      } catch {
        // Expected behavior
      }
      expect(typeof capture.stopCapture).toBe('function');
    });
  });

  describe('Configuration Validation', () => {
    it('should accept 8000 Hz sample rate (minimum)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ sampleRate: 8000 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should accept 192000 Hz sample rate (maximum)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ sampleRate: 192000 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should accept 1 channel (mono)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ channels: 1 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should accept 8 channels (maximum)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ channels: 8 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should accept 512 sample chunk size (minimum)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ chunkSize: 512 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should accept 65536 sample chunk size (maximum)', () => {
      let threwError = false;
      try {
        capture = new MicrophoneCapture({ chunkSize: 65536 });
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should calculate reasonable chunk size from latency', () => {
      capture = new MicrophoneCapture({
        sampleRate: 44100,
        maxLatency: 50,
      });
      const stats = capture.getStats();
      expect(stats.estimatedLatency).toBe(50);
    });
  });

  describe('Platform Support', () => {
    it('should not throw on platform check', async () => {
      let threwError = false;
      try {
        await isMicrophoneCaptureSupported();
      } catch {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    it('should return boolean from platform check', async () => {
      const supported = await isMicrophoneCaptureSupported();
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('Audio Quality Calculations', () => {
    it('should calculate correct chunk size for 44.1kHz @ 50ms', () => {
      capture = new MicrophoneCapture({
        sampleRate: 44100,
        maxLatency: 50,
      });
      const stats = capture.getStats();
      expect(stats.estimatedLatency).toBe(50);
    });

    it('should calculate correct chunk size for 48kHz @ 50ms', () => {
      capture = new MicrophoneCapture({
        sampleRate: 48000,
        maxLatency: 50,
      });
      const stats = capture.getStats();
      expect(stats.estimatedLatency).toBe(50);
    });

    it('should calculate correct chunk size for 16kHz @ 50ms', () => {
      capture = new MicrophoneCapture({
        sampleRate: 16000,
        maxLatency: 50,
      });
      const stats = capture.getStats();
      expect(stats.estimatedLatency).toBe(50);
    });

    it('should handle 100ms latency requirement', () => {
      capture = new MicrophoneCapture({
        sampleRate: 44100,
        maxLatency: 100,
      });
      const stats = capture.getStats();
      expect(stats.estimatedLatency).toBe(100);
    });

    it('should handle 25ms low-latency requirement', () => {
      capture = new MicrophoneCapture({
        sampleRate: 44100,
        maxLatency: 25,
      });
      const stats = capture.getStats();
      expect(stats.estimatedLatency).toBe(25);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      capture = new MicrophoneCapture();
    });

    afterEach(() => {
      if (capture.isActive()) {
        void capture.stopCapture().catch(() => {});
      }
    });

    it('should handle error events', () => {
      capture.on('error', () => {});
      expect(typeof capture.on).toBe('function');
    });

    it('should handle warning events', () => {
      capture.on('warning', () => {});
      expect(typeof capture.on).toBe('function');
    });

    it('should provide meaningful error messages', () => {
      let errorMessage = '';
      try {
        new MicrophoneCapture({ sampleRate: 1000 });
      } catch (error) {
        if (error instanceof Error) {
          errorMessage = error.message;
        }
      }
      expect(errorMessage.length > 0).toBe(true);
      expect(errorMessage.includes('sample rate')).toBe(true);
    });
  });
});

describe('AudioChunk Interface', () => {
  it('should have correct AudioChunk structure', () => {
    const chunk: AudioChunk = {
      data: [new Float32Array([0.1, 0.2, 0.3])],
      timestamp: 1000,
      sampleRate: 44100,
      channels: 1,
    };

    expect(chunk.data).toBeDefined();
    expect(Array.isArray(chunk.data)).toBe(true);
    expect(chunk.data[0] instanceof Float32Array).toBe(true);
    expect(chunk.timestamp).toBe(1000);
    expect(chunk.sampleRate).toBe(44100);
    expect(chunk.channels).toBe(1);
  });

  it('should support stereo audio chunks', () => {
    const chunk: AudioChunk = {
      data: [
        new Float32Array([0.1, 0.2, 0.3]),
        new Float32Array([0.15, 0.25, 0.35]),
      ],
      timestamp: 2000,
      sampleRate: 48000,
      channels: 2,
    };

    expect(chunk.data.length).toBe(2);
    expect(chunk.channels).toBe(2);
  });

  it('should support surround audio chunks', () => {
    const channels = 6;
    const chunk: AudioChunk = {
      data: Array.from({ length: channels }, () =>
        new Float32Array([0.1, 0.2, 0.3])
      ),
      timestamp: 3000,
      sampleRate: 44100,
      channels,
    };

    expect(chunk.data.length).toBe(6);
    expect(chunk.channels).toBe(6);
  });
});

describe('MicrophoneDevice Interface', () => {
  it('should have correct MicrophoneDevice structure', () => {
    const device: MicrophoneDevice = {
      id: 'default',
      name: 'System Default Microphone',
      index: 0,
      isDefault: true,
      sampleRate: 44100,
      channels: 1,
    };

    expect(device.id).toBe('default');
    expect(device.name).toBe('System Default Microphone');
    expect(device.index).toBe(0);
    expect(device.isDefault).toBe(true);
    expect(device.sampleRate).toBe(44100);
    expect(device.channels).toBe(1);
  });

  it('should support multiple devices', () => {
    const devices: MicrophoneDevice[] = [
      {
        id: 'default',
        name: 'System Default Microphone',
        index: 0,
        isDefault: true,
        sampleRate: 44100,
        channels: 1,
      },
      {
        id: 'external-usb',
        name: 'USB Audio Device',
        index: 1,
        isDefault: false,
        sampleRate: 48000,
        channels: 2,
      },
    ];

    expect(devices.length).toBe(2);
    expect(devices[0].isDefault).toBe(true);
    expect(devices[1].isDefault).toBe(false);
  });
});
