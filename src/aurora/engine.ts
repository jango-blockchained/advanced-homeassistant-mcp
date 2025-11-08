/**
 * Aurora Animation Engine
 * Core animation system with support for endless repeat and various animation modes
 */

import type { 
    AnimationConfig, 
    AuroraState, 
    FrameData,
    InputConfig 
} from './types.js';
import { logger } from '../utils/logger.js';

/**
 * Aurora Animation Engine
 * Manages animation lifecycle, frame generation, and input processing
 */
export class AuroraEngine {
    private config: AnimationConfig;
    private inputConfig?: InputConfig;
    private state: AuroraState;
    private animationFrameId?: number;
    private startTime: number = 0;
    private callbacks: {
        onFrame?: (frame: FrameData) => void;
        onComplete?: () => void;
        onError?: (error: Error) => void;
    } = {};

    constructor(config: AnimationConfig, inputConfig?: InputConfig) {
        this.config = config;
        this.inputConfig = inputConfig;
        this.state = {
            active: false,
            currentFrame: 0,
            totalFrames: 0,
            currentIteration: 0,
            inputActive: false,
            lastUpdate: 0
        };
    }

    /**
     * Start the animation
     */
    public start(): void {
        if (this.state.active) {
            logger.warn('Aurora animation already running');
            return;
        }

        logger.info(`Starting Aurora animation: ${this.config.name} (mode: ${this.config.mode})`);
        
        this.state.active = true;
        this.state.currentIteration = 0;
        this.state.currentFrame = 0;
        this.startTime = Date.now();
        
        // Start input if configured
        if (this.inputConfig && this.inputConfig.source !== 'none') {
            this.startInput();
        }

        // Check if we're in a browser environment
        if (typeof requestAnimationFrame !== 'undefined') {
            // Start animation loop in browser
            this.animate();
        } else {
            // In server/test environment, just update state
            logger.info('Aurora animation started in non-browser environment (state tracking only)');
        }
    }

    /**
     * Stop the animation
     */
    public stop(): void {
        if (!this.state.active) {
            return;
        }

        logger.info(`Stopping Aurora animation: ${this.config.name}`);
        
        this.state.active = false;
        
        if (this.animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }

        // Stop input
        this.stopInput();

        if (this.callbacks.onComplete) {
            this.callbacks.onComplete();
        }
    }

    /**
     * Pause the animation (maintains state)
     */
    public pause(): void {
        if (!this.state.active) {
            return;
        }

        logger.info(`Pausing Aurora animation: ${this.config.name}`);
        this.state.active = false;
        
        if (this.animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
    }

    /**
     * Resume the animation
     */
    public resume(): void {
        if (this.state.active) {
            return;
        }

        logger.info(`Resuming Aurora animation: ${this.config.name}`);
        this.state.active = true;
        
        // Check if we're in a browser environment
        if (typeof requestAnimationFrame !== 'undefined') {
            this.animate();
        } else {
            logger.info('Aurora animation resumed in non-browser environment (state tracking only)');
        }
    }

    /**
     * Set callback for frame updates
     */
    public onFrame(callback: (frame: FrameData) => void): void {
        this.callbacks.onFrame = callback;
    }

    /**
     * Set callback for animation completion
     */
    public onComplete(callback: () => void): void {
        this.callbacks.onComplete = callback;
    }

    /**
     * Set callback for errors
     */
    public onError(callback: (error: Error) => void): void {
        this.callbacks.onError = callback;
    }

    /**
     * Get current animation state
     */
    public getState(): AuroraState {
        return { ...this.state };
    }

    /**
     * Get animation configuration
     */
    public getConfig(): AnimationConfig {
        return { ...this.config };
    }

    /**
     * Main animation loop
     */
    private animate = (): void => {
        if (!this.state.active) {
            return;
        }

        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;
        const progress = (elapsed % this.config.duration) / this.config.duration;

        // Calculate current iteration
        const currentIteration = Math.floor(elapsed / this.config.duration);

        // Check if animation should stop (for non-endless modes)
        if (this.config.mode === 'once' && currentIteration >= 1) {
            this.stop();
            return;
        }

        if (this.config.mode === 'repeat' && 
            this.config.repeatCount && 
            currentIteration >= this.config.repeatCount) {
            this.stop();
            return;
        }

        // Update state
        this.state.currentFrame++;
        this.state.totalFrames++;
        this.state.currentIteration = currentIteration;
        this.state.lastUpdate = currentTime;

        // Generate frame data
        const frameData = this.generateFrame(progress, currentTime);

        // Call frame callback
        if (this.callbacks.onFrame) {
            try {
                this.callbacks.onFrame(frameData);
            } catch (error) {
                logger.error('Error in frame callback:', error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error as Error);
                }
            }
        }

        // Continue animation loop
        if (typeof requestAnimationFrame !== 'undefined') {
            this.animationFrameId = requestAnimationFrame(this.animate);
        }
    };

