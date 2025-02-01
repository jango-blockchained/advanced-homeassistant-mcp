import { z } from 'zod';

// AI Model Types
export enum AIModel {
    CLAUDE = 'claude',
    GPT4 = 'gpt4',
    CUSTOM = 'custom'
}

// AI Confidence Level
export interface AIConfidence {
    overall: number;
    intent: number;
    entities: number;
    context: number;
}

// AI Intent
export interface AIIntent {
    action: string;
    target: string;
    parameters: Record<string, any>;
    raw_input: string;
}

// AI Context
export interface AIContext {
    user_id: string;
    session_id: string;
    timestamp: string;
    location: string;
    previous_actions: AIIntent[];
    environment_state: Record<string, any>;
}

// AI Response
export interface AIResponse {
    natural_language: string;
    structured_data: {
        success: boolean;
        action_taken: string;
        entities_affected: string[];
        state_changes: Record<string, any>;
    };
    next_suggestions: string[];
    confidence: AIConfidence;
    context: AIContext;
}

// AI Error
export interface AIError {
    code: string;
    message: string;
    suggestion: string;
    recovery_options: string[];
    context: AIContext;
}

// Rate Limiting
export interface AIRateLimit {
    requests_per_minute: number;
    requests_per_hour: number;
    concurrent_requests: number;
    model_specific_limits: Record<AIModel, {
        requests_per_minute: number;
        requests_per_hour: number;
    }>;
}

// Zod Schemas
export const AIConfidenceSchema = z.object({
    overall: z.number().min(0).max(1),
    intent: z.number().min(0).max(1),
    entities: z.number().min(0).max(1),
    context: z.number().min(0).max(1)
});

export const AIIntentSchema = z.object({
    action: z.string(),
    target: z.string(),
    parameters: z.record(z.any()),
    raw_input: z.string()
});

export const AIContextSchema = z.object({
    user_id: z.string(),
    session_id: z.string(),
    timestamp: z.string(),
    location: z.string(),
    previous_actions: z.array(AIIntentSchema),
    environment_state: z.record(z.any())
});

export const AIResponseSchema = z.object({
    natural_language: z.string(),
    structured_data: z.object({
        success: z.boolean(),
        action_taken: z.string(),
        entities_affected: z.array(z.string()),
        state_changes: z.record(z.any())
    }),
    next_suggestions: z.array(z.string()),
    confidence: AIConfidenceSchema,
    context: AIContextSchema
});

export const AIErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
    suggestion: z.string(),
    recovery_options: z.array(z.string()),
    context: AIContextSchema
});

export const AIRateLimitSchema = z.object({
    requests_per_minute: z.number(),
    requests_per_hour: z.number(),
    concurrent_requests: z.number(),
    model_specific_limits: z.record(z.object({
        requests_per_minute: z.number(),
        requests_per_hour: z.number()
    }))
}); 