import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

// Performance metrics types
export interface Metric {
    name: string;
    value: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
    responseTime: number;  // milliseconds
    memoryUsage: number;  // bytes
    cpuUsage: number;     // percentage
}

// Performance monitoring class
export class PerformanceMonitor extends EventEmitter {
    private metrics: Metric[] = [];
    private thresholds: PerformanceThresholds;
    private samplingInterval: number;
    private retentionPeriod: number;
    private intervalId?: NodeJS.Timeout;

    constructor(
        thresholds: Partial<PerformanceThresholds> = {},
        samplingInterval = 5000,  // 5 seconds
        retentionPeriod = 24 * 60 * 60 * 1000  // 24 hours
    ) {
        super();
        this.thresholds = {
            responseTime: thresholds.responseTime || 1000,  // 1 second
            memoryUsage: thresholds.memoryUsage || 1024 * 1024 * 1024,  // 1 GB
            cpuUsage: thresholds.cpuUsage || 80  // 80%
        };
        this.samplingInterval = samplingInterval;
        this.retentionPeriod = retentionPeriod;
    }

    // Start monitoring
    public start(): void {
        this.intervalId = setInterval(() => {
            this.collectMetrics();
            this.cleanOldMetrics();
        }, this.samplingInterval);
    }

    // Stop monitoring
    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    // Collect system metrics
    private collectMetrics(): void {
        const now = Date.now();
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // Memory metrics
        this.addMetric({
            name: 'memory.heapUsed',
            value: memoryUsage.heapUsed,
            timestamp: now
        });

        this.addMetric({
            name: 'memory.heapTotal',
            value: memoryUsage.heapTotal,
            timestamp: now
        });

        this.addMetric({
            name: 'memory.rss',
            value: memoryUsage.rss,
            timestamp: now
        });

        // CPU metrics
        this.addMetric({
            name: 'cpu.user',
            value: cpuUsage.user,
            timestamp: now
        });

        this.addMetric({
            name: 'cpu.system',
            value: cpuUsage.system,
            timestamp: now
        });

        // Check thresholds
        this.checkThresholds();
    }

    // Add a metric
    public addMetric(metric: Metric): void {
        this.metrics.push(metric);
        this.emit('metric', metric);
    }

    // Clean old metrics
    private cleanOldMetrics(): void {
        const cutoff = Date.now() - this.retentionPeriod;
        this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
    }

    // Check if metrics exceed thresholds
    private checkThresholds(): void {
        const memoryUsage = process.memoryUsage().heapUsed;
        if (memoryUsage > this.thresholds.memoryUsage) {
            this.emit('threshold_exceeded', {
                type: 'memory',
                value: memoryUsage,
                threshold: this.thresholds.memoryUsage
            });
        }

        const cpuUsage = process.cpuUsage();
        const totalCPU = cpuUsage.user + cpuUsage.system;
        const cpuPercentage = (totalCPU / (process.uptime() * 1000000)) * 100;
        if (cpuPercentage > this.thresholds.cpuUsage) {
            this.emit('threshold_exceeded', {
                type: 'cpu',
                value: cpuPercentage,
                threshold: this.thresholds.cpuUsage
            });
        }
    }

    // Get metrics for a specific time range
    public getMetrics(
        startTime: number,
        endTime: number = Date.now(),
        metricName?: string
    ): Metric[] {
        return this.metrics.filter(metric =>
            metric.timestamp >= startTime &&
            metric.timestamp <= endTime &&
            (!metricName || metric.name === metricName)
        );
    }

    // Calculate average for a metric
    public calculateAverage(
        metricName: string,
        startTime: number,
        endTime: number = Date.now()
    ): number {
        const metrics = this.getMetrics(startTime, endTime, metricName);
        if (metrics.length === 0) return 0;
        return metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
    }
}

// Performance optimization utilities
export class PerformanceOptimizer {
    private static readonly GC_THRESHOLD = 0.9; // 90% heap usage

    // Optimize memory usage
    public static async optimizeMemory(): Promise<void> {
        const memoryUsage = process.memoryUsage();
        const heapUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;

        if (heapUsageRatio > this.GC_THRESHOLD) {
            if (global.gc) {
                global.gc();
            }
        }
    }

    // Batch processing utility
    public static async processBatch<T, R>(
        items: T[],
        batchSize: number,
        processor: (batch: T[]) => Promise<R[]>
    ): Promise<R[]> {
        const results: R[] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await processor(batch);
            results.push(...batchResults);
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop
        }
        return results;
    }

    // Debounce utility
    public static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // Throttle utility
    public static throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle = false;
        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }
}

// Export performance monitoring instance
export const performanceMonitor = new PerformanceMonitor();

// Start monitoring on module load
performanceMonitor.start(); 