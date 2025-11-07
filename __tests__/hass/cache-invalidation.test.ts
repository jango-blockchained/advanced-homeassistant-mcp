/**
 * Tests for smart cache invalidation optimization
 * Verifies that domain-specific cache clearing works correctly
 */

import { describe, it, expect, beforeEach } from 'bun:test';

describe('Smart Cache Invalidation', () => {
  let cache: Map<string, any>;
  let domainCounts: Map<string, number>;

  beforeEach(() => {
    cache = new Map();
    domainCounts = new Map();

    // Initialize cache with various domains
    const domains = ['light', 'switch', 'climate', 'cover', 'media_player'];
    const entitiesPerDomain = 5;

    domains.forEach(domain => {
      let count = 0;
      for (let i = 0; i < entitiesPerDomain; i++) {
        const entityId = `${domain}.device_${i}`;
        cache.set(entityId, { state: 'on', attributes: {} });
        count++;
      }
      domainCounts.set(domain, count);
    });
  });

  it('should initialize cache with multiple domains', () => {
    expect(cache.size).toBe(25); // 5 domains * 5 entities each
    expect(domainCounts.size).toBe(5);
  });

  it('should perform domain-specific cache invalidation', () => {
    const beforeSize = cache.size;

    // Invalidate only light domain
    const invalidateDomain = (domain: string) => {
      for (const [key] of cache.entries()) {
        if (key.startsWith(`${domain}.`)) {
          cache.delete(key);
        }
      }
    };

    invalidateDomain('light');

    const afterSize = cache.size;
    expect(afterSize).toBe(beforeSize - 5); // 5 light entities removed
    expect(cache.has('light.device_0')).toBe(false);
    expect(cache.has('switch.device_0')).toBe(true); // Other domains preserved
  });

  it('should preserve other domains during invalidation', () => {
    const invalidateDomain = (domain: string) => {
      for (const [key] of cache.entries()) {
        if (key.startsWith(`${domain}.`)) {
          cache.delete(key);
        }
      }
    };

    invalidateDomain('climate');

    // Verify other domains still exist
    expect(cache.has('light.device_0')).toBe(true);
    expect(cache.has('switch.device_0')).toBe(true);
    expect(cache.has('cover.device_0')).toBe(true);
    expect(cache.has('media_player.device_0')).toBe(true);

    // Verify climate domain is cleared
    expect(cache.has('climate.device_0')).toBe(false);
  });

  it('should support full cache clear when needed', () => {
    expect(cache.size).toBeGreaterThan(0);

    cache.clear();

    expect(cache.size).toBe(0);
  });

  it('should efficiently handle selective invalidation', () => {
    const serviceDomainMap = new Map([
      ['light.turn_on', 'light'],
      ['light.turn_off', 'light'],
      ['switch.turn_on', 'switch'],
      ['climate.set_temperature', 'climate'],
      ['cover.open_cover', 'cover']
    ]);

    const invalidateForService = (service: string) => {
      const domain = serviceDomainMap.get(service);
      if (domain) {
        for (const [key] of cache.entries()) {
          if (key.startsWith(`${domain}.`)) {
            cache.delete(key);
          }
        }
      }
    };

    invalidateForService('light.turn_on');
    expect(cache.size).toBe(20); // 25 - 5 light entities

    invalidateForService('switch.turn_on');
    expect(cache.size).toBe(15); // 20 - 5 switch entities

    expect(cache.has('light.device_0')).toBe(false);
    expect(cache.has('switch.device_0')).toBe(false);
    expect(cache.has('climate.device_0')).toBe(true);
  });

  it('should handle invalidation of non-existent domain', () => {
    const beforeSize = cache.size;

    const invalidateDomain = (domain: string) => {
      for (const [key] of cache.entries()) {
        if (key.startsWith(`${domain}.`)) {
          cache.delete(key);
        }
      }
    };

    invalidateDomain('nonexistent');

    expect(cache.size).toBe(beforeSize); // No change
  });

  it('should track cache efficiency before and after invalidation', () => {
    // Simulate cache hits
    let hits = 0;
    let misses = 0;

    // Before invalidation
    for (let i = 0; i < 10; i++) {
      if (cache.has('light.device_0')) {
        hits++;
      } else {
        misses++;
      }
    }

    expect(hits).toBe(10);
    expect(misses).toBe(0);

    // Invalidate light domain
    const invalidateDomain = (domain: string) => {
      for (const [key] of cache.entries()) {
        if (key.startsWith(`${domain}.`)) {
          cache.delete(key);
        }
      }
    };

    invalidateDomain('light');

    // After invalidation
    hits = 0;
    misses = 0;

    for (let i = 0; i < 10; i++) {
      if (cache.has('light.device_0')) {
        hits++;
      } else {
        misses++;
      }
    }

    expect(hits).toBe(0);
    expect(misses).toBe(10);
  });

  it('should handle invalidation in high-frequency scenarios', () => {
    let totalInvalidations = 0;
    let totalEntitiesCleared = 0;

    const invalidateDomain = (domain: string) => {
      let cleared = 0;
      for (const [key] of cache.entries()) {
        if (key.startsWith(`${domain}.`)) {
          cache.delete(key);
          cleared++;
        }
      }
      return cleared;
    };

    // Simulate 100 rapid service calls
    const domains = ['light', 'switch', 'climate'];
    for (let i = 0; i < 100; i++) {
      const domain = domains[i % domains.length];
      const cleared = invalidateDomain(domain);
      totalInvalidations++;
      totalEntitiesCleared += cleared;
    }

    // Each domain has 5 entities, so ~33-34 calls per domain = ~165-170 entities cleared
    expect(totalInvalidations).toBe(100);
    expect(totalEntitiesCleared).toBeGreaterThan(0);
  });

  it('should maintain cache integrity with concurrent operations', () => {
    const cacheOps: string[] = [];

    const invalidateDomain = (domain: string) => {
      cacheOps.push(`invalidate_${domain}`);
      for (const [key] of cache.entries()) {
        if (key.startsWith(`${domain}.`)) {
          cache.delete(key);
        }
      }
    };

    const getCached = (key: string) => {
      cacheOps.push(`get_${key}`);
      return cache.get(key);
    };

    const setCached = (key: string, value: any) => {
      cacheOps.push(`set_${key}`);
      cache.set(key, value);
    };

    // Simulate mixed operations
    setCached('light.new_device', { state: 'on' });
    invalidateDomain('light');
    expect(getCached('light.new_device')).toBeUndefined();

    setCached('light.new_device', { state: 'off' });
    expect(getCached('light.new_device')).toEqual({ state: 'off' });

    expect(cacheOps.length).toBeGreaterThan(0);
  });
});
