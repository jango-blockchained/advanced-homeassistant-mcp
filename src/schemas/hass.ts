import { JSONSchemaType } from 'ajv';
import * as HomeAssistant from '../types/hass.js';

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

// Schema definitions
export const entitySchema: JSONSchemaType<HomeAssistant.Entity> = {
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
        context: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                parent_id: { type: 'string', nullable: true },
                user_id: { type: 'string', nullable: true }
            },
            required: ['id'],
            additionalProperties: false
        }
    },
    required: ['entity_id', 'state', 'attributes', 'last_changed', 'last_updated', 'context'],
    additionalProperties: false
};

export const serviceSchema: JSONSchemaType<HomeAssistant.Service> = {
    type: 'object',
    properties: {
        domain: { type: 'string' },
        service: { type: 'string' },
        target: {
            type: 'object',
            nullable: true,
            properties: {
                entity_id: {
                    type: 'array',
                    nullable: true,
                    items: { type: 'string' }
                },
                device_id: {
                    type: 'array',
                    nullable: true,
                    items: { type: 'string' }
                },
                area_id: {
                    type: 'array',
                    nullable: true,
                    items: { type: 'string' }
                }
            },
            additionalProperties: false
        },
        service_data: {
            type: 'object',
            nullable: true,
            additionalProperties: true
        }
    },
    required: ['domain', 'service'],
    additionalProperties: false
};

export const automationSchema: JSONSchemaType<AutomationType> = {
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
            items: {
                type: 'object',
                required: ['platform'],
                properties: {
                    platform: { type: 'string' },
                    event: { type: 'string', nullable: true },
                    entity_id: { type: 'string', nullable: true },
                    to: { type: 'string', nullable: true },
                    from: { type: 'string', nullable: true },
                    offset: { type: 'string', nullable: true }
                },
                additionalProperties: true
            }
        },
        condition: {
            type: 'array',
            nullable: true,
            items: {
                type: 'object',
                required: ['condition'],
                properties: {
                    condition: { type: 'string' }
                },
                additionalProperties: true
            }
        },
        action: {
            type: 'array',
            items: {
                type: 'object',
                required: ['service'],
                properties: {
                    service: { type: 'string' },
                    target: {
                        type: 'object',
                        nullable: true,
                        properties: {
                            entity_id: {
                                type: 'array',
                                items: { type: 'string' },
                                nullable: true
                            }
                        },
                        additionalProperties: true
                    },
                    data: {
                        type: 'object',
                        nullable: true,
                        additionalProperties: true
                    }
                },
                additionalProperties: true
            }
        }
    },
    required: ['alias', 'trigger', 'action'],
    additionalProperties: true
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

export const stateChangedEventSchema: JSONSchemaType<HomeAssistant.StateChangedEvent> = {
    type: 'object',
    properties: {
        event_type: { type: 'string', const: 'state_changed' },
        data: {
            type: 'object',
            properties: {
                entity_id: { type: 'string' },
                new_state: {
                    type: 'object',
                    nullable: true,
                    properties: {
                        entity_id: { type: 'string' },
                        state: { type: 'string' },
                        attributes: {
                            type: 'object',
                            additionalProperties: true
                        },
                        last_changed: { type: 'string' },
                        last_updated: { type: 'string' },
                        context: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                parent_id: { type: 'string', nullable: true },
                                user_id: { type: 'string', nullable: true }
                            },
                            required: ['id']
                        }
                    },
                    required: ['entity_id', 'state', 'attributes', 'last_changed', 'last_updated', 'context']
                },
                old_state: {
                    type: 'object',
                    nullable: true,
                    properties: {
                        entity_id: { type: 'string' },
                        state: { type: 'string' },
                        attributes: {
                            type: 'object',
                            additionalProperties: true
                        },
                        last_changed: { type: 'string' },
                        last_updated: { type: 'string' },
                        context: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                parent_id: { type: 'string', nullable: true },
                                user_id: { type: 'string', nullable: true }
                            },
                            required: ['id']
                        }
                    },
                    required: ['entity_id', 'state', 'attributes', 'last_changed', 'last_updated', 'context']
                }
            },
            required: ['entity_id', 'new_state']
        },
        origin: { type: 'string' },
        time_fired: { type: 'string' },
        context: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                parent_id: { type: 'string', nullable: true },
                user_id: { type: 'string', nullable: true }
            },
            required: ['id']
        }
    },
    required: ['event_type', 'data', 'origin', 'time_fired', 'context']
};

export const configSchema: JSONSchemaType<HomeAssistant.Config> = {
    type: 'object',
    properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        elevation: { type: 'number' },
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
        location_name: { type: 'string' },
        time_zone: { type: 'string' },
        components: {
            type: 'array',
            items: { type: 'string' }
        },
        version: { type: 'string' }
    },
    required: ['latitude', 'longitude', 'elevation', 'unit_system', 'location_name', 'time_zone', 'components', 'version'],
    additionalProperties: false
}; 