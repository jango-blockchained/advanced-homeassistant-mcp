interface ClassifiedIntent {
    action: string;
    target: string;
    confidence: number;
    parameters: Record<string, any>;
    raw_input: string;
}

interface ActionPattern {
    action: string;
    patterns: RegExp[];
    parameters?: string[];
}

export class IntentClassifier {
    private actionPatterns: ActionPattern[];

    constructor() {
        this.actionPatterns = [
            {
                action: 'turn_on',
                patterns: [
                    /turn\s+on/i,
                    /switch\s+on/i,
                    /enable/i,
                    /activate/i
                ]
            },
            {
                action: 'turn_off',
                patterns: [
                    /turn\s+off/i,
                    /switch\s+off/i,
                    /disable/i,
                    /deactivate/i
                ]
            },
            {
                action: 'set',
                patterns: [
                    /set\s+(?:the\s+)?(.+)\s+to/i,
                    /change\s+(?:the\s+)?(.+)\s+to/i,
                    /adjust\s+(?:the\s+)?(.+)\s+to/i
                ],
                parameters: ['brightness', 'temperature', 'color']
            },
            {
                action: 'query',
                patterns: [
                    /what\s+is/i,
                    /get\s+(?:the\s+)?(.+)/i,
                    /show\s+(?:the\s+)?(.+)/i,
                    /tell\s+me/i
                ]
            }
        ];
    }

    async classify(
        input: string,
        extractedEntities: { parameters: Record<string, any>; primary_target: string }
    ): Promise<ClassifiedIntent> {
        let bestMatch: ClassifiedIntent = {
            action: '',
            target: '',
            confidence: 0,
            parameters: {},
            raw_input: input
        };

        for (const actionPattern of this.actionPatterns) {
            for (const pattern of actionPattern.patterns) {
                const match = input.match(pattern);
                if (match) {
                    const confidence = this.calculateConfidence(match[0], input);
                    if (confidence > bestMatch.confidence) {
                        bestMatch = {
                            action: actionPattern.action,
                            target: extractedEntities.primary_target,
                            confidence,
                            parameters: this.extractActionParameters(actionPattern, match, extractedEntities),
                            raw_input: input
                        };
                    }
                }
            }
        }

        // If no match found, try to infer from context
        if (!bestMatch.action) {
            bestMatch = this.inferFromContext(input, extractedEntities);
        }

        return bestMatch;
    }

    private calculateConfidence(match: string, input: string): number {
        // Base confidence from match length relative to input length
        const lengthRatio = match.length / input.length;
        let confidence = lengthRatio * 0.7;

        // Boost confidence for exact matches
        if (match.toLowerCase() === input.toLowerCase()) {
            confidence += 0.3;
        }

        // Additional confidence for specific keywords
        const keywords = ['please', 'can you', 'would you'];
        for (const keyword of keywords) {
            if (input.toLowerCase().includes(keyword)) {
                confidence += 0.1;
            }
        }

        return Math.min(1, confidence);
    }

    private extractActionParameters(
        actionPattern: ActionPattern,
        match: RegExpMatchArray,
        extractedEntities: { parameters: Record<string, any>; primary_target: string }
    ): Record<string, any> {
        const parameters: Record<string, any> = {};

        // Copy relevant extracted entities
        if (actionPattern.parameters) {
            for (const param of actionPattern.parameters) {
                if (extractedEntities.parameters[param] !== undefined) {
                    parameters[param] = extractedEntities.parameters[param];
                }
            }
        }

        // Extract additional parameters from match groups
        if (match.length > 1 && match[1]) {
            parameters.raw_parameter = match[1].trim();
        }

        return parameters;
    }

    private inferFromContext(
        input: string,
        extractedEntities: { parameters: Record<string, any>; primary_target: string }
    ): ClassifiedIntent {
        // Default to 'set' action if parameters are present
        if (Object.keys(extractedEntities.parameters).length > 0) {
            return {
                action: 'set',
                target: extractedEntities.primary_target,
                confidence: 0.5,
                parameters: extractedEntities.parameters,
                raw_input: input
            };
        }

        // Default to 'query' for question-like inputs
        if (input.match(/^(what|when|where|who|how|why)/i)) {
            return {
                action: 'query',
                target: extractedEntities.primary_target || 'system',
                confidence: 0.6,
                parameters: {},
                raw_input: input
            };
        }

        // Fallback with low confidence
        return {
            action: 'unknown',
            target: extractedEntities.primary_target || 'system',
            confidence: 0.3,
            parameters: {},
            raw_input: input
        };
    }
} 