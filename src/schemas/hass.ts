import { JSONSchemaType } from 'ajv';
import { Entity, StateChangedEvent } from '../types/hass.js';

// Define base types for automation components
type TriggerType = {
    platform: string;
    event?: string | null;
    entity_id?: string | null;
    to?: string | null;
    from?: string | null;
    offset?: string | null;
    [key: string]: any;
};

type ConditionType = {
    condition: string;
    conditions?: Array<Record<string, any>> | null;
    [key: string]: any;
};

type ActionType = {
    service: string;
    target?: {
        entity_id?: string | string[] | null;
        [key: string]: any;
    } | null;
    data?: Record<string, any> | null;
    [key: string]: any;
};

type AutomationType = {
    alias: string;
    description?: string | null;
    mode?: ('single' | 'parallel' | 'queued' | 'restart') | null;
    trigger: TriggerType[];
    condition?: ConditionType[] | null;
    action: ActionType[];
};

type DeviceControlType = {
    domain: 'light' | 'switch' | 'climate' | 'cover' | 'fan' | 'scene' | 'script' | 'media_player';
    command: string;
    entity_id: string | string[];
    parameters?: Record<string, any> | null;
};

// Define missing types
export interface Service {
    name: string;
    description: string;
    target?: {
        entity?: string[];
        device?: string[];
        area?: string[];
    } | null;
    fields: Record<string, any>;
}

export interface Config {
    components: string[];
    config_dir: string;
    elevation: number;
    latitude: number;
    longitude: number;
    location_name: string;
    time_zone: string;
    unit_system: {
        length: string;
        mass: string;
        temperature: string;
        volume: string;
    };
    version: string;
}

// Define base schemas
const contextSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        parent_id: { type: 'string', nullable: true },
        user_id: { type: 'string', nullable: true }
    },
    required: ['id', 'parent_id', 'user_id'],
    additionalProperties: false
} as const;

// Entity schema
export const entitySchema = {
    type: 'object',
    properties: {
        entity_id: { type: 'string' },
        state: { type: 'string' },
        attributes: {
            type: 'object',
            additionalProperties: true
        },
        last_changed: { type: 'string' },
        last_updated: { type: 'string' },
        context: contextSchema
    },
    required: ['entity_id', 'state', 'attributes', 'last_changed', 'last_updated', 'context'],
    additionalProperties: false
} as const;

// Service schema
export const serviceSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        target: {
            type: 'object',
            nullable: true,
            properties: {
                entity: { type: 'array', items: { type: 'string' }, nullable: true },
                device: { type: 'array', items: { type: 'string' }, nullable: true },
                area: { type: 'array', items: { type: 'string' }, nullable: true }
            },
            required: [],
            additionalProperties: false
        },
        fields: {
            type: 'object',
            additionalProperties: true
        }
    },
    required: ['name', 'description', 'fields'],
    additionalProperties: false
} as const;

// Define the trigger schema without type assertion
export const triggerSchema = {
    type: 'object',
    properties: {
        platform: { type: 'string' },
        event: { type: 'string', nullable: true },
        entity_id: { type: 'string', nullable: true },
        to: { type: 'string', nullable: true },
        from: { type: 'string', nullable: true },
        offset: { type: 'string', nullable: true }
    },
    required: ['platform'],
    additionalProperties: true
};

// Define the automation schema
export const automationSchema = {
    type: 'object',
    properties: {
        alias: { type: 'string' },
        description: { type: 'string', nullable: true },
        mode: {
            type: 'string',
            enum: ['single', 'parallel', 'queued', 'restart'],
            nullable: true
        },
        trigger: {
            type: 'array',
            items: triggerSchema
        },
        condition: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            },
            nullable: true
        },
        action: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true
            }
        }
    },
    required: ['alias', 'trigger', 'action'],
    additionalProperties: false
};

export const deviceControlSchema: JSONSchemaType<DeviceControlType> = {
    type: 'object',
    properties: {
        domain: {
            type: 'string',
            enum: ['light', 'switch', 'climate', 'cover', 'fan', 'scene', 'script', 'media_player']
        },
        command: { type: 'string' },
        entity_id: {
            anyOf: [
                { type: 'string' },
                {
                    type: 'array',
                    items: { type: 'string' }
                }
            ]
        },
        parameters: {
            type: 'object',
            nullable: true,
            additionalProperties: true
        }
    },
    required: ['domain', 'command', 'entity_id'],
    additionalProperties: false
};

// State changed event schema
export const stateChangedEventSchema = {
    type: 'object',
    properties: {
        event_type: { type: 'string', const: 'state_changed' },
        data: {
            type: 'object',
            properties: {
                entity_id: { type: 'string' },
                new_state: { ...entitySchema, nullable: true },
                old_state: { ...entitySchema, nullable: true }
            },
            required: ['entity_id', 'new_state', 'old_state'],
            additionalProperties: false
        },
        origin: { type: 'string' },
        time_fired: { type: 'string' },
        context: contextSchema
    },
    required: ['event_type', 'data', 'origin', 'time_fired', 'context'],
    additionalProperties: false
} as const;

// Config schema
export const configSchema = {
    type: 'object',
    properties: {
        components: { type: 'array', items: { type: 'string' } },
        config_dir: { type: 'string' },
        elevation: { type: 'number' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        location_name: { type: 'string' },
        time_zone: { type: 'string' },
        unit_system: {
            type: 'object',
            properties: {
                length: { type: 'string' },
                mass: { type: 'string' },
                temperature: { type: 'string' },
                volume: { type: 'string' }
            },
            required: ['length', 'mass', 'temperature', 'volume'],
            additionalProperties: false
        },
        version: { type: 'string' }
    },
    required: [
        'components',
        'config_dir',
        'elevation',
        'latitude',
        'longitude',
        'location_name',
        'time_zone',
        'unit_system',
        'version'
    ],
    additionalProperties: false
} as const; 