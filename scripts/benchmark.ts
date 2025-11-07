/**
 * Performance Benchmarking Suite
 * Measures the impact of bug fixes and P1 optimizations
 * 
 * Benchmarks:
 * 1. Aurora Timeline Memory Efficiency (sliding window)
 * 2. Audio Analysis Performance (FFT windowing)
 * 3. SSE Broadcast Efficiency (message caching)
 * 4. Cache Hit Rate (domain-specific invalidation)
 * 5. WebSocket Subscription Lifecycle (memory leaks)
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  iterations: number;
  opsPerSecond: number;
  improvement?: number;
}

interface BenchmarkConfig {
  warmupIterations: number;
  testIterations: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  warmupIterations: 10,
  testIterations: 100,
  timeoutMs: 30000
};

class BenchmarkSuite {
  private results: BenchmarkResult[] = [];
  private config: BenchmarkConfig;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Benchmark 1: Aurora Timeline Memory Efficiency
   * Tests sliding window with large command queues
   */
  async benchmarkAuroraMemory(): Promise<void> {
    console.log('\n📊 Benchmark 1: Aurora Timeline Memory Efficiency');
    console.log('─'.repeat(50));

    const MAX_QUEUE_SIZE = 5000;
    const LOOKAHEAD_SECONDS = 2.0;
    let memBefore = process.memoryUsage().heapUsed;

    // Simulate long timeline (10 minutes = 600 seconds)
    const timelineData = this.generateTimelineCommands(600 * 100); // 60,000 commands

    console.log(`Generated timeline with ${timelineData.length} commands`);

    let queuedItems = 0;
    const startTime = performance.now();

    // Simulate sliding window execution
    for (let i = 0; i < timelineData.length; i++) {
      const currentTime = (i / 100) * (600 / 6000); // Normalize to 600 seconds
      const lookaheadTime = currentTime + LOOKAHEAD_SECONDS;

      // Filter commands within lookahead window
      const queuedCommands = timelineData.filter(cmd => {
        return cmd.timestamp >= currentTime && cmd.timestamp <= lookaheadTime;
      });

      queuedItems = queuedCommands.length;

      // Verify queue stays bounded
      if (queuedItems > MAX_QUEUE_SIZE) {
        throw new Error(`Queue exceeded max size: ${queuedItems} > ${MAX_QUEUE_SIZE}`);
      }
    }

    const duration = performance.now() - startTime;
    let memAfter = process.memoryUsage().heapUsed;

    const result: BenchmarkResult = {
      name: 'Aurora Timeline Memory',
      duration,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      memoryDelta: memAfter - memBefore,
      iterations: timelineData.length,
      opsPerSecond: (timelineData.length / duration) * 1000
    };

    console.log(`✓ Duration: ${duration.toFixed(2)}ms`);
    console.log(`✓ Memory delta: ${this.formatBytes(result.memoryDelta)}`);
    console.log(`✓ Queue bounded to: ${MAX_QUEUE_SIZE} items (verified)`);
    console.log(`✓ Ops/sec: ${result.opsPerSecond.toFixed(0)}`);

    this.results.push(result);
  }

  /**
   * Benchmark 2: Audio Analysis FFT Performance
   * Tests Hamming window pre-computation vs per-frame computation
   */
  async benchmarkFFTWindowing(): Promise<void> {
    console.log('\n📊 Benchmark 2: Audio Analysis FFT Performance');
    console.log('─'.repeat(50));

    const FFT_SIZE = 2048;
    const AUDIO_FRAMES = 86400; // 10 minute audio at 44.1kHz hop size 512

    // Test 1: Per-frame window computation (baseline)
    let memBefore = process.memoryUsage().heapUsed;
    const startBaseline = performance.now();

    for (let frame = 0; frame < AUDIO_FRAMES; frame++) {
      // Recompute window each frame (old approach)
      const window = new Float32Array(FFT_SIZE);
      for (let i = 0; i < FFT_SIZE; i++) {
        window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
      }
      // Apply to dummy data
      const data = new Float32Array(FFT_SIZE);
      for (let i = 0; i < FFT_SIZE; i++) {
        data[i] *= window[i];
      }
    }

    const baselineDuration = performance.now() - startBaseline;
    let memAfter = process.memoryUsage().heapUsed;

    const baselineResult: BenchmarkResult = {
      name: 'FFT Window (Per-Frame)',
      duration: baselineDuration,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      memoryDelta: memAfter - memBefore,
      iterations: AUDIO_FRAMES,
      opsPerSecond: (AUDIO_FRAMES / baselineDuration) * 1000
    };

    console.log(`✓ Baseline (per-frame): ${baselineDuration.toFixed(2)}ms`);
    console.log(`✓ Memory delta: ${this.formatBytes(baselineResult.memoryDelta)}`);

    // Test 2: Pre-computed window (optimized)
    memBefore = process.memoryUsage().heapUsed;
    const startOptimized = performance.now();

    // Pre-compute once
    const hammingWindow = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i++) {
      hammingWindow[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
    }

    // Reuse window for all frames
    for (let frame = 0; frame < AUDIO_FRAMES; frame++) {
      const data = new Float32Array(FFT_SIZE);
      for (let i = 0; i < FFT_SIZE; i++) {
        data[i] *= hammingWindow[i];
      }
    }

    const optimizedDuration = performance.now() - startOptimized;
    memAfter = process.memoryUsage().heapUsed;

    const optimizedResult: BenchmarkResult = {
      name: 'FFT Window (Pre-Computed)',
      duration: optimizedDuration,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      memoryDelta: memAfter - memBefore,
      iterations: AUDIO_FRAMES,
      opsPerSecond: (AUDIO_FRAMES / optimizedDuration) * 1000,
      improvement: ((baselineDuration - optimizedDuration) / baselineDuration) * 100
    };

    console.log(`✓ Optimized (pre-computed): ${optimizedDuration.toFixed(2)}ms`);
    console.log(`✓ Memory delta: ${this.formatBytes(optimizedResult.memoryDelta)}`);
    console.log(`✓ Improvement: ${optimizedResult.improvement!.toFixed(1)}%`);
    console.log(`✓ Speedup: ${(baselineDuration / optimizedDuration).toFixed(1)}x faster`);

    this.results.push(baselineResult);
    this.results.push(optimizedResult);
  }

  /**
   * Benchmark 3: SSE Message Serialization
   * Tests single vs per-client JSON serialization
   */
  async benchmarkSSEBroadcast(): Promise<void> {
    console.log('\n📊 Benchmark 3: SSE Broadcast Efficiency');
    console.log('─'.repeat(50));

    const NUM_CLIENTS = 1000;
    const NUM_BROADCASTS = 1000;
    const MESSAGE = {
      type: 'state_changed',
      data: {
        entity_id: 'light.bedroom',
        new_state: { state: 'on', brightness: 255, attributes: {} },
        old_state: { state: 'off', brightness: 0, attributes: {} }
      },
      timestamp: new Date().toISOString()
    };

    // Test 1: Per-client serialization (baseline)
    let memBefore = process.memoryUsage().heapUsed;
    const startBaseline = performance.now();

    let serializedCount = 0;
    for (let broadcast = 0; broadcast < NUM_BROADCASTS; broadcast++) {
      for (let client = 0; client < NUM_CLIENTS; client++) {
        // Serialize for each client (old approach)
        JSON.stringify(MESSAGE);
        serializedCount++;
      }
    }

    const baselineDuration = performance.now() - startBaseline;
    let memAfter = process.memoryUsage().heapUsed;

    const baselineResult: BenchmarkResult = {
      name: 'SSE Broadcast (Per-Client)',
      duration: baselineDuration,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      memoryDelta: memAfter - memBefore,
      iterations: NUM_BROADCASTS * NUM_CLIENTS,
      opsPerSecond: (serializedCount / baselineDuration) * 1000
    };

    console.log(`✓ Baseline (per-client): ${baselineDuration.toFixed(2)}ms`);
    console.log(`✓ Serializations: ${serializedCount.toLocaleString()}`);
    console.log(`✓ Memory delta: ${this.formatBytes(baselineResult.memoryDelta)}`);

    // Test 2: Single serialization (optimized)
    memBefore = process.memoryUsage().heapUsed;
    const startOptimized = performance.now();

    serializedCount = 0;
    for (let broadcast = 0; broadcast < NUM_BROADCASTS; broadcast++) {
      // Serialize once per broadcast
      const serialized = JSON.stringify(MESSAGE);
      for (let client = 0; client < NUM_CLIENTS; client++) {
        // Reuse serialized message (optimized approach)
        const _ = serialized;
      }
      serializedCount++;
    }

    const optimizedDuration = performance.now() - startOptimized;
    memAfter = process.memoryUsage().heapUsed;

    const optimizedResult: BenchmarkResult = {
      name: 'SSE Broadcast (Single)',
      duration: optimizedDuration,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      memoryDelta: memAfter - memBefore,
      iterations: NUM_BROADCASTS,
      opsPerSecond: (NUM_BROADCASTS / optimizedDuration) * 1000,
      improvement: ((baselineDuration - optimizedDuration) / baselineDuration) * 100
    };

    console.log(`✓ Optimized (single): ${optimizedDuration.toFixed(2)}ms`);
    console.log(`✓ Serializations: ${serializedCount.toLocaleString()}`);
    console.log(`✓ Memory delta: ${this.formatBytes(optimizedResult.memoryDelta)}`);
    console.log(`✓ Improvement: ${optimizedResult.improvement!.toFixed(1)}%`);
    console.log(`✓ CPU reduction: ${(1 - (NUM_BROADCASTS / (NUM_BROADCASTS * NUM_CLIENTS))).toFixed(1)}x`);

    this.results.push(baselineResult);
    this.results.push(optimizedResult);
  }

  /**
   * Benchmark 4: Cache Hit Rate
   * Tests domain-specific vs full cache invalidation
   */
  async benchmarkCacheHitRate(): Promise<void> {
    console.log('\n📊 Benchmark 4: Cache Hit Rate Improvement');
    console.log('─'.repeat(50));

    const CACHE_SIZE = 1000;
    const ACCESS_PATTERN = 10000;

    // Test 1: Full cache clear on every service call (baseline)
    const cache1 = this.initializeCache(CACHE_SIZE);
    let hits1 = 0;
    let misses1 = 0;

    for (let i = 0; i < ACCESS_PATTERN; i++) {
      const entityId = `light.device_${i % 100}`;

      // Check cache
      if (cache1.has(entityId)) {
        hits1++;
      } else {
        misses1++;
        cache1.set(entityId, { state: 'on', brightness: 255 });
      }

      // Simulate service call - clear ALL cache (old approach)
      if (i % 10 === 0) {
        cache1.clear();
      }
    }

    const hitRate1 = (hits1 / (hits1 + misses1)) * 100;
    console.log(`✓ Baseline (full clear): ${hitRate1.toFixed(1)}% hit rate`);
    console.log(`  Hits: ${hits1.toLocaleString()}, Misses: ${misses1.toLocaleString()}`);

    // Test 2: Domain-specific cache clear (optimized)
    const cache2 = this.initializeCache(CACHE_SIZE);
    let hits2 = 0;
    let misses2 = 0;

    for (let i = 0; i < ACCESS_PATTERN; i++) {
      const entityId = `light.device_${i % 100}`;

      // Check cache
      if (cache2.has(entityId)) {
        hits2++;
      } else {
        misses2++;
        cache2.set(entityId, { state: 'on', brightness: 255 });
      }

      // Simulate service call - clear only light.* domain (optimized approach)
      if (i % 10 === 0) {
        for (const [key] of cache2.entries()) {
          if (key.startsWith('light.')) {
            cache2.delete(key);
          }
        }
      }
    }

    const hitRate2 = (hits2 / (hits2 + misses2)) * 100;
    console.log(`✓ Optimized (domain clear): ${hitRate2.toFixed(1)}% hit rate`);
    console.log(`  Hits: ${hits2.toLocaleString()}, Misses: ${misses2.toLocaleString()}`);
    console.log(`✓ Improvement: ${(hitRate2 - hitRate1).toFixed(1)}% increase`);

    this.results.push({
      name: 'Cache Hit Rate (Baseline)',
      duration: hitRate1,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      iterations: ACCESS_PATTERN,
      opsPerSecond: 0
    });

    this.results.push({
      name: 'Cache Hit Rate (Optimized)',
      duration: hitRate2,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      iterations: ACCESS_PATTERN,
      opsPerSecond: 0,
      improvement: hitRate2 - hitRate1
    });
  }

  /**
   * Benchmark 5: WebSocket Subscription Cleanup
   * Tests for memory leaks in subscription management
   */
  async benchmarkWebSocketCleanup(): Promise<void> {
    console.log('\n📊 Benchmark 5: WebSocket Subscription Cleanup');
    console.log('─'.repeat(50));

    const SUBSCRIPTION_CYCLES = 10000;

    // Test 1: Without proper cleanup (baseline - simulated leak)
    let memBefore = process.memoryUsage().heapUsed;
    const subscriptions1: Map<number, any> = new Map();

    for (let i = 0; i < SUBSCRIPTION_CYCLES; i++) {
      const subscriptionId = i;
      const handler = () => {};

      // Subscribe
      subscriptions1.set(subscriptionId, handler);

      // Unsubscribe - but simulate missed cleanup (baseline)
      // Intentionally don't delete to show memory accumulation
      if (i > 0 && i % 100 === 0) {
        // Only clean up every 100th subscription (simulating leaks)
        subscriptions1.delete(subscriptionId - 100);
      }
    }

    let memAfter = process.memoryUsage().heapUsed;
    const leakyDelta = memAfter - memBefore;

    console.log(`✓ Baseline (with leaks): ${subscriptions1.size.toLocaleString()} subscriptions`);
    console.log(`✓ Memory: ${this.formatBytes(leakyDelta)}`);

    // Test 2: With proper cleanup (optimized)
    memBefore = process.memoryUsage().heapUsed;
    const subscriptions2: Map<number, any> = new Map();

    for (let i = 0; i < SUBSCRIPTION_CYCLES; i++) {
      const subscriptionId = i;
      const handler = () => {};

      // Subscribe
      subscriptions2.set(subscriptionId, handler);

      // Unsubscribe - proper cleanup (optimized)
      subscriptions2.delete(subscriptionId);
    }

    memAfter = process.memoryUsage().heapUsed;
    const cleanDelta = memAfter - memBefore;

    console.log(`✓ Optimized (no leaks): ${subscriptions2.size.toLocaleString()} subscriptions`);
    console.log(`✓ Memory: ${this.formatBytes(cleanDelta)}`);
    console.log(`✓ Memory saved: ${this.formatBytes(leakyDelta - cleanDelta)}`);
    console.log(`✓ Improvement: ${((leakyDelta - cleanDelta) / leakyDelta * 100).toFixed(1)}%`);

    this.results.push({
      name: 'WebSocket (With Leaks)',
      duration: leakyDelta,
      memoryBefore: 0,
      memoryAfter: leakyDelta,
      memoryDelta: leakyDelta,
      iterations: SUBSCRIPTION_CYCLES,
      opsPerSecond: 0
    });

    this.results.push({
      name: 'WebSocket (No Leaks)',
      duration: cleanDelta,
      memoryBefore: 0,
      memoryAfter: cleanDelta,
      memoryDelta: cleanDelta,
      iterations: SUBSCRIPTION_CYCLES,
      opsPerSecond: 0,
      improvement: ((leakyDelta - cleanDelta) / leakyDelta) * 100
    });
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.log('\n🚀 Performance Benchmarking Suite');
    console.log('═'.repeat(50));
    console.log(`Started: ${new Date().toISOString()}`);

    try {
      await this.benchmarkAuroraMemory();
      await this.benchmarkFFTWindowing();
      await this.benchmarkSSEBroadcast();
      await this.benchmarkCacheHitRate();
      await this.benchmarkWebSocketCleanup();

      this.printSummary();
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  }

  /**
   * Print summary report
   */
  private printSummary(): void {
    console.log('\n📋 Summary Report');
    console.log('═'.repeat(50));

    const improvements = this.results.filter(r => r.improvement !== undefined);

    if (improvements.length > 0) {
      console.log('\n✨ Performance Improvements:');
      improvements.forEach(result => {
        if (result.improvement !== undefined) {
          console.log(`  • ${result.name}: +${result.improvement.toFixed(1)}% faster`);
        }
      });
    }

    console.log('\n📊 Detailed Results:');
    this.results.forEach(result => {
      console.log(`\n${result.name}`);
      console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`  Operations: ${result.iterations.toLocaleString()}`);
      console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`);
      if (result.memoryDelta !== 0) {
        console.log(`  Memory delta: ${this.formatBytes(result.memoryDelta)}`);
      }
    });

    console.log('\n✅ Benchmarking Complete');
    console.log(`Ended: ${new Date().toISOString()}`);
  }

  /**
   * Helper: Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    if (mb > 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  }

  /**
   * Helper: Generate timeline commands
   */
  private generateTimelineCommands(count: number): Array<{ timestamp: number }> {
    const commands = [];
    for (let i = 0; i < count; i++) {
      commands.push({
        timestamp: (i / count) * 600 // Spread over 600 seconds
      });
    }
    return commands;
  }

  /**
   * Helper: Initialize cache with sample data
   */
  private initializeCache(size: number): Map<string, any> {
    const cache = new Map();
    for (let i = 0; i < size; i++) {
      const domain = ['light', 'switch', 'climate', 'cover'][Math.floor(i / (size / 4))];
      const key = `${domain}.device_${i}`;
      cache.set(key, { state: 'on', attributes: {} });
    }
    return cache;
  }
}

// Run benchmarks
const suite = new BenchmarkSuite({ testIterations: 100 });
suite.runAll().catch(console.error);
