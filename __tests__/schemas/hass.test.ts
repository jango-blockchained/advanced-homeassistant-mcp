import { entitySchema, serviceSchema, stateChangedEventSchema, configSchema, automationSchema, deviceControlSchema } from '../../src/schemas/hass.js';
import AjvModule from 'ajv';
const Ajv = AjvModule.default || AjvModule;

describe('Home Assistant Schemas', () => {
    const ajv = new Ajv({ allErrors: true });

    describe('Entity Schema', () => {
        const validate = ajv.compile(entitySchema);

        it('should validate a valid entity', () => {
            const validEntity = {
                entity_id: 'light.living_room',
                state: 'on',
                attributes: {
                    brightness: 255,
                    friendly_name: 'Living Room Light'
                },
                last_changed: '2024-01-01T00:00:00Z',
                last_updated: '2024-01-01T00:00:00Z',
                context: {
                    id: '123456',
                    parent_id: null,
                    user_id: null
                }
            };
            expect(validate(validEntity)).toBe(true);
        });

        it('should reject entity with missing required fields', () => {
            const invalidEntity = {
                entity_id: 'light.living_room',
                state: 'on'
                // missing attributes, last_changed, last_updated, context
            };
            expect(validate(invalidEntity)).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('should validate entity with additional attributes', () => {
            const entityWithExtraAttrs = {
                entity_id: 'climate.living_room',
                state: '22',
                attributes: {
                    temperature: 22,
                    humidity: 45,
                    mode: 'auto',
                    custom_attr: 'value'
                },
                last_changed: '2024-01-01T00:00:00Z',
                last_updated: '2024-01-01T00:00:00Z',
                context: {
                    id: '123456',
                    parent_id: null,
                    user_id: null
                }
            };
            expect(validate(entityWithExtraAttrs)).toBe(true);
        });

        it('should reject invalid entity_id format', () => {
            const invalidEntityId = {
                entity_id: 'invalid_format',
                state: 'on',
                attributes: {},
                last_changed: '2024-01-01T00:00:00Z',
                last_updated: '2024-01-01T00:00:00Z',
                context: {
                    id: '123456',
                    parent_id: null,
                    user_id: null
                }
            };
            expect(validate(invalidEntityId)).toBe(false);
        });
    });

    describe('Service Schema', () => {
        const validate = ajv.compile(serviceSchema);

        it('should validate a basic service call', () => {
            const basicService = {
                domain: 'light',
                service: 'turn_on',
                target: {
                    entity_id: ['light.living_room']
                }
            };
            expect(validate(basicService)).toBe(true);
        });

        it('should validate service call with multiple targets', () => {
            const multiTargetService = {
                domain: 'light',
                service: 'turn_on',
                target: {
                    entity_id: ['light.living_room', 'light.kitchen'],
                    device_id: ['device123', 'device456'],
                    area_id: ['living_room', 'kitchen']
                },
                service_data: {
                    brightness_pct: 100
                }
            };
            expect(validate(multiTargetService)).toBe(true);
        });

        it('should validate service call without targets', () => {
            const noTargetService = {
                domain: 'homeassistant',
                service: 'restart'
            };
            expect(validate(noTargetService)).toBe(true);
        });

        it('should reject service call with invalid target type', () => {
            const invalidService = {
                domain: 'light',
                service: 'turn_on',
                target: {
                    entity_id: 'not_an_array' // should be an array
                }
            };
            expect(validate(invalidService)).toBe(false);
            expect(validate.errors).toBeDefined();
        });
    });

    describe('State Changed Event Schema', () => {
        const validate = ajv.compile(stateChangedEventSchema);

        it('should validate a valid state changed event', () => {
            const validEvent = {
                event_type: 'state_changed',
                data: {
                    entity_id: 'light.living_room',
                    new_state: {
                        entity_id: 'light.living_room',
                        state: 'on',
                        attributes: {
                            brightness: 255
                        },
                        last_changed: '2024-01-01T00:00:00Z',
                        last_updated: '2024-01-01T00:00:00Z',
                        context: {
                            id: '123456',
                            parent_id: null,
                            user_id: null
                        }
                    },
                    old_state: {
                        entity_id: 'light.living_room',
                        state: 'off',
                        attributes: {},
                        last_changed: '2024-01-01T00:00:00Z',
                        last_updated: '2024-01-01T00:00:00Z',
                        context: {
                            id: '123456',
                            parent_id: null,
                            user_id: null
                        }
                    }
                },
                origin: 'LOCAL',
                time_fired: '2024-01-01T00:00:00Z',
                context: {
                    id: '123456',
                    parent_id: null,
                    user_id: null
                }
            };
            expect(validate(validEvent)).toBe(true);
        });

        it('should validate event with null old_state', () => {
            const newEntityEvent = {
                event_type: 'state_changed',
                data: {
                    entity_id: 'light.living_room',
                    new_state: {
                        entity_id: 'light.living_room',
                        state: 'on',
                        attributes: {},
                        last_changed: '2024-01-01T00:00:00Z',
                        last_updated: '2024-01-01T00:00:00Z',
                        context: {
                            id: '123456',
                            parent_id: null,
                            user_id: null
                        }
                    },
                    old_state: null
                },
                origin: 'LOCAL',
                time_fired: '2024-01-01T00:00:00Z',
                context: {
                    id: '123456',
                    parent_id: null,
                    user_id: null
                }
            };
            expect(validate(newEntityEvent)).toBe(true);
        });

        it('should reject event with invalid event_type', () => {
            const invalidEvent = {
                event_type: 'wrong_type',
                data: {
                    entity_id: 'light.living_room',
                    new_state: null,
                    old_state: null
                },
                origin: 'LOCAL',
                time_fired: '2024-01-01T00:00:00Z',
                context: {
                    id: '123456',
                    parent_id: null,
                    user_id: null
                }
            };
            expect(validate(invalidEvent)).toBe(false);
            expect(validate.errors).toBeDefined();
        });
    });

    describe('Config Schema', () => {
        const validate = ajv.compile(configSchema);

        it('should validate a minimal config', () => {
            const minimalConfig = {
                latitude: 52.3731,
                longitude: 4.8922,
                elevation: 0,
                unit_system: {
                    length: 'km',
                    mass: 'kg',
                    temperature: '°C',
                    volume: 'L'
                },
                location_name: 'Home',
                time_zone: 'Europe/Amsterdam',
                components: ['homeassistant'],
                version: '2024.1.0'
            };
            expect(validate(minimalConfig)).toBe(true);
        });

        it('should reject config with missing required fields', () => {
            const invalidConfig = {
                latitude: 52.3731,
                longitude: 4.8922
                // missing other required fields
            };
            expect(validate(invalidConfig)).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('should reject config with invalid types', () => {
            const invalidConfig = {
                latitude: '52.3731', // should be number
                longitude: 4.8922,
                elevation: 0,
                unit_system: {
                    length: 'km',
                    mass: 'kg',
                    temperature: '°C',
                    volume: 'L'
                },
                location_name: 'Home',
                time_zone: 'Europe/Amsterdam',
                components: ['homeassistant'],
                version: '2024.1.0'
            };
            expect(validate(invalidConfig)).toBe(false);
            expect(validate.errors).toBeDefined();
        });
    });

    describe('Automation Schema', () => {
        const validate = ajv.compile(automationSchema);

        it('should validate a basic automation', () => {
            const basicAutomation = {
                alias: 'Turn on lights at sunset',
                description: 'Automatically turn on lights when the sun sets',
                trigger: [{
                    platform: 'sun',
                    event: 'sunset',
                    offset: '+00:30:00'
                }],
                action: [{
                    service: 'light.turn_on',
                    target: {
                        entity_id: ['light.living_room', 'light.kitchen']
                    },
                    data: {
                        brightness_pct: 70
                    }
                }]
            };
            expect(validate(basicAutomation)).toBe(true);
        });

        it('should validate automation with conditions', () => {
            const automationWithConditions = {
                alias: 'Conditional Light Control',
                mode: 'single',
                trigger: [{
                    platform: 'state',
                    entity_id: 'binary_sensor.motion',
                    to: 'on'
                }],
                condition: [{
                    condition: 'and',
                    conditions: [
                        {
                            condition: 'time',
                            after: '22:00:00',
                            before: '06:00:00'
                        },
                        {
                            condition: 'state',
                            entity_id: 'input_boolean.guest_mode',
                            state: 'off'
                        }
                    ]
                }],
                action: [{
                    service: 'light.turn_on',
                    target: {
                        entity_id: 'light.hallway'
                    }
                }]
            };
            expect(validate(automationWithConditions)).toBe(true);
        });

        it('should validate automation with multiple triggers and actions', () => {
            const complexAutomation = {
                alias: 'Complex Automation',
                mode: 'parallel',
                trigger: [
                    {
                        platform: 'state',
                        entity_id: 'binary_sensor.door',
                        to: 'on'
                    },
                    {
                        platform: 'state',
                        entity_id: 'binary_sensor.window',
                        to: 'on'
                    }
                ],
                condition: [{
                    condition: 'state',
                    entity_id: 'alarm_control_panel.home',
                    state: 'armed_away'
                }],
                action: [
                    {
                        service: 'notify.mobile_app',
                        data: {
                            message: 'Security alert: Movement detected!'
                        }
                    },
                    {
                        service: 'light.turn_on',
                        target: {
                            entity_id: 'light.all_lights'
                        }
                    },
                    {
                        service: 'camera.snapshot',
                        target: {
                            entity_id: 'camera.front_door'
                        }
                    }
                ]
            };
            expect(validate(complexAutomation)).toBe(true);
        });

        it('should reject automation without required fields', () => {
            const invalidAutomation = {
                description: 'Missing required fields'
                // missing alias, trigger, and action
            };
            expect(validate(invalidAutomation)).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('should validate all automation modes', () => {
            const modes = ['single', 'parallel', 'queued', 'restart'];
            modes.forEach(mode => {
                const automation = {
                    alias: `Test ${mode} mode`,
                    mode,
                    trigger: [{
                        platform: 'state',
                        entity_id: 'input_boolean.test',
                        to: 'on'
                    }],
                    action: [{
                        service: 'light.turn_on',
                        target: {
                            entity_id: 'light.test'
                        }
                    }]
                };
                expect(validate(automation)).toBe(true);
            });
        });
    });

    describe('Device Control Schema', () => {
        const validate = ajv.compile(deviceControlSchema);

        it('should validate light control command', () => {
            const lightCommand = {
                domain: 'light',
                command: 'turn_on',
                entity_id: 'light.living_room',
                parameters: {
                    brightness: 255,
                    color_temp: 400,
                    transition: 2
                }
            };
            expect(validate(lightCommand)).toBe(true);
        });

        it('should validate climate control command', () => {
            const climateCommand = {
                domain: 'climate',
                command: 'set_temperature',
                entity_id: 'climate.living_room',
                parameters: {
                    temperature: 22.5,
                    hvac_mode: 'heat',
                    target_temp_high: 24,
                    target_temp_low: 20
                }
            };
            expect(validate(climateCommand)).toBe(true);
        });

        it('should validate cover control command', () => {
            const coverCommand = {
                domain: 'cover',
                command: 'set_position',
                entity_id: 'cover.garage_door',
                parameters: {
                    position: 50,
                    tilt_position: 45
                }
            };
            expect(validate(coverCommand)).toBe(true);
        });

        it('should validate fan control command', () => {
            const fanCommand = {
                domain: 'fan',
                command: 'set_speed',
                entity_id: 'fan.bedroom',
                parameters: {
                    speed: 'medium',
                    oscillating: true,
                    direction: 'forward'
                }
            };
            expect(validate(fanCommand)).toBe(true);
        });

        it('should reject command with invalid domain', () => {
            const invalidCommand = {
                domain: 'invalid_domain',
                command: 'turn_on',
                entity_id: 'light.living_room'
            };
            expect(validate(invalidCommand)).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('should reject command with mismatched domain and entity_id', () => {
            const mismatchedCommand = {
                domain: 'light',
                command: 'turn_on',
                entity_id: 'switch.living_room' // mismatched domain
            };
            expect(validate(mismatchedCommand)).toBe(false);
        });

        it('should validate command with array of entity_ids', () => {
            const multiEntityCommand = {
                domain: 'light',
                command: 'turn_on',
                entity_id: ['light.living_room', 'light.kitchen'],
                parameters: {
                    brightness: 255
                }
            };
            expect(validate(multiEntityCommand)).toBe(true);
        });

        it('should validate scene activation command', () => {
            const sceneCommand = {
                domain: 'scene',
                command: 'turn_on',
                entity_id: 'scene.movie_night',
                parameters: {
                    transition: 2
                }
            };
            expect(validate(sceneCommand)).toBe(true);
        });

        it('should validate script execution command', () => {
            const scriptCommand = {
                domain: 'script',
                command: 'turn_on',
                entity_id: 'script.welcome_home',
                parameters: {
                    variables: {
                        user: 'John',
                        delay: 5
                    }
                }
            };
            expect(validate(scriptCommand)).toBe(true);
        });
    });
}); 