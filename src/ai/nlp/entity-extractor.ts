import { AIContext } from '../types/index.js';

interface ExtractedEntities {
    primary_target: string;
    parameters: Record<string, any>;
    confidence: number;
}

export class EntityExtractor {
    private deviceNameMap: Map<string, string>;
    private parameterPatterns: Map<string, RegExp>;

    constructor() {
        this.deviceNameMap = new Map();
        this.parameterPatterns = new Map();
        this.initializePatterns();
    }

    private initializePatterns(): void {
        // Device name variations
        this.deviceNameMap.set('living room light', 'light.living_room');
        this.deviceNameMap.set('kitchen light', 'light.kitchen');
        this.deviceNameMap.set('bedroom light', 'light.bedroom');

        // Parameter patterns
        this.parameterPatterns.set('brightness', /(\d+)\s*(%|percent)|bright(ness)?\s+(\d+)/i);
        this.parameterPatterns.set('temperature', /(\d+)\s*(degrees?|°)[CF]?/i);
        this.parameterPatterns.set('color', /(red|green|blue|white|warm|cool)/i);
    }

    async extract(input: string): Promise<ExtractedEntities> {
        const entities: ExtractedEntities = {
            primary_target: '',
            parameters: {},
            confidence: 0
        };

        try {
            // Find device name
            for (const [key, value] of this.deviceNameMap) {
                if (input.toLowerCase().includes(key)) {
                    entities.primary_target = value;
                    break;
                }
            }

            // Extract parameters
            for (const [param, pattern] of this.parameterPatterns) {
                const match = input.match(pattern);
                if (match) {
                    entities.parameters[param] = this.normalizeParameterValue(param, match[1]);
                }
            }

            // Calculate confidence based on matches
            entities.confidence = this.calculateConfidence(entities, input);

            return entities;
        } catch (error) {
            console.error('Entity extraction error:', error);
            return {
                primary_target: '',
                parameters: {},
                confidence: 0
            };
        }
    }

    private normalizeParameterValue(parameter: string, value: string): number | string {
        switch (parameter) {
            case 'brightness':
                return Math.min(100, Math.max(0, parseInt(value)));
            case 'temperature':
                return parseInt(value);
            case 'color':
                return value.toLowerCase();
            default:
                return value;
        }
    }

    private calculateConfidence(entities: ExtractedEntities, input: string): number {
        let confidence = 0;

        // Device confidence
        if (entities.primary_target) {
            confidence += 0.5;
        }

        // Parameter confidence
        const paramCount = Object.keys(entities.parameters).length;
        confidence += paramCount * 0.25;

        // Normalize confidence to 0-1 range
        return Math.min(1, confidence);
    }

    async updateDeviceMap(devices: Record<string, string>): Promise<void> {
        for (const [key, value] of Object.entries(devices)) {
            this.deviceNameMap.set(key, value);
        }
    }
} 