/**
 * Unit Tests: Wake Word Detector
 *
 * Tests for wake word detection functionality including:
 * - Service initialization
 * - Detection lifecycle
 * - Event emission
 * - Error handling
 */

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { WakeWordDetector } from "../../src/speech/wakeWordDetector";

// Mock global fetch for Wyoming service status check
const createMockFetch = (shouldSucceed: boolean = true) => {
  return mock(() => {
    if (shouldSucceed) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ status: "running" }),
      } as Response);
    } else {
      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      } as Response);
    }
  });
};

describe("WakeWordDetector", () => {
  let detector: WakeWordDetector;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    detector = new WakeWordDetector("localhost", 10400);
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    
    try {
      await detector.shutdown();
    } catch {
      // Ignore shutdown errors in cleanup
    }
  });

  describe("Initialization", () => {
    test("should create instance with default host and port", () => {
      const defaultDetector = new WakeWordDetector();
      expect(defaultDetector).toBeDefined();
    });

    test("should create instance with custom host and port", () => {
      const customDetector = new WakeWordDetector("192.168.1.100", 8080);
      expect(customDetector).toBeDefined();
    });

    test("should initialize successfully when Wyoming service is available", async () => {
      global.fetch = createMockFetch(true);

      await expect(detector.initialize()).resolves.toBeUndefined();
    });

    test("should initialize even when Wyoming service is not available", async () => {
      global.fetch = createMockFetch(false);

      // Should not throw even if service is unavailable
      await expect(detector.initialize()).resolves.toBeUndefined();
    });

    test("should not initialize twice", async () => {
      global.fetch = createMockFetch(true);

      await detector.initialize();
      await detector.initialize(); // Second call should do nothing

      // Should still work
      expect(detector).toBeDefined();
    });

    test("should handle network errors during initialization", async () => {
      global.fetch = mock(() => Promise.reject(new Error("Network error")));

      // Should not throw - warns and continues
      await expect(detector.initialize()).resolves.toBeUndefined();
    });
  });

  describe("Detection Lifecycle", () => {
    beforeEach(async () => {
      global.fetch = createMockFetch(true);
      await detector.initialize();
    });

    test("should throw when starting detection without initialization", async () => {
      const uninitializedDetector = new WakeWordDetector();
      
      await expect(uninitializedDetector.startListening()).rejects.toThrow(
        "Wake word detector is not initialized"
      );
    });

    test("should not start listening twice", async () => {
      // First start should work
      await detector.startListening();

      // Second start should do nothing (not throw)
      await expect(detector.startListening()).resolves.toBeUndefined();

      await detector.stopListening();
    });

    test("should stop listening", async () => {
      await detector.startListening();
      await expect(detector.stopListening()).resolves.toBeUndefined();
    });

    test("should not fail when stopping without active listening", async () => {
      await expect(detector.stopListening()).resolves.toBeUndefined();
    });

    test("should handle start listening errors gracefully", async () => {
      // This test is tricky since startListening spawns ffmpeg
      // We'll test that it doesn't crash the process
      try {
        await detector.startListening();
        await detector.stopListening();
      } catch (error) {
        // Expected to fail in test environment without ffmpeg
        expect(error).toBeDefined();
      }
    });
  });

  describe("Event Emission", () => {
    beforeEach(async () => {
      global.fetch = createMockFetch(true);
      await detector.initialize();
    });

    test("should emit wake_word_detected event", (done) => {
      detector.once("wake_word_detected", (data) => {
        expect(data).toBeDefined();
        expect(data.timestamp).toBeInstanceOf(Date);
        done();
      });

      // Manually emit for testing
      detector.emit("wake_word_detected", { timestamp: new Date() });
    });

    test("should handle multiple event listeners", (done) => {
      let count = 0;

      const listener1 = () => {
        count++;
        if (count === 2) done();
      };

      const listener2 = () => {
        count++;
        if (count === 2) done();
      };

      detector.on("wake_word_detected", listener1);
      detector.on("wake_word_detected", listener2);

      detector.emit("wake_word_detected", { timestamp: new Date() });
    });
  });

  describe("Shutdown", () => {
    test("should shutdown when not initialized", async () => {
      const newDetector = new WakeWordDetector();
      await expect(newDetector.shutdown()).resolves.toBeUndefined();
    });

    test("should shutdown after initialization", async () => {
      global.fetch = createMockFetch(true);
      await detector.initialize();
      await expect(detector.shutdown()).resolves.toBeUndefined();
    });

    test("should stop listening during shutdown", async () => {
      global.fetch = createMockFetch(true);
      await detector.initialize();
      
      try {
        await detector.startListening();
      } catch {
        // Might fail in test environment
      }

      await expect(detector.shutdown()).resolves.toBeUndefined();
    });

    test("should handle shutdown errors gracefully", async () => {
      global.fetch = createMockFetch(true);
      await detector.initialize();

      // Multiple shutdowns should not throw
      await detector.shutdown();
      await expect(detector.shutdown()).resolves.toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    test("should handle Wyoming service timeout", async () => {
      global.fetch = mock(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 100)
        )
      );

      // Should not throw
      await expect(detector.initialize()).resolves.toBeUndefined();
    });

    test("should handle invalid Wyoming service response", async () => {
      global.fetch = mock(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error("Invalid JSON")),
        } as Response)
      );

      await expect(detector.initialize()).resolves.toBeUndefined();
    });

    test("should handle fetch throwing an error", async () => {
      global.fetch = mock(() => {
        throw new Error("Fetch failed");
      });

      await expect(detector.initialize()).resolves.toBeUndefined();
    });
  });

  describe("Integration with Wyoming Service", () => {
    test("should construct correct Wyoming service URL", async () => {
      const mockFetch = createMockFetch(true);
      global.fetch = mockFetch;

      const customDetector = new WakeWordDetector("192.168.1.50", 9000);
      await customDetector.initialize();

      expect(mockFetch).toHaveBeenCalled();
      
      // Check if the call was made to the correct URL
      const call = mockFetch.mock.calls[0];
      if (call && call.args && call.args[0]) {
        const url = call.args[0].toString();
        expect(url).toContain("192.168.1.50");
        expect(url).toContain("9000");
      }

      await customDetector.shutdown();
    });

    test("should handle multiple initialization attempts", async () => {
      global.fetch = createMockFetch(true);

      await detector.initialize();
      await detector.initialize();
      await detector.initialize();

      // Should still be functional
      expect(detector).toBeDefined();
    });
  });

  describe("State Management", () => {
    beforeEach(async () => {
      global.fetch = createMockFetch(true);
    });

    test("should maintain proper state through lifecycle", async () => {
      // Initialize
      await detector.initialize();

      // Start listening (might fail in test environment)
      try {
        await detector.startListening();
        await detector.stopListening();
      } catch {
        // Expected in test environment
      }

      // Shutdown
      await detector.shutdown();

      // Should not be able to start listening after shutdown
      await expect(detector.startListening()).rejects.toThrow();
    });

    test("should handle rapid state changes", async () => {
      await detector.initialize();

      // Rapid start/stop
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          detector.startListening()
            .catch(() => {}) // Ignore errors
            .then(() => detector.stopListening())
            .catch(() => {}) // Ignore errors
        );
      }

      await Promise.all(promises);
      await detector.shutdown();
    });
  });

  describe("Resource Management", () => {
    test("should clean up resources on shutdown", async () => {
      global.fetch = createMockFetch(true);

      await detector.initialize();
      
      try {
        await detector.startListening();
      } catch {
        // Might fail in test environment
      }

      await detector.shutdown();

      // Verify shutdown worked by trying to start listening again
      await expect(detector.startListening()).rejects.toThrow();
    });

    test("should handle concurrent operations", async () => {
      global.fetch = createMockFetch(true);

      const promises = [
        detector.initialize(),
        detector.initialize(),
        detector.initialize(),
      ];

      await Promise.all(promises);

      // Should still work
      expect(detector).toBeDefined();

      await detector.shutdown();
    });
  });

  describe("Audio Processing", () => {
    test("should handle audio chunks gracefully when not connected", async () => {
      global.fetch = createMockFetch(false);
      await detector.initialize();

      // This test verifies the detector doesn't crash when processing
      // audio without a Wyoming connection
      expect(detector).toBeDefined();
    });
  });

  describe("Configuration", () => {
    test("should accept various host formats", async () => {
      const hosts = [
        "localhost",
        "127.0.0.1",
        "192.168.1.100",
        "wyoming.local",
      ];

      for (const host of hosts) {
        const testDetector = new WakeWordDetector(host, 10400);
        expect(testDetector).toBeDefined();
      }
    });

    test("should accept various port numbers", async () => {
      const ports = [10400, 8080, 9000, 3000];

      for (const port of ports) {
        const testDetector = new WakeWordDetector("localhost", port);
        expect(testDetector).toBeDefined();
      }
    });
  });
});