    /**
     * Generate frame data
     */
    private generateFrame(progress: number, timestamp: number): FrameData {
        // Apply easing function
        const easedProgress = this.applyEasing(progress);

        // Generate visual data based on animation config
        const visualData = this.generateVisualData(easedProgress);

        return {
            frameNumber: this.state.currentFrame,
            timestamp,
            visualData
        };
    }

    /**
     * Apply easing function to progress
     */
    private applyEasing(progress: number): number {
        const easing = this.config.easing || 'linear';

        switch (easing) {
            case 'ease-in':
                return progress * progress;
            case 'ease-out':
                return progress * (2 - progress);
            case 'ease-in-out':
                return progress < 0.5
                    ? 2 * progress * progress
                    : -1 + (4 - 2 * progress) * progress;
            case 'linear':
            default:
                return progress;
        }
    }

    /**
     * Generate visual data for the frame
     */
    private generateVisualData(progress: number): Record<string, unknown> {
        // This is a basic implementation
        // In a real implementation, this would generate specific visual data
        // based on the animation type and parameters
        return {
            progress,
            iteration: this.state.currentIteration,
            // Example visual properties
            opacity: Math.sin(progress * Math.PI),
            scale: 1 + Math.sin(progress * Math.PI * 2) * 0.1,
            rotation: progress * 360,
            color: {
                r: Math.floor(255 * progress),
                g: Math.floor(255 * (1 - progress)),
                b: 128
            }
        };
    }

    /**
     * Start input processing
     */
    private startInput(): void {
        if (!this.inputConfig) {
            return;
        }

        logger.info(`Starting input source: ${this.inputConfig.source} (${this.inputConfig.bufferMode} mode)`);
        this.state.inputActive = true;

        // Note: Actual input implementation would depend on the runtime environment
        // This is a placeholder for the input system
        switch (this.inputConfig.source) {
            case 'microphone':
                this.startMicrophoneInput();
                break;
            case 'screen':
                this.startScreenInput();
                break;
            case 'camera':
                this.startCameraInput();
                break;
        }
    }

    /**
     * Stop input processing
     */
    private stopInput(): void {
        if (!this.state.inputActive) {
            return;
        }

        logger.info('Stopping input processing');
        this.state.inputActive = false;

        // Cleanup would happen here
    }

    /**
     * Start microphone input (placeholder)
     */
    private startMicrophoneInput(): void {
        logger.info('Microphone input would be initialized here');
        // In a real implementation, this would use Web Audio API
        // to capture and process microphone input
    }

    /**
     * Start screen input (placeholder)
     */
    private startScreenInput(): void {
        logger.info('Screen capture would be initialized here');
        // In a real implementation, this would use Screen Capture API
        // to capture and process screen content
    }

    /**
     * Start camera input (placeholder)
     */
    private startCameraInput(): void {
        logger.info('Camera input would be initialized here');
        // In a real implementation, this would use MediaDevices API
        // to capture and process camera input
    }
}
