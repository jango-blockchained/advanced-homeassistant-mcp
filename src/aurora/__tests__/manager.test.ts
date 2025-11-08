/**
 * Aurora Manager Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { auroraManager } from '../manager.js';

describe('Aurora Manager', () => {
    beforeEach(() => {
        // Clean up any existing sessions
        auroraManager.stopAllSessions();
    });

    test('getInstructions returns instructions object', () => {
        const instructions = auroraManager.getInstructions();
        
        expect(instructions).toBeDefined();
        expect(instructions.usage).toBeArray();
        expect(instructions.bestPractices).toBeArray();
    });

    test('createSession with valid config succeeds', () => {
        const result = auroraManager.createSession('test-session', {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'once'
            }
        });
        
        expect(result.success).toBe(true);
        expect(result.sessionId).toBe('test-session');
    });

    test('createSession with invalid config fails', () => {
        const result = auroraManager.createSession('test-session', {
            animation: {
                name: 'test',
                duration: -1, // Invalid duration
                mode: 'once'
            }
        } as never);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid configuration');
    });

    test('createSession rejects duplicate session IDs', () => {
        auroraManager.createSession('duplicate', {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'once'
            }
        });
        
        const result = auroraManager.createSession('duplicate', {
            animation: {
                name: 'test2',
                duration: 2000,
                mode: 'once'
            }
        });
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('already exists');
    });

    test('startSession starts an existing session', () => {
        auroraManager.createSession('test-session', {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'once',
                autoStart: false
            }
        });
        
        const result = auroraManager.startSession('test-session');
        expect(result.success).toBe(true);
    });

    test('startSession fails for non-existent session', () => {
        const result = auroraManager.startSession('non-existent');
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
    });

    test('stopSession stops an existing session', () => {
        auroraManager.createSession('test-session', {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'endless',
                autoStart: true
            }
        });
        
        const result = auroraManager.stopSession('test-session');
        expect(result.success).toBe(true);
    });

    test('pauseSession pauses an active session', () => {
        auroraManager.createSession('test-session', {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'endless',
                autoStart: true
            }
        });
        
        const result = auroraManager.pauseSession('test-session');
        expect(result.success).toBe(true);
    });

    test('resumeSession resumes a paused session', () => {
        auroraManager.createSession('test-session', {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'endless',
                autoStart: true
            }
        });
        
        auroraManager.pauseSession('test-session');
        const result = auroraManager.resumeSession('test-session');
        expect(result.success).toBe(true);
    });

    test('getSessionState returns state for existing session', () => {
        auroraManager.createSession('test-session', {
            animation: {
                name: 'test',
                duration: 1000,
                mode: 'once'
            }
        });
        
        const state = auroraManager.getSessionState('test-session');
        expect(state).toBeDefined();
        expect(state?.currentFrame).toBeNumber();
        expect(state?.totalFrames).toBeNumber();
    });

    test('getSessionState returns null for non-existent session', () => {
        const state = auroraManager.getSessionState('non-existent');
        expect(state).toBeNull();
    });

    test('listSessions returns array of sessions', () => {
        auroraManager.createSession('session1', {
            animation: {
                name: 'test1',
                duration: 1000,
                mode: 'once'
            }
        });
        
        auroraManager.createSession('session2', {
            animation: {
                name: 'test2',
                duration: 2000,
                mode: 'repeat',
                repeatCount: 3
            }
        });
        
        const sessions = auroraManager.listSessions();
        expect(sessions).toBeArray();
        expect(sessions.length).toBe(2);
        expect(sessions[0].sessionId).toBeDefined();
        expect(sessions[0].state).toBeDefined();
    });

    test('stopAllSessions stops all active sessions', () => {
        auroraManager.createSession('session1', {
            animation: {
                name: 'test1',
                duration: 1000,
                mode: 'endless'
            }
        });
        
        auroraManager.createSession('session2', {
            animation: {
                name: 'test2',
                duration: 2000,
                mode: 'endless'
            }
        });
        
        const result = auroraManager.stopAllSessions();
        expect(result.success).toBe(true);
        expect(result.stoppedCount).toBe(2);
        
        const sessions = auroraManager.listSessions();
        expect(sessions.length).toBe(0);
    });

    test('hasProvidedInstructions tracks instruction calls', () => {
        expect(auroraManager.hasProvidedInstructions()).toBe(true); // Called in previous tests
        
        auroraManager.getInstructions();
        expect(auroraManager.hasProvidedInstructions()).toBe(true);
    });
});
