/**
 * MCP Resources for Home Assistant
 * 
 * Expose Home Assistant device states and configurations as MCP resources
 */

import { get_hass } from "../hass/index.js";
import { logger } from "../utils/logger.js";

export interface MCPResource {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
}

export interface MCPResourceContent {
    uri: string;
    mimeType: string;
    text?: string;
    blob?: string;
}

/**
 * List all available resources
 */
export async function listResources(): Promise<MCPResource[]> {
    try {
        const hass = await get_hass();
        const states = await hass.getStates();

        const resources: MCPResource[] = [
            {
                uri: "ha://devices/all",
                name: "All Devices",
                description: "Complete list of all Home Assistant devices and their current states",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/lights",
                name: "All Lights",
                description: "All light entities and their current states",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/climate",
                name: "Climate Devices",
                description: "All climate control devices (thermostats, HVAC)",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/media_players",
                name: "Media Players",
                description: "All media player entities and their states",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/covers",
                name: "Covers",
                description: "All cover entities (blinds, curtains, garage doors)",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/locks",
                name: "Locks",
                description: "All lock entities and their states",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/fans",
                name: "Fans",
                description: "All fan entities and their states",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/vacuums",
                name: "Vacuum Cleaners",
                description: "All vacuum entities and their states",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/alarms",
                name: "Alarm Panels",
                description: "All alarm control panel entities",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/sensors",
                name: "Sensors",
                description: "All sensor entities (temperature, humidity, etc.)",
                mimeType: "application/json"
            },
            {
                uri: "ha://devices/switches",
                name: "Switches",
                description: "All switch entities",
                mimeType: "application/json"
            },
            {
                uri: "ha://config/areas",
                name: "Areas/Rooms",
                description: "Configured areas and rooms in Home Assistant",
                mimeType: "application/json"
            },
            {
                uri: "ha://config/automations",
                name: "Automations",
                description: "List of all configured automations",
                mimeType: "application/json"
            },
            {
                uri: "ha://config/scenes",
                name: "Scenes",
                description: "List of all configured scenes",
                mimeType: "application/json"
            },
            {
                uri: "ha://summary/dashboard",
                name: "Dashboard Summary",
                description: "Quick overview of home status including active devices, temperatures, and security status",
                mimeType: "application/json"
            }
        ];

        return resources;
    } catch (error) {
        logger.error("Failed to list resources:", error);
        return [];
    }
}

/**
 * Get the content of a specific resource
 */
export async function getResource(uri: string): Promise<MCPResourceContent | null> {
    try {
        const hass = await get_hass();
        const states = await hass.getStates();

        // Parse the URI
        const match = uri.match(/^ha:\/\/([^/]+)\/([^/]+)$/);
        if (!match) {
            throw new Error(`Invalid resource URI: ${uri}`);
        }

        const [, category, type] = match;

        let content: any = null;

        if (category === "devices") {
            content = await getDeviceResource(type, states);
        } else if (category === "config") {
            content = await getConfigResource(type, states);
        } else if (category === "summary") {
            content = await getSummaryResource(type, states);
        } else {
            throw new Error(`Unknown resource category: ${category}`);
        }

        if (content === null) {
            return null;
        }

        return {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(content, null, 2)
        };
    } catch (error) {
        logger.error(`Failed to get resource ${uri}:`, error);
        return null;
    }
}

async function getDeviceResource(type: string, states: any[]): Promise<any> {
    const filterMap: Record<string, string> = {
        all: "",
        lights: "light.",
        climate: "climate.",
        media_players: "media_player.",
        covers: "cover.",
        locks: "lock.",
        fans: "fan.",
        vacuums: "vacuum.",
        alarms: "alarm_control_panel.",
        sensors: "sensor.",
        switches: "switch."
    };

    const prefix = filterMap[type];
    if (prefix === undefined) {
        return null;
    }

    const filtered = prefix === "" 
        ? states 
        : states.filter(s => s.entity_id.startsWith(prefix));

    return {
        count: filtered.length,
        devices: filtered.map(state => ({
            entity_id: state.entity_id,
            name: state.attributes.friendly_name || state.entity_id,
            state: state.state,
            attributes: state.attributes,
            last_changed: state.last_changed,
            last_updated: state.last_updated
        }))
    };
}

async function getConfigResource(type: string, states: any[]): Promise<any> {
    if (type === "areas") {
        // Group devices by area
        const areas: Record<string, any[]> = {};
        
        for (const state of states) {
            const area = state.attributes.area_id || "unassigned";
            if (!areas[area]) {
                areas[area] = [];
            }
            areas[area].push({
                entity_id: state.entity_id,
                name: state.attributes.friendly_name || state.entity_id,
                domain: state.entity_id.split('.')[0]
            });
        }

        return {
            areas: Object.entries(areas).map(([id, devices]) => ({
                id,
                device_count: devices.length,
                devices
            }))
        };
    } else if (type === "automations") {
        const automations = states.filter(s => s.entity_id.startsWith("automation."));
        return {
            count: automations.length,
            automations: automations.map(a => ({
                entity_id: a.entity_id,
                name: a.attributes.friendly_name || a.entity_id,
                state: a.state,
                last_triggered: a.attributes.last_triggered
            }))
        };
    } else if (type === "scenes") {
        const scenes = states.filter(s => s.entity_id.startsWith("scene."));
        return {
            count: scenes.length,
            scenes: scenes.map(s => ({
                entity_id: s.entity_id,
                name: s.attributes.friendly_name || s.entity_id
            }))
        };
    }

    return null;
}

async function getSummaryResource(type: string, states: any[]): Promise<any> {
    if (type === "dashboard") {
        const lights = states.filter(s => s.entity_id.startsWith("light."));
        const climate = states.filter(s => s.entity_id.startsWith("climate."));
        const locks = states.filter(s => s.entity_id.startsWith("lock."));
        const alarms = states.filter(s => s.entity_id.startsWith("alarm_control_panel."));
        const sensors = states.filter(s => s.entity_id.startsWith("sensor."));

        // Get active lights
        const activeLights = lights.filter(l => l.state === "on");

        // Get temperature sensors
        const tempSensors = sensors.filter(s => 
            s.attributes.device_class === "temperature" || 
            s.attributes.unit_of_measurement === "°C" ||
            s.attributes.unit_of_measurement === "°F"
        );

        return {
            timestamp: new Date().toISOString(),
            summary: {
                lights: {
                    total: lights.length,
                    on: activeLights.length,
                    off: lights.length - activeLights.length
                },
                climate: {
                    total: climate.length,
                    devices: climate.map(c => ({
                        name: c.attributes.friendly_name || c.entity_id,
                        temperature: c.attributes.current_temperature,
                        target: c.attributes.temperature,
                        mode: c.attributes.hvac_mode || c.state
                    }))
                },
                security: {
                    locks: locks.map(l => ({
                        name: l.attributes.friendly_name || l.entity_id,
                        state: l.state
                    })),
                    alarms: alarms.map(a => ({
                        name: a.attributes.friendly_name || a.entity_id,
                        state: a.state
                    }))
                },
                temperatures: tempSensors.slice(0, 10).map(t => ({
                    name: t.attributes.friendly_name || t.entity_id,
                    value: t.state,
                    unit: t.attributes.unit_of_measurement
                }))
            }
        };
    }

    return null;
}
