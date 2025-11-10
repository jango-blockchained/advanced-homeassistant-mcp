/**
 * Aurora Types
 * Type definitions for the Aurora animation and visualization system
 */

/**
 * Animation modes supported by Aurora
 */
export type AnimationMode = 'once' | 'repeat' | 'endless';

/**
 * Input sources for Aurora
 */
export type InputSource = 'microphone' | 'screen' | 'camera' | 'none';

/**
 * Buffering modes for input processing
 */
export type BufferMode = 'live' | 'buffered';

/**
 * Animation configuration
 */
export interface AnimationConfig {
    /** Name of the animation */
    name: string;
    /** Duration of one animation cycle in milliseconds */
    duration: number;
    /** Animation mode - once, repeat, or endless */
    mode: AnimationMode;
    /** Number of times to repeat (ignored if mode is 'endless') */
    repeatCount?: number;
    /** Easing function for the animation */
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    /** Whether the animation should auto-start */
    autoStart?: boolean;
}

/**
 * Input configuration for Aurora
 */
export interface InputConfig {
    /** Input source type */
    source: InputSource;
    /** Buffer mode for processing */
    bufferMode: BufferMode;
    /** Buffer size in milliseconds (for buffered mode) */
    bufferSize?: number;
    /** Sample rate for audio input */
    sampleRate?: number;
    /** Screen capture frame rate */
    frameRate?: number;
}

/**
 * Aurora session configuration
 */
export interface AuroraConfig {
    /** Animation configuration */
    animation: AnimationConfig;
    /** Input configuration */
    input?: InputConfig;
    /** Custom parameters for the visualization */
    visualParams?: Record<string, unknown>;
}

/**
 * Aurora session state
 */
export interface AuroraState {
    /** Whether the session is active */
    active: boolean;
    /** Current animation frame */
    currentFrame: number;
    /** Total frames processed */
    totalFrames: number;
    /** Current repeat iteration (if applicable) */
    currentIteration: number;
    /** Input stream active status */
    inputActive: boolean;
    /** Last update timestamp */
    lastUpdate: number;
}

/**
 * Frame data for animation
 */
export interface FrameData {
    /** Frame number */
    frameNumber: number;
    /** Timestamp of the frame */
    timestamp: number;
    /** Visual data (colors, positions, etc.) */
    visualData: Record<string, unknown>;
    /** Audio data if input is enabled */
    audioData?: Float32Array;
    /** Screen data if input is enabled */
    screenData?: ImageData;
}

/**
 * Instruction guidelines for Aurora agent
 */
export interface AuroraInstructions {
    /** General usage guidelines */
    usage: string[];
    /** Best practices for Aurora */
    bestPractices: string[];
    /** Common patterns and examples */
    examples: string[];
    /** Limitations and constraints */
    limitations: string[];
    /** Safety guidelines */
    safety: string[];
}
