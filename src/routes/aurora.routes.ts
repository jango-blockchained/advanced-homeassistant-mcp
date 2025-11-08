/**
 * Aurora API Routes
 * REST API endpoints for Aurora animation system
 */

import { Router } from 'express';
import { auroraManager } from '../aurora/manager.js';
import { formatInstructionsForAgent, getAuroraInstructions } from '../aurora/instructions.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/aurora
 * Get Aurora system information
 */
router.get('/', (req, res) => {
    res.json({
        name: 'Aurora Animation System',
        version: '1.0.0',
        description: 'Animation and visualization system with endless repeat support and input processing',
        endpoints: [
            'POST /api/aurora/instructions - Get usage instructions',
            'POST /api/aurora/create - Create animation session',
            'POST /api/aurora/start - Start session',
            'POST /api/aurora/stop - Stop session',
            'POST /api/aurora/pause - Pause session',
            'POST /api/aurora/resume - Resume session',
            'POST /api/aurora/state - Get session state',
            'POST /api/aurora/list - List sessions',
            'POST /api/aurora/stopAll - Stop all sessions'
        ]
    });
});

/**
 * POST /api/aurora/instructions
 * Get Aurora usage instructions
 */
router.post('/instructions', (req, res) => {
    try {
        const instructions = getAuroraInstructions();
        const formatted = formatInstructionsForAgent();
        
        res.json({
            success: true,
            instructions,
            formatted_instructions: formatted
        });
    } catch (error) {
        logger.error('Error getting instructions:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/aurora/create
 * Create a new Aurora session
 */
router.post('/create', (req, res) => {
    try {
        const { sessionId, animation, input, visualParams } = req.body;
        
        if (!sessionId || !animation) {
            return res.status(400).json({
                success: false,
                message: 'sessionId and animation configuration are required'
            });
        }
        
        const result = auroraManager.createSession(sessionId, {
            animation,
            input,
            visualParams
        });
        
        res.json(result);
    } catch (error) {
        logger.error('Error creating session:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/aurora/start
 * Start an Aurora session
 */
router.post('/start', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId is required'
            });
        }
        
        const result = auroraManager.startSession(sessionId);
        res.json(result);
    } catch (error) {
        logger.error('Error starting session:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/aurora/stop
 * Stop an Aurora session
 */
router.post('/stop', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId is required'
            });
        }
        
        const result = auroraManager.stopSession(sessionId);
        res.json(result);
    } catch (error) {
        logger.error('Error stopping session:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/aurora/pause
 * Pause an Aurora session
 */
router.post('/pause', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId is required'
            });
        }
        
        const result = auroraManager.pauseSession(sessionId);
        res.json(result);
    } catch (error) {
        logger.error('Error pausing session:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/aurora/resume
 * Resume an Aurora session
 */
router.post('/resume', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId is required'
            });
        }
        
        const result = auroraManager.resumeSession(sessionId);
        res.json(result);
    } catch (error) {
        logger.error('Error resuming session:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/aurora/state
 * Get Aurora session state
 */
router.post('/state', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'sessionId is required'
            });
        }
        
        const state = auroraManager.getSessionState(sessionId);
        
        if (!state) {
            return res.status(404).json({
                success: false,
                message: `Session ${sessionId} not found`
            });
        }
        
        res.json({
            success: true,
            sessionId,
            state
        });
    } catch (error) {
        logger.error('Error getting session state:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/aurora/list
 * List all Aurora sessions
 */
router.post('/list', (req, res) => {
    try {
        const sessions = auroraManager.listSessions();
        res.json({
            success: true,
            sessions,
            count: sessions.length
        });
    } catch (error) {
        logger.error('Error listing sessions:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/aurora/stopAll
 * Stop all Aurora sessions
 */
router.post('/stopAll', (req, res) => {
    try {
        const result = auroraManager.stopAllSessions();
        res.json(result);
    } catch (error) {
        logger.error('Error stopping all sessions:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
