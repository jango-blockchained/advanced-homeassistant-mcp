/**
 * Aurora Manager
 * Manages Aurora sessions and provides the main API for Aurora functionality
 */

import { AuroraEngine } from './engine.js';
import type { AuroraConfig, AuroraState } from './types.js';
import { getAuroraInstructions, validateConfig } from './instructions.js';
import { logger } from '../utils/logger.js';

/**
 * Aurora Manager
 * Singleton manager for Aurora animation sessions
 */
class AuroraManager {
    private sessions: Map<string, AuroraEngine> = new Map();
    private instructionsProvided: boolean = false;

    /**
     * Get Aurora instructions
     * Should be called at the beginning of any Aurora session
     */
    public getInstructions(): ReturnType<typeof getAuroraInstructions> {
        this.instructionsProvided = true;
        return getAuroraInstructions();
    }

    /**
     * Check if instructions have been provided
     */
    public hasProvidedInstructions(): boolean {
        return this.instructionsProvided;
    }

    /**
     * Create a new Aurora session
     */
    public createSession(sessionId: string, config: AuroraConfig): { success: boolean; message: string; sessionId?: string } {
        // Validate configuration
        const validation = validateConfig(config);
        if (!validation.valid) {
            logger.error('Invalid Aurora configuration:', validation.errors);
            return {
                success: false,
                message: `Invalid configuration: ${validation.errors.join(', ')}`
            };
        }

        // Check if session already exists
        if (this.sessions.has(sessionId)) {
            return {
                success: false,
                message: `Session ${sessionId} already exists`
            };
        }

        try {
            // Create new engine
            const engine = new AuroraEngine(config.animation, config.input);
            
            // Set up callbacks
            engine.onError((error) => {
                logger.error(`Aurora session ${sessionId} error:`, error);
            });

            engine.onComplete(() => {
                logger.info(`Aurora session ${sessionId} completed`);
                if (config.animation.mode !== 'endless') {
                    this.sessions.delete(sessionId);
                }
            });

            // Store session
            this.sessions.set(sessionId, engine);

            // Auto-start if configured
            if (config.animation.autoStart) {
                engine.start();
            }

            logger.info(`Created Aurora session: ${sessionId}`);
            return {
                success: true,
                message: `Aurora session ${sessionId} created successfully`,
                sessionId
            };
        } catch (error) {
            logger.error('Error creating Aurora session:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Start an Aurora session
     */
    public startSession(sessionId: string): { success: boolean; message: string } {
        const engine = this.sessions.get(sessionId);
        if (!engine) {
            return {
                success: false,
                message: `Session ${sessionId} not found`
            };
        }

        try {
            engine.start();
            return {
                success: true,
                message: `Aurora session ${sessionId} started`
            };
        } catch (error) {
            logger.error('Error starting Aurora session:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Stop an Aurora session
     */
    public stopSession(sessionId: string): { success: boolean; message: string } {
        const engine = this.sessions.get(sessionId);
        if (!engine) {
            return {
                success: false,
                message: `Session ${sessionId} not found`
            };
        }

        try {
            engine.stop();
            this.sessions.delete(sessionId);
            return {
                success: true,
                message: `Aurora session ${sessionId} stopped`
            };
        } catch (error) {
            logger.error('Error stopping Aurora session:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Pause an Aurora session
     */
    public pauseSession(sessionId: string): { success: boolean; message: string } {
        const engine = this.sessions.get(sessionId);
        if (!engine) {
            return {
                success: false,
                message: `Session ${sessionId} not found`
            };
        }

        try {
            engine.pause();
            return {
                success: true,
                message: `Aurora session ${sessionId} paused`
            };
        } catch (error) {
            logger.error('Error pausing Aurora session:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Resume an Aurora session
     */
    public resumeSession(sessionId: string): { success: boolean; message: string } {
        const engine = this.sessions.get(sessionId);
        if (!engine) {
            return {
                success: false,
                message: `Session ${sessionId} not found`
            };
        }

        try {
            engine.resume();
            return {
                success: true,
                message: `Aurora session ${sessionId} resumed`
            };
        } catch (error) {
            logger.error('Error resuming Aurora session:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get session state
     */
    public getSessionState(sessionId: string): AuroraState | null {
        const engine = this.sessions.get(sessionId);
        return engine ? engine.getState() : null;
    }

    /**
     * List all active sessions
     */
    public listSessions(): Array<{ sessionId: string; state: AuroraState }> {
        const sessions: Array<{ sessionId: string; state: AuroraState }> = [];
        
        for (const [sessionId, engine] of this.sessions.entries()) {
            sessions.push({
                sessionId,
                state: engine.getState()
            });
        }

        return sessions;
    }

    /**
     * Stop all sessions
     */
    public stopAllSessions(): { success: boolean; message: string; stoppedCount: number } {
        const count = this.sessions.size;
        
        for (const [sessionId, engine] of this.sessions.entries()) {
            try {
                engine.stop();
            } catch (error) {
                logger.error(`Error stopping session ${sessionId}:`, error);
            }
        }

        this.sessions.clear();

        return {
            success: true,
            message: `Stopped ${count} Aurora sessions`,
            stoppedCount: count
        };
    }

    /**
     * Get a session engine (for advanced usage)
     */
    public getSession(sessionId: string): AuroraEngine | undefined {
        return this.sessions.get(sessionId);
    }
}

// Export singleton instance
export const auroraManager = new AuroraManager();
