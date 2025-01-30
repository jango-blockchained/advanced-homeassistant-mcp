import { jest, describe, it, expect } from '@jest/globals';
import { formatToolCall } from '../src/helpers.js';

describe('helpers', () => {
    describe('formatToolCall', () => {
        it('should format an object into the correct structure', () => {
            const testObj = { name: 'test', value: 123 };
            const result = formatToolCall(testObj);

            expect(result).toEqual({
                content: [{
                    type: 'text',
                    text: JSON.stringify(testObj, null, 2),
                    isError: false
                }]
            });
        });

        it('should handle error cases correctly', () => {
            const testObj = { error: 'test error' };
            const result = formatToolCall(testObj, true);

            expect(result).toEqual({
                content: [{
                    type: 'text',
                    text: JSON.stringify(testObj, null, 2),
                    isError: true
                }]
            });
        });

        it('should handle empty objects', () => {
            const testObj = {};
            const result = formatToolCall(testObj);

            expect(result).toEqual({
                content: [{
                    type: 'text',
                    text: '{}',
                    isError: false
                }]
            });
        });
    });
}); 