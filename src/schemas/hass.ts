import { JSONSchemaType } from 'ajv';
import * as HomeAssistant from '../types/hass.js';

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
                    anyOf: [
                        { type: 'string' },
                        { type: 'array', items: { type: 'string' } }
                    ],
                    nullable: true
                },
                device_id: {
                    anyOf: [
                        { type: 'string' },
                        { type: 'array', items: { type: 'string' } }
                    ],
                    nullable: true
                },
                area_id: {
                    anyOf: [
                        { type: 'string' },
                        { type: 'array', items: { type: 'string' } }
                    ],
                    nullable: true
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

export const stateChangedEventSchema: JSONSchemaType<HomeAssistant.StateChangedEvent> = {
    type: 'object',
    properties: {
        event_type: { type: 'string', const: 'state_changed' },
        data: {
            type: 'object',
            properties: {
                entity_id: { type: 'string' },
                new_state: {
                    anyOf: [
                        {
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
                        },
                        { type: 'null' }
                    ]
                },
                old_state: {
                    anyOf: [
                        {
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
                        },
                        { type: 'null' }
                    ]
                }
            },
            required: ['entity_id', 'new_state', 'old_state'],
            additionalProperties: false
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
            required: ['id'],
            additionalProperties: false
        }
    },
    required: ['event_type', 'data', 'origin', 'time_fired', 'context'],
    additionalProperties: false
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
        components: { type: 'array', items: { type: 'string' } },
        version: { type: 'string' }
    },
    required: ['latitude', 'longitude', 'elevation', 'unit_system', 'location_name', 'time_zone', 'components', 'version'],
    additionalProperties: false
}; 