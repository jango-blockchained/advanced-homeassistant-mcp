/**
 * Aurora Instructions
 * Provides guidance and instructions for agents using the Aurora system
 */

import type { AuroraInstructions } from './types.js';

/**
 * Get Aurora usage instructions for the agent
 * This function should be called at the beginning of any Aurora session
 * to provide the agent with guidelines on how to properly use Aurora
 * and to rail/guide the agent's behavior while using the system.
 */
export function getAuroraInstructions(): AuroraInstructions {
    return {
        usage: [
            "Aurora is a visual animation and input processing system for Home Assistant MCP",
            "Use Aurora to create visual feedback and animations for smart home interactions",
            "Aurora supports three animation modes: 'once' (single playback), 'repeat' (limited repetitions), and 'endless' (continuous loop)",
            "To create endless animations, set mode='endless' in the animation config",
            "Input sources (microphone, screen) can be enabled to create reactive visualizations",
            "Choose 'live' buffer mode for real-time processing or 'buffered' for smoother playback"
        ],
        bestPractices: [
            "Always call getAuroraInstructions() at the start of any Aurora session",
            "Use 'endless' mode sparingly - prefer 'repeat' with a reasonable count for better resource management",
            "When using microphone input, inform users about privacy and ensure proper permissions",
            "For screen capture, respect user privacy and only capture when explicitly requested",
            "Test animations with 'once' mode first before enabling 'endless' or 'repeat'",
            "Monitor system resources when using input sources with high buffer rates",
            "Always provide clear user feedback when starting/stopping Aurora sessions",
            "Use meaningful animation names and durations appropriate for the use case"
        ],
        examples: [
            "Simple endless animation: { animation: { name: 'pulse', duration: 2000, mode: 'endless' } }",
            "Repeated animation: { animation: { name: 'fade', duration: 1000, mode: 'repeat', repeatCount: 5 } }",
            "Microphone reactive: { animation: { name: 'visualizer', duration: 100, mode: 'endless' }, input: { source: 'microphone', bufferMode: 'live' } }",
            "Screen-based animation: { input: { source: 'screen', bufferMode: 'buffered', frameRate: 30 } }",
            "One-shot animation: { animation: { name: 'notification', duration: 500, mode: 'once', autoStart: true } }"
        ],
        limitations: [
            "Aurora animations run in the browser/client environment",
            "Screen capture requires appropriate browser permissions",
            "Microphone input requires user permission and secure context (HTTPS)",
            "Endless animations will continue until explicitly stopped",
            "High frame rates or large buffer sizes may impact performance",
            "Multiple concurrent Aurora sessions should be avoided",
            "Input processing latency depends on buffer mode and system capabilities"
        ],
        safety: [
            "Never start endless animations without user awareness",
            "Always stop Aurora sessions when no longer needed to free resources",
            "Respect user privacy when accessing microphone or screen",
            "Provide clear indicators when input sources are active",
            "Implement timeouts for long-running endless animations",
            "Validate all configuration parameters before starting a session",
            "Handle permission denials gracefully with clear user feedback",
            "Monitor and log any errors during animation or input processing"
        ]
    };
}

/**
 * Format instructions as a readable string for the agent
 */
export function formatInstructionsForAgent(): string {
    const instructions = getAuroraInstructions();
    
    let output = "# Aurora System Instructions\n\n";
    
    output += "## Usage\n";
    instructions.usage.forEach(item => {
        output += `- ${item}\n`;
    });
    
    output += "\n## Best Practices\n";
    instructions.bestPractices.forEach(item => {
        output += `- ${item}\n`;
    });
    
    output += "\n## Examples\n";
    instructions.examples.forEach(item => {
        output += `- ${item}\n`;
    });
    
    output += "\n## Limitations\n";
    instructions.limitations.forEach(item => {
        output += `- ${item}\n`;
    });
    
    output += "\n## Safety Guidelines\n";
    instructions.safety.forEach(item => {
        output += `- ${item}\n`;
    });
    
    return output;
}

/**
 * Validate an Aurora configuration against the guidelines
 */
export function validateConfig(config: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config || typeof config !== 'object') {
        errors.push("Configuration must be a valid object");
        return { valid: false, errors };
    }
    
    const cfg = config as Record<string, unknown>;
    
    // Check animation config
    if (!cfg.animation || typeof cfg.animation !== 'object') {
        errors.push("Animation configuration is required");
    } else {
        const anim = cfg.animation as Record<string, unknown>;
        
        if (!anim.name || typeof anim.name !== 'string') {
            errors.push("Animation name is required and must be a string");
        }
        
        if (!anim.duration || typeof anim.duration !== 'number' || anim.duration <= 0) {
            errors.push("Animation duration must be a positive number");
        }
        
        if (!anim.mode || !['once', 'repeat', 'endless'].includes(anim.mode as string)) {
            errors.push("Animation mode must be 'once', 'repeat', or 'endless'");
        }
        
        if (anim.mode === 'repeat' && (!anim.repeatCount || typeof anim.repeatCount !== 'number' || anim.repeatCount <= 0)) {
            errors.push("repeatCount must be a positive number when mode is 'repeat'");
        }
    }
    
    // Check input config if present
    if (cfg.input && typeof cfg.input === 'object') {
        const input = cfg.input as Record<string, unknown>;
        
        if (!input.source || !['microphone', 'screen', 'camera', 'none'].includes(input.source as string)) {
            errors.push("Input source must be 'microphone', 'screen', 'camera', or 'none'");
        }
        
        if (!input.bufferMode || !['live', 'buffered'].includes(input.bufferMode as string)) {
            errors.push("Buffer mode must be 'live' or 'buffered'");
        }
        
        if (input.bufferMode === 'buffered' && input.bufferSize && 
            (typeof input.bufferSize !== 'number' || input.bufferSize <= 0)) {
            errors.push("bufferSize must be a positive number");
        }
    }
    
    return { valid: errors.length === 0, errors };
}
