import { MediaPlayerSchema, FanSchema, LockSchema, VacuumSchema, SceneSchema, ScriptSchema, CameraSchema, ListMediaPlayersResponseSchema, ListFansResponseSchema, ListLocksResponseSchema, ListVacuumsResponseSchema, ListScenesResponseSchema, ListScriptsResponseSchema, ListCamerasResponseSchema, } from '../../src/schemas';
describe('Device Schemas', () => {
    describe('MediaPlayer Schema', () => {
        it('should validate a valid media player entity', () => {
            const mediaPlayer = {
                entity_id: 'media_player.living_room',
                state: 'playing',
                state_attributes: {
                    volume_level: 0.5,
                    is_volume_muted: false,
                    media_content_id: 'spotify:playlist:xyz',
                    media_content_type: 'playlist',
                    media_title: 'My Playlist',
                    source: 'Spotify',
                    source_list: ['Spotify', 'Radio', 'TV'],
                    supported_features: 12345
                }
            };
            expect(() => MediaPlayerSchema.parse(mediaPlayer)).not.toThrow();
        });
        it('should validate media player list response', () => {
            const response = {
                media_players: [{
                        entity_id: 'media_player.living_room',
                        state: 'playing',
                        state_attributes: {}
                    }]
            };
            expect(() => ListMediaPlayersResponseSchema.parse(response)).not.toThrow();
        });
    });
    describe('Fan Schema', () => {
        it('should validate a valid fan entity', () => {
            const fan = {
                entity_id: 'fan.bedroom',
                state: 'on',
                state_attributes: {
                    percentage: 50,
                    preset_mode: 'auto',
                    preset_modes: ['auto', 'low', 'medium', 'high'],
                    oscillating: true,
                    direction: 'forward',
                    supported_features: 12345
                }
            };
            expect(() => FanSchema.parse(fan)).not.toThrow();
        });
        it('should validate fan list response', () => {
            const response = {
                fans: [{
                        entity_id: 'fan.bedroom',
                        state: 'on',
                        state_attributes: {}
                    }]
            };
            expect(() => ListFansResponseSchema.parse(response)).not.toThrow();
        });
    });
    describe('Lock Schema', () => {
        it('should validate a valid lock entity', () => {
            const lock = {
                entity_id: 'lock.front_door',
                state: 'locked',
                state_attributes: {
                    code_format: 'number',
                    changed_by: 'User',
                    locked: true,
                    supported_features: 12345
                }
            };
            expect(() => LockSchema.parse(lock)).not.toThrow();
        });
        it('should validate lock list response', () => {
            const response = {
                locks: [{
                        entity_id: 'lock.front_door',
                        state: 'locked',
                        state_attributes: { locked: true }
                    }]
            };
            expect(() => ListLocksResponseSchema.parse(response)).not.toThrow();
        });
    });
    describe('Vacuum Schema', () => {
        it('should validate a valid vacuum entity', () => {
            const vacuum = {
                entity_id: 'vacuum.robot',
                state: 'cleaning',
                state_attributes: {
                    battery_level: 80,
                    fan_speed: 'medium',
                    fan_speed_list: ['low', 'medium', 'high'],
                    status: 'cleaning',
                    supported_features: 12345
                }
            };
            expect(() => VacuumSchema.parse(vacuum)).not.toThrow();
        });
        it('should validate vacuum list response', () => {
            const response = {
                vacuums: [{
                        entity_id: 'vacuum.robot',
                        state: 'cleaning',
                        state_attributes: {}
                    }]
            };
            expect(() => ListVacuumsResponseSchema.parse(response)).not.toThrow();
        });
    });
    describe('Scene Schema', () => {
        it('should validate a valid scene entity', () => {
            const scene = {
                entity_id: 'scene.movie_night',
                state: 'on',
                state_attributes: {
                    entity_id: ['light.living_room', 'media_player.tv'],
                    supported_features: 12345
                }
            };
            expect(() => SceneSchema.parse(scene)).not.toThrow();
        });
        it('should validate scene list response', () => {
            const response = {
                scenes: [{
                        entity_id: 'scene.movie_night',
                        state: 'on',
                        state_attributes: {}
                    }]
            };
            expect(() => ListScenesResponseSchema.parse(response)).not.toThrow();
        });
    });
    describe('Script Schema', () => {
        it('should validate a valid script entity', () => {
            const script = {
                entity_id: 'script.welcome_home',
                state: 'on',
                state_attributes: {
                    last_triggered: '2023-12-25T12:00:00Z',
                    mode: 'single',
                    variables: {
                        brightness: 100,
                        color: 'red'
                    },
                    supported_features: 12345
                }
            };
            expect(() => ScriptSchema.parse(script)).not.toThrow();
        });
        it('should validate script list response', () => {
            const response = {
                scripts: [{
                        entity_id: 'script.welcome_home',
                        state: 'on',
                        state_attributes: {}
                    }]
            };
            expect(() => ListScriptsResponseSchema.parse(response)).not.toThrow();
        });
    });
    describe('Camera Schema', () => {
        it('should validate a valid camera entity', () => {
            const camera = {
                entity_id: 'camera.front_door',
                state: 'recording',
                state_attributes: {
                    motion_detection: true,
                    frontend_stream_type: 'hls',
                    supported_features: 12345
                }
            };
            expect(() => CameraSchema.parse(camera)).not.toThrow();
        });
        it('should validate camera list response', () => {
            const response = {
                cameras: [{
                        entity_id: 'camera.front_door',
                        state: 'recording',
                        state_attributes: {}
                    }]
            };
            expect(() => ListCamerasResponseSchema.parse(response)).not.toThrow();
        });
    });
});
//# sourceMappingURL=devices.test.js.map