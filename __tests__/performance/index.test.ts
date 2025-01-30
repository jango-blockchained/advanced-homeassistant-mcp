import { PerformanceMonitor, PerformanceOptimizer, Metric } from '../../src/performance/index.js';
import type { MemoryUsage } from 'node:process';

describe('Performance Module', () => {
    describe('PerformanceMonitor', () => {
        let monitor: PerformanceMonitor;

        beforeEach(() => {
            monitor = new PerformanceMonitor({
                responseTime: 500,
                memoryUsage: 1024 * 1024 * 512, // 512MB
                cpuUsage: 70
            });
        });

        afterEach(() => {
            monitor.stop();
        });

        it('should collect metrics', () => {
            const metricHandler = jest.fn();
            monitor.on('metric', metricHandler);

            monitor.start();

            // Wait for first collection
            return new Promise(resolve => setTimeout(() => {
                expect(metricHandler).toHaveBeenCalled();
                const calls = metricHandler.mock.calls;

                // Verify memory metrics
                expect(calls.some(([metric]: [Metric]) =>
                    metric.name === 'memory.heapUsed'
                )).toBe(true);
                expect(calls.some(([metric]: [Metric]) =>
                    metric.name === 'memory.heapTotal'
                )).toBe(true);
                expect(calls.some(([metric]: [Metric]) =>
                    metric.name === 'memory.rss'
                )).toBe(true);

                // Verify CPU metrics
                expect(calls.some(([metric]: [Metric]) =>
                    metric.name === 'cpu.user'
                )).toBe(true);
                expect(calls.some(([metric]: [Metric]) =>
                    metric.name === 'cpu.system'
                )).toBe(true);

                resolve(true);
            }, 100));
        });

        it('should emit threshold exceeded events', () => {
            const thresholdHandler = jest.fn();
            monitor = new PerformanceMonitor({
                memoryUsage: 1, // Ensure threshold is exceeded
                cpuUsage: 1
            });
            monitor.on('threshold_exceeded', thresholdHandler);

            monitor.start();

            return new Promise(resolve => setTimeout(() => {
                expect(thresholdHandler).toHaveBeenCalled();
                resolve(true);
            }, 100));
        });

        it('should clean old metrics', () => {
            const now = Date.now();
            const oldMetric: Metric = {
                name: 'test',
                value: 1,
                timestamp: now - 25 * 60 * 60 * 1000 // 25 hours old
            };
            const newMetric: Metric = {
                name: 'test',
                value: 2,
                timestamp: now - 1000 // 1 second old
            };

            monitor.addMetric(oldMetric);
            monitor.addMetric(newMetric);

            const metrics = monitor.getMetrics(now - 24 * 60 * 60 * 1000);
            expect(metrics).toHaveLength(1);
            expect(metrics[0]).toEqual(newMetric);
        });

        it('should calculate metric averages', () => {
            const now = Date.now();
            const metrics: Metric[] = [
                { name: 'test', value: 1, timestamp: now - 3000 },
                { name: 'test', value: 2, timestamp: now - 2000 },
                { name: 'test', value: 3, timestamp: now - 1000 }
            ];

            metrics.forEach(metric => monitor.addMetric(metric));

            const average = monitor.calculateAverage(
                'test',
                now - 5000,
                now
            );
            expect(average).toBe(2);
        });
    });

    describe('PerformanceOptimizer', () => {
        it('should process batches correctly', async () => {
            const items = [1, 2, 3, 4, 5];
            const batchSize = 2;
            const processor = jest.fn(async (batch: number[]) =>
                batch.map(n => n * 2)
            );

            const results = await PerformanceOptimizer.processBatch(
                items,
                batchSize,
                processor
            );

            expect(results).toEqual([2, 4, 6, 8, 10]);
            expect(processor).toHaveBeenCalledTimes(3); // 2 + 2 + 1 items
        });

        it('should debounce function calls', (done) => {
            const fn = jest.fn();
            const debounced = PerformanceOptimizer.debounce(fn, 100);

            debounced();
            debounced();
            debounced();

            setTimeout(() => {
                expect(fn).not.toHaveBeenCalled();
            }, 50);

            setTimeout(() => {
                expect(fn).toHaveBeenCalledTimes(1);
                done();
            }, 150);
        });

        it('should throttle function calls', (done) => {
            const fn = jest.fn();
            const throttled = PerformanceOptimizer.throttle(fn, 100);

            throttled();
            throttled();
            throttled();

            expect(fn).toHaveBeenCalledTimes(1);

            setTimeout(() => {
                throttled();
                expect(fn).toHaveBeenCalledTimes(2);
                done();
            }, 150);
        });

        it('should optimize memory when threshold is exceeded', async () => {
            const originalGc = global.gc;
            global.gc = jest.fn();

            const memoryUsage = process.memoryUsage;
            process.memoryUsage = jest.fn().mockImplementation((): MemoryUsage => ({
                heapUsed: 900,
                heapTotal: 1000,
                rss: 2000,
                external: 0,
                arrayBuffers: 0
            }));

            await PerformanceOptimizer.optimizeMemory();

            expect(global.gc).toHaveBeenCalled();

            // Cleanup
            process.memoryUsage = memoryUsage;
            if (originalGc) {
                global.gc = originalGc;
            } else {
                delete global.gc;
            }
        });
    });
}); 