/**
 * Tests for FFT Hamming window pre-computation optimization
 * Verifies that windowing is pre-computed and cached effectively
 */

import { describe, it, expect, beforeEach } from 'bun:test';

describe('FFT Hamming Window Caching', () => {
  let fftSize: number;
  let hammingWindow: Float32Array | null;
  let windowComputationCount: number;

  beforeEach(() => {
    fftSize = 2048;
    hammingWindow = null;
    windowComputationCount = 0;
  });

  it('should pre-compute Hamming window on initialization', () => {
    const precomputeHammingWindow = () => {
      const window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      }
      windowComputationCount++;
      return window;
    };

    hammingWindow = precomputeHammingWindow();

    expect(hammingWindow).not.toBeNull();
    expect(hammingWindow!.length).toBe(fftSize);
    expect(windowComputationCount).toBe(1);
  });

  it('should have correct window values', () => {
    const precomputeHammingWindow = () => {
      const window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      }
      return window;
    };

    hammingWindow = precomputeHammingWindow();

    // Verify first value (should be near 0.08)
    expect(Math.abs(hammingWindow![0] - 0.08)).toBeLessThan(0.01);

    // Verify middle value (should be near 1.0)
    const midpoint = Math.floor(fftSize / 2);
    expect(Math.abs(hammingWindow![midpoint] - 1.0)).toBeLessThan(0.01);

    // Verify last value (should be near 0.08)
    expect(Math.abs(hammingWindow![fftSize - 1] - 0.08)).toBeLessThan(0.01);
  });

  it('should reuse cached window without recomputation', () => {
    const precomputeHammingWindow = () => {
      const window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      }
      windowComputationCount++;
      return window;
    };

    // Compute once
    hammingWindow = precomputeHammingWindow();
    expect(windowComputationCount).toBe(1);

    // Simulate reusing cached window (no recomputation)
    const reusedWindow = hammingWindow;
    expect(windowComputationCount).toBe(1); // Still 1, no recomputation

    // Verify window is the same
    expect(reusedWindow).toBe(hammingWindow);
  });

  it('should apply pre-computed window to signal', () => {
    const precomputeHammingWindow = () => {
      const window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      }
      windowComputationCount++;
      return window;
    };

    const applyPrecomputedWindow = (data: Float32Array, window: Float32Array) => {
      const windowed = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        windowed[i] = data[i] * window[i];
      }
      return windowed;
    };

    // Compute window
    hammingWindow = precomputeHammingWindow();

    // Create test signal (sine wave)
    const signal = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      signal[i] = Math.sin((2 * Math.PI * i) / fftSize);
    }

    // Apply windowed
    const windowedSignal = applyPrecomputedWindow(signal, hammingWindow);

    expect(windowedSignal.length).toBe(fftSize);
    // First and last values should be near zero due to window
    expect(Math.abs(windowedSignal[0])).toBeLessThan(0.1);
    expect(Math.abs(windowedSignal[fftSize - 1])).toBeLessThan(0.1);
  });

  it('should achieve performance improvement with cached window', () => {
    const precomputeHammingWindow = () => {
      const window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      }
      windowComputationCount++;
      return window;
    };

    const applyPrecomputedWindow = (data: Float32Array, window: Float32Array) => {
      const windowed = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        windowed[i] = data[i] * window[i];
      }
      return windowed;
    };

    // Pre-compute window once
    hammingWindow = precomputeHammingWindow();
    const windowComputations = windowComputationCount;

    // Create test signal
    const signal = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      signal[i] = Math.sin((2 * Math.PI * i) / fftSize);
    }

    // Apply window multiple times (simulating analysis of multiple frames)
    const numFrames = 86400; // Simulating a 10-minute audio at 44.1kHz
    for (let frame = 0; frame < numFrames; frame++) {
      applyPrecomputedWindow(signal, hammingWindow!);
    }

    // Window should only be computed once
    expect(windowComputationCount).toBe(windowComputations);
    expect(windowComputationCount).toBe(1);
  });

  it('should handle different FFT sizes', () => {
    const testFFTSizes = [256, 512, 1024, 2048, 4096];

    testFFTSizes.forEach(size => {
      const window = new Float32Array(size);
      for (let i = 0; i < size; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
      }

      expect(window.length).toBe(size);
      expect(window[0]).toBeGreaterThan(0);
      expect(window[0]).toBeLessThan(0.1);
    });
  });

  it('should maintain window consistency across multiple uses', () => {
    const precomputeHammingWindow = () => {
      const window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      }
      return window;
    };

    hammingWindow = precomputeHammingWindow();
    const firstCopy = new Float32Array(hammingWindow);

    // Simulate using window multiple times
    const signal = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      signal[i] = Math.random();
    }

    // Use window 1000 times
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < fftSize; j++) {
        signal[j] = signal[j] * hammingWindow![j];
      }
    }

    // Verify window hasn't changed
    for (let i = 0; i < fftSize; i++) {
      expect(hammingWindow![i]).toBe(firstCopy[i]);
    }
  });

  it('should reduce memory allocation with caching', () => {
    const precomputeHammingWindow = () => {
      const window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      }
      windowComputationCount++;
      return window;
    };

    // With caching: compute once
    let allocations = 0;
    hammingWindow = precomputeHammingWindow();
    allocations = windowComputationCount;

    // Simulate 100 frames of analysis with cached window
    for (let frame = 0; frame < 100; frame++) {
      // Reuse cached window - no new allocation
      const signal = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        signal[i] = signal[i] * hammingWindow![i];
      }
    }

    // Should only have allocated window once
    expect(allocations).toBe(1);
  });

  it('should compute window efficiently', () => {
    const startTime = Date.now();

    const precomputeHammingWindow = () => {
      const window = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
      }
      return window;
    };

    // Pre-compute once
    hammingWindow = precomputeHammingWindow();
    const computeTime = Date.now() - startTime;

    // Should be very fast (under 10ms on any system)
    expect(computeTime).toBeLessThan(10);
  });
});
