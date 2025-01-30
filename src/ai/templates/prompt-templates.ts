import { AIModel } from '../types/index.js';

interface PromptTemplate {
    system: string;
    user: string;
    examples: Array<{
        user: string;
        assistant: string;
    }>;
}

interface PromptVariables {
    device_name?: string;
    location?: string;
    action?: string;
    parameters?: Record<string, any>;
    context?: Record<string, any>;
    [key: string]: any;
}

class PromptTemplates {
    private templates: Record<AIModel, PromptTemplate>;

    constructor() {
        this.templates = {
            [AIModel.CLAUDE]: {
                system: `You are Claude, an AI assistant specialized in home automation control through natural language.
Your role is to interpret user commands and translate them into specific device control actions.
Always maintain context awareness and consider user preferences and patterns.
Provide clear, concise responses and suggest relevant follow-up actions.`,
                user: `Control the {device_name} in the {location} by {action} with parameters: {parameters}.
Current context: {context}`,
                examples: [
                    {
                        user: "Turn on the living room lights",
                        assistant: "I'll turn on the lights in the living room. Would you like me to set a specific brightness level?"
                    },
                    {
                        user: "Set the temperature to 72 degrees",
                        assistant: "I'll set the temperature to 72°F. I'll monitor the temperature and let you know when it reaches the target."
                    }
                ]
            },
            [AIModel.GPT4]: {
                system: `You are a home automation assistant powered by GPT-4.
Focus on precise command interpretation and execution.
Maintain high accuracy in device control and parameter settings.
Provide feedback on action success and system state changes.`,
                user: `Command: {action} {device_name} in {location}
Parameters: {parameters}
Context: {context}`,
                examples: [
                    {
                        user: "Dim the bedroom lights to 50%",
                        assistant: "Setting bedroom light brightness to 50%. The change has been applied successfully."
                    },
                    {
                        user: "Start the evening routine",
                        assistant: "Initiating evening routine: dimming lights, adjusting temperature, and enabling security system."
                    }
                ]
            },
            [AIModel.CUSTOM]: {
                system: `Custom home automation assistant configuration.
Adapt to user preferences and patterns.
Learn from interactions and optimize responses.
Provide detailed feedback and suggestions.`,
                user: `Action requested: {action}
Target device: {device_name}
Location: {location}
Parameters: {parameters}
Current context: {context}`,
                examples: [
                    {
                        user: "Make it cooler in here",
                        assistant: "Based on your preferences, I'll lower the temperature by 2 degrees. Current temperature is 74°F, adjusting to 72°F."
                    },
                    {
                        user: "Set up movie mode",
                        assistant: "Activating movie mode: dimming lights to 20%, closing blinds, setting TV input to HDMI 1, and adjusting sound system."
                    }
                ]
            }
        };
    }

    getTemplate(model: AIModel): PromptTemplate {
        return this.templates[model];
    }

    formatPrompt(model: AIModel, variables: PromptVariables): string {
        const template = this.getTemplate(model);
        let prompt = template.user;

        // Replace variables in the prompt
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            if (typeof value === 'object') {
                prompt = prompt.replace(placeholder, JSON.stringify(value));
            } else {
                prompt = prompt.replace(placeholder, String(value));
            }
        }

        return prompt;
    }

    getSystemPrompt(model: AIModel): string {
        return this.templates[model].system;
    }

    getExamples(model: AIModel): Array<{ user: string; assistant: string }> {
        return this.templates[model].examples;
    }

    addExample(
        model: AIModel,
        example: { user: string; assistant: string }
    ): void {
        this.templates[model].examples.push(example);
    }

    updateSystemPrompt(model: AIModel, newPrompt: string): void {
        this.templates[model].system = newPrompt;
    }

    createCustomTemplate(
        model: AIModel.CUSTOM,
        template: PromptTemplate
    ): void {
        this.templates[model] = template;
    }
}

export default new PromptTemplates(); 