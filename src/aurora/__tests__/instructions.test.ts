/**
 * Aurora Instructions Tests
 */

import { describe, test, expect } from 'bun:test';
import { getAuroraInstructions, formatInstructionsForAgent, validateConfig } from '../instructions.js';

describe('Aurora Instructions', () => {
    test('getAuroraInstructions returns complete instructions', () => {
        const instructions = getAuroraInstructions();
        
        expect(instructions).toBeDefined();
        expect(instructions.usage).toBeArray();
        expect(instructions.usage.length).toBeGreaterThan(0);
        expect(instructions.bestPractices).toBeArray();
        expect(instructions.bestPractices.length).toBeGreaterThan(0);
        expect(instructions.examples).toBeArray();
        expect(instructions.examples.length).toBeGreaterThan(0);
        expect(instructions.limitations).toBeArray();
        expect(instructions.limitations.length).toBeGreaterThan(0);
        expect(instructions.safety).toBeArray();
        expect(instructions.safety.length).toBeGreaterThan(0);
    });

    test('formatInstructionsForAgent returns formatted string', () => {
        const formatted = formatInstructionsForAgent();
        
        expect(formatted).toBeString();
        expect(formatted).toContain('Aurora System Instructions');
        expect(formatted).toContain('Usage');
        expect(formatted).toContain('Best Practices');
        expect(formatted).toContain('Examples');
        expect(formatted).toContain('Limitations');
        expect(formatted).toContain('Safety Guidelines');
    });

    test('validateConfig accepts valid configuration', () => {
        const config = {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'endless'
            }
        };
        
        const result = validateConfig(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeArray();
        expect(result.errors.length).toBe(0);
    });

    test('validateConfig rejects invalid animation mode', () => {
        const config = {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'invalid'
            }
        };
        
        const result = validateConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('validateConfig requires repeatCount for repeat mode', () => {
        const config = {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'repeat'
            }
        };
        
        const result = validateConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('repeatCount'))).toBe(true);
    });

    test('validateConfig accepts valid input configuration', () => {
        const config = {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'endless'
            },
            input: {
                source: 'microphone',
                bufferMode: 'live'
            }
        };
        
        const result = validateConfig(config);
        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
    });

    test('validateConfig rejects invalid input source', () => {
        const config = {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'endless'
            },
            input: {
                source: 'invalid',
                bufferMode: 'live'
            }
        };
        
        const result = validateConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Input source'))).toBe(true);
    });
});
