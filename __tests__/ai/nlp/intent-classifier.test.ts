import { IntentClassifier } from '../../../src/ai/nlp/intent-classifier.js';

describe('IntentClassifier', () => {
    let classifier: IntentClassifier;

    beforeEach(() => {
        classifier = new IntentClassifier();
    });

    describe('Basic Intent Classification', () => {
        it('should classify turn_on commands', async () => {
            const testCases = [
                {
                    input: 'turn on the living room light',
                    entities: { parameters: {}, primary_target: 'light.living_room' },
                    expectedAction: 'turn_on'
                },
                {
                    input: 'switch on the kitchen lights',
                    entities: { parameters: {}, primary_target: 'light.kitchen' },
                    expectedAction: 'turn_on'
                },
                {
                    input: 'enable the bedroom lamp',
                    entities: { parameters: {}, primary_target: 'light.bedroom' },
                    expectedAction: 'turn_on'
                }
            ];

            for (const test of testCases) {
                const result = await classifier.classify(test.input, test.entities);
                expect(result.action).toBe(test.expectedAction);
                expect(result.target).toBe(test.entities.primary_target);
                expect(result.confidence).toBeGreaterThan(0.5);
            }
        });

        it('should classify turn_off commands', async () => {
            const testCases = [
                {
                    input: 'turn off the living room light',
                    entities: { parameters: {}, primary_target: 'light.living_room' },
                    expectedAction: 'turn_off'
                },
                {
                    input: 'switch off the kitchen lights',
                    entities: { parameters: {}, primary_target: 'light.kitchen' },
                    expectedAction: 'turn_off'
                },
                {
                    input: 'disable the bedroom lamp',
                    entities: { parameters: {}, primary_target: 'light.bedroom' },
                    expectedAction: 'turn_off'
                }
            ];

            for (const test of testCases) {
                const result = await classifier.classify(test.input, test.entities);
                expect(result.action).toBe(test.expectedAction);
                expect(result.target).toBe(test.entities.primary_target);
                expect(result.confidence).toBeGreaterThan(0.5);
            }
        });

        it('should classify set commands with parameters', async () => {
            const testCases = [
                {
                    input: 'set the living room light brightness to 50',
                    entities: {
                        parameters: { brightness: 50 },
                        primary_target: 'light.living_room'
                    },
                    expectedAction: 'set'
                },
                {
                    input: 'change the temperature to 72',
                    entities: {
                        parameters: { temperature: 72 },
                        primary_target: 'climate.living_room'
                    },
                    expectedAction: 'set'
                },
                {
                    input: 'adjust the kitchen light color to red',
                    entities: {
                        parameters: { color: 'red' },
                        primary_target: 'light.kitchen'
                    },
                    expectedAction: 'set'
                }
            ];

            for (const test of testCases) {
                const result = await classifier.classify(test.input, test.entities);
                expect(result.action).toBe(test.expectedAction);
                expect(result.target).toBe(test.entities.primary_target);
                expect(result.parameters).toEqual(test.entities.parameters);
                expect(result.confidence).toBeGreaterThan(0.5);
            }
        });

        it('should classify query commands', async () => {
            const testCases = [
                {
                    input: 'what is the living room temperature',
                    entities: { parameters: {}, primary_target: 'sensor.living_room_temperature' },
                    expectedAction: 'query'
                },
                {
                    input: 'get the kitchen light status',
                    entities: { parameters: {}, primary_target: 'light.kitchen' },
                    expectedAction: 'query'
                },
                {
                    input: 'show me the front door camera',
                    entities: { parameters: {}, primary_target: 'camera.front_door' },
                    expectedAction: 'query'
                }
            ];

            for (const test of testCases) {
                const result = await classifier.classify(test.input, test.entities);
                expect(result.action).toBe(test.expectedAction);
                expect(result.target).toBe(test.entities.primary_target);
                expect(result.confidence).toBeGreaterThan(0.5);
            }
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty input gracefully', async () => {
            const result = await classifier.classify('', { parameters: {}, primary_target: '' });
            expect(result.action).toBe('unknown');
            expect(result.confidence).toBeLessThan(0.5);
        });

        it('should handle unknown commands with low confidence', async () => {
            const result = await classifier.classify(
                'do something random',
                { parameters: {}, primary_target: 'light.living_room' }
            );
            expect(result.action).toBe('unknown');
            expect(result.confidence).toBeLessThan(0.5);
        });

        it('should handle missing entities gracefully', async () => {
            const result = await classifier.classify(
                'turn on the lights',
                { parameters: {}, primary_target: '' }
            );
            expect(result.action).toBe('turn_on');
            expect(result.target).toBe('');
        });
    });

    describe('Confidence Calculation', () => {
        it('should assign higher confidence to exact matches', async () => {
            const exactMatch = await classifier.classify(
                'turn on',
                { parameters: {}, primary_target: 'light.living_room' }
            );
            const partialMatch = await classifier.classify(
                'please turn on the lights if possible',
                { parameters: {}, primary_target: 'light.living_room' }
            );
            expect(exactMatch.confidence).toBeGreaterThan(partialMatch.confidence);
        });

        it('should boost confidence for polite phrases', async () => {
            const politeRequest = await classifier.classify(
                'please turn on the lights',
                { parameters: {}, primary_target: 'light.living_room' }
            );
            const basicRequest = await classifier.classify(
                'turn on the lights',
                { parameters: {}, primary_target: 'light.living_room' }
            );
            expect(politeRequest.confidence).toBeGreaterThan(basicRequest.confidence);
        });
    });

    describe('Context Inference', () => {
        it('should infer set action when parameters are present', async () => {
            const result = await classifier.classify(
                'lights at 50%',
                {
                    parameters: { brightness: 50 },
                    primary_target: 'light.living_room'
                }
            );
            expect(result.action).toBe('set');
            expect(result.parameters).toHaveProperty('brightness', 50);
        });

        it('should infer query action for question-like inputs', async () => {
            const result = await classifier.classify(
                'how warm is it',
                { parameters: {}, primary_target: 'sensor.temperature' }
            );
            expect(result.action).toBe('query');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
    });
}); 