import { AIContext, AIIntent } from '../types/index.js';

interface ContextAnalysis {
    confidence: number;
    relevant_params: Record<string, any>;
}

interface ContextRule {
    condition: (context: AIContext, intent: AIIntent) => boolean;
    relevance: number;
    params?: (context: AIContext) => Record<string, any>;
}

export class ContextAnalyzer {
    private contextRules: ContextRule[];

    constructor() {
        this.contextRules = [
            // Location-based context
            {
                condition: (context, intent) =>
                    Boolean(context.location && intent.target.includes(context.location.toLowerCase())),
                relevance: 0.8,
                params: (context) => ({ location: context.location })
            },

            // Time-based context
            {
                condition: (context) => {
                    const hour = new Date(context.timestamp).getHours();
                    return hour >= 0 && hour <= 23;
                },
                relevance: 0.6,
                params: (context) => ({
                    time_of_day: this.getTimeOfDay(new Date(context.timestamp))
                })
            },

            // Previous action context
            {
                condition: (context, intent) => {
                    const recentActions = context.previous_actions.slice(-3);
                    return recentActions.some(action =>
                        action.target === intent.target ||
                        action.action === intent.action
                    );
                },
                relevance: 0.7,
                params: (context) => ({
                    recent_action: context.previous_actions[context.previous_actions.length - 1]
                })
            },

            // Environment state context
            {
                condition: (context, intent) => {
                    return Object.keys(context.environment_state).some(key =>
                        intent.target.includes(key) ||
                        intent.parameters[key] !== undefined
                    );
                },
                relevance: 0.9,
                params: (context) => ({ environment: context.environment_state })
            }
        ];
    }

    async analyze(intent: AIIntent, context: AIContext): Promise<ContextAnalysis> {
        let totalConfidence = 0;
        let relevantParams: Record<string, any> = {};
        let applicableRules = 0;

        for (const rule of this.contextRules) {
            if (rule.condition(context, intent)) {
                totalConfidence += rule.relevance;
                applicableRules++;

                if (rule.params) {
                    relevantParams = {
                        ...relevantParams,
                        ...rule.params(context)
                    };
                }
            }
        }

        // Calculate normalized confidence
        const confidence = applicableRules > 0
            ? totalConfidence / applicableRules
            : 0.5; // Default confidence if no rules apply

        return {
            confidence,
            relevant_params: relevantParams
        };
    }

    private getTimeOfDay(date: Date): string {
        const hour = date.getHours();

        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 22) return 'evening';
        return 'night';
    }

    async updateContextRules(newRules: ContextRule[]): Promise<void> {
        this.contextRules = [...this.contextRules, ...newRules];
    }

    async validateContext(context: AIContext): Promise<boolean> {
        // Validate required context fields
        if (!context.timestamp || !context.user_id || !context.session_id) {
            return false;
        }

        // Validate timestamp format
        const timestamp = new Date(context.timestamp);
        if (isNaN(timestamp.getTime())) {
            return false;
        }

        // Validate previous actions array
        if (!Array.isArray(context.previous_actions)) {
            return false;
        }

        // Validate environment state
        if (typeof context.environment_state !== 'object' || context.environment_state === null) {
            return false;
        }

        return true;
    }
} 