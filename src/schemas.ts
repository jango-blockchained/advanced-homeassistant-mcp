import { z } from "zod";


export const DomainSchema = z.enum([
    "light",
    "climate",
    "alarm_control_panel",
    "cover",
    "switch",
    "contact",
    "media_player",
    "fan",
    "lock",
    "vacuum",
    "scene",
    "script",
    "camera"
]);

// Generic list request schema

export const ListRequestSchema = z.object({
    domain: DomainSchema,
    area: z.string().optional(),
    floor: z.string().optional(),
});

// Areas

export const AreaSchema = z.object({
    id: z.string(),
    name: z.string(),
    floor: z.string(),
});

export const FloorSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export const ListFloorsResponseSchema = z.object({
    floors: z.array(FloorSchema),
});

// Alarm

export const AlarmAttributesSchema = z.object({
    code_format: z.string().optional(),
    changed_by: z.string().optional(),
    code_arm_required: z.boolean().optional(),
    friendly_name: z.string().optional(),
    supported_features: z.number().optional(),
});

export const AlarmSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: AlarmAttributesSchema,
});


export const ListAlarmsResponseSchema = z.object({
    alarms: z.array(AlarmSchema),
});


// Devices

export const DeviceSchema = z.object({
    id: z.string(),
    name: z.string(),
    name_by_user: z.string().optional(),
    model: z.string(),
    model_id: z.string().nullable(),
    manufacturer: z.string(),
    area_id: z.string().nullable(),
    config_entries: z.array(z.string()),
    primary_config_entry: z.string(),
    connections: z.array(z.tuple([z.string(), z.string()])),
    configuration_url: z.string().nullable(),
    disabled_by: z.string().nullable(),
    entry_type: z.string().nullable(),
    hw_version: z.string().nullable(),
    sw_version: z.string().nullable(),
    via_device_id: z.string().nullable(),
    created_at: z.number(),
    modified_at: z.number(),
    identifiers: z.array(z.any()),
    labels: z.array(z.string()),
    serial_number: z.string().optional()
});

export const ListDevicesResponseSchema = z.object({
    _meta: z.object({}).optional(),
    devices: z.array(DeviceSchema)
});

// Media Player
export const MediaPlayerAttributesSchema = z.object({
    volume_level: z.number().optional(),
    is_volume_muted: z.boolean().optional(),
    media_content_id: z.string().optional(),
    media_content_type: z.string().optional(),
    media_duration: z.number().optional(),
    media_position: z.number().optional(),
    media_title: z.string().optional(),
    source: z.string().optional(),
    source_list: z.array(z.string()).optional(),
    supported_features: z.number().optional(),
});

export const MediaPlayerSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: MediaPlayerAttributesSchema,
});

// Fan
export const FanAttributesSchema = z.object({
    percentage: z.number().optional(),
    preset_mode: z.string().optional(),
    preset_modes: z.array(z.string()).optional(),
    oscillating: z.boolean().optional(),
    direction: z.string().optional(),
    supported_features: z.number().optional(),
});

export const FanSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: FanAttributesSchema,
});

// Lock
export const LockAttributesSchema = z.object({
    code_format: z.string().optional(),
    changed_by: z.string().optional(),
    locked: z.boolean(),
    supported_features: z.number().optional(),
});

export const LockSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: LockAttributesSchema,
});

// Vacuum
export const VacuumAttributesSchema = z.object({
    battery_level: z.number().optional(),
    fan_speed: z.string().optional(),
    fan_speed_list: z.array(z.string()).optional(),
    status: z.string().optional(),
    supported_features: z.number().optional(),
});

export const VacuumSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: VacuumAttributesSchema,
});

// Scene
export const SceneAttributesSchema = z.object({
    entity_id: z.array(z.string()).optional(),
    supported_features: z.number().optional(),
});

export const SceneSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: SceneAttributesSchema,
});

// Script
export const ScriptAttributesSchema = z.object({
    last_triggered: z.string().optional(),
    mode: z.string().optional(),
    variables: z.record(z.any()).optional(),
    supported_features: z.number().optional(),
});

export const ScriptSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: ScriptAttributesSchema,
});

// Camera
export const CameraAttributesSchema = z.object({
    motion_detection: z.boolean().optional(),
    frontend_stream_type: z.string().optional(),
    supported_features: z.number().optional(),
});

export const CameraSchema = z.object({
    entity_id: z.string(),
    state: z.string(),
    state_attributes: CameraAttributesSchema,
});

// Response schemas for new devices
export const ListMediaPlayersResponseSchema = z.object({
    media_players: z.array(MediaPlayerSchema),
});

export const ListFansResponseSchema = z.object({
    fans: z.array(FanSchema),
});

export const ListLocksResponseSchema = z.object({
    locks: z.array(LockSchema),
});

export const ListVacuumsResponseSchema = z.object({
    vacuums: z.array(VacuumSchema),
});

export const ListScenesResponseSchema = z.object({
    scenes: z.array(SceneSchema),
});

export const ListScriptsResponseSchema = z.object({
    scripts: z.array(ScriptSchema),
});

export const ListCamerasResponseSchema = z.object({
    cameras: z.array(CameraSchema),
});