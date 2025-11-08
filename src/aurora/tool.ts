/**
 * Aurora MCP Tool
 * Provides MCP interface for Aurora animation and visualization system
 */

import { z } from 'zod';
import { auroraManager } from './manager.js';
import { formatInstructionsForAgent } from './instructions.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for Aurora animation configuration
 */
const AnimationConfigSchema = z.object({
    name: z.string().describe('Name of the animation'),
    duration: z.number().positive().describe('Duration of one animation cycle in milliseconds'),
    mode: z.enum(['once', 'repeat', 'endless']).describe('Animation mode - once, repeat, or endless'),
    repeatCount: z.number().positive().optional().describe('Number of times to repeat (required if mode is repeat)'),
    easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).optional().describe('Easing function for the animation'),
    autoStart: z.boolean().optional().describe('Whether the animation should auto-start')
});

/**
 * Schema for Aurora input configuration
 */
const InputConfigSchema = z.object({
    source: z.enum(['microphone', 'screen', 'camera', 'none']).describe('Input source type'),
    bufferMode: z.enum(['live', 'buffered']).describe('Buffer mode for processing'),
    bufferSize: z.number().positive().optional().describe('Buffer size in milliseconds (for buffered mode)'),
    sampleRate: z.number().positive().optional().describe('Sample rate for audio input'),
    frameRate: z.number().positive().optional().describe('Screen capture frame rate')
});

/**
 * Schema for creating Aurora session
 */
const CreateSessionSchema = z.object({
    sessionId: z.string().describe('Unique identifier for the session'),
    animation: AnimationConfigSchema.describe('Animation configuration'),
    input: InputConfigSchema.optional().describe('Input configuration (optional)'),
    visualParams: z.record(z.unknown()).optional().describe('Custom parameters for the visualization')
});

/**
 * Schema for session control operations
 */
const SessionControlSchema = z.object({
    sessionId: z.string().describe('Session identifier')
});

/**
 * Aurora tool definition for MCP
 */
export const auroraTools = [
    {
        name: 'aurora_get_instructions',
        description: 'Get Aurora usage instructions and guidelines. MUST be called at the beginning of any Aurora session to understand how to properly use Aurora and follow best practices.',
        parameters: z.object({}).describe('No parameters required'),
        execute: async () => {
            try {
                const instructions = auroraManager.getInstructions();
                const formatted = formatInstructionsForAgent();
                
                return {
                    success: true,
                    instructions,
                    formatted_instructions: formatted,
                    message: 'Aurora instructions retrieved. Please follow these guidelines when using Aurora.'
                };
            } catch (error) {
                logger.error('Error getting Aurora instructions:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    },
    {
        name: 'aurora_create_session',
        description: 'Create a new Aurora animation session with the specified configuration. Supports endless animations, repeated animations, and input from microphone/screen.',
        parameters: CreateSessionSchema,
        execute: async (args: z.infer<typeof CreateSessionSchema>) => {
            try {
                // Warn if instructions haven't been retrieved
                if (!auroraManager.hasProvidedInstructions()) {
                    logger.warn('Aurora session created without retrieving instructions first');
                }

                const result = auroraManager.createSession(args.sessionId, {
                    animation: args.animation,
                    input: args.input,
                    visualParams: args.visualParams
                });

                return result;
            } catch (error) {
                logger.error('Error creating Aurora session:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    },
    {
        name: 'aurora_start_session',
        description: 'Start an Aurora animation session that was created with autoStart=false',
        parameters: SessionControlSchema,
        execute: async (args: z.infer<typeof SessionControlSchema>) => {
            try {
                return auroraManager.startSession(args.sessionId);
            } catch (error) {
                logger.error('Error starting Aurora session:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    },
    {
        name: 'aurora_stop_session',
        description: 'Stop an Aurora animation session and free resources. Important for endless animations.',
        parameters: SessionControlSchema,
        execute: async (args: z.infer<typeof SessionControlSchema>) => {
            try {
                return auroraManager.stopSession(args.sessionId);
            } catch (error) {
                logger.error('Error stopping Aurora session:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    },
    {
        name: 'aurora_pause_session',
        description: 'Pause an Aurora animation session (maintains state for resuming)',
        parameters: SessionControlSchema,
        execute: async (args: z.infer<typeof SessionControlSchema>) => {
            try {
                return auroraManager.pauseSession(args.sessionId);
            } catch (error) {
                logger.error('Error pausing Aurora session:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    },
    {
        name: 'aurora_resume_session',
        description: 'Resume a paused Aurora animation session',
        parameters: SessionControlSchema,
        execute: async (args: z.infer<typeof SessionControlSchema>) => {
            try {
                return auroraManager.resumeSession(args.sessionId);
            } catch (error) {
                logger.error('Error resuming Aurora session:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    },
    {
        name: 'aurora_get_session_state',
        description: 'Get the current state of an Aurora animation session',
        parameters: SessionControlSchema,
        execute: async (args: z.infer<typeof SessionControlSchema>) => {
            try {
                const state = auroraManager.getSessionState(args.sessionId);
                if (!state) {
                    return {
                        success: false,
                        message: `Session ${args.sessionId} not found`
                    };
                }

                return {
                    success: true,
                    sessionId: args.sessionId,
                    state
                };
            } catch (error) {
                logger.error('Error getting Aurora session state:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    },
    {
        name: 'aurora_list_sessions',
        description: 'List all active Aurora animation sessions',
        parameters: z.object({}).describe('No parameters required'),
        execute: async () => {
            try {
                const sessions = auroraManager.listSessions();
                return {
                    success: true,
                    sessions,
                    count: sessions.length
                };
            } catch (error) {
                logger.error('Error listing Aurora sessions:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    },
    {
        name: 'aurora_stop_all_sessions',
        description: 'Stop all Aurora animation sessions. Useful for cleanup.',
        parameters: z.object({}).describe('No parameters required'),
        execute: async () => {
            try {
                return auroraManager.stopAllSessions();
            } catch (error) {
                logger.error('Error stopping all Aurora sessions:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    error: String(error)
                };
            }
        }
    }
];
