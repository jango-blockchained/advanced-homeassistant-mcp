class HomeAssistantAPI {
    baseUrl;
    token;
    cache = new Map();
    constructor() {
        this.baseUrl = process.env.HASS_HOST || "http://localhost:8123";
        this.token = process.env.HASS_TOKEN || "";
        if (!this.token || this.token === "your_hass_token_here") {
            throw new Error("HASS_TOKEN is required but not set in environment variables");
        }
        console.log(`Initializing Home Assistant API with base URL: ${this.baseUrl}`);
    }
    getCache(key, ttlMs = 30000) {
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < ttlMs) {
            return entry.data;
        }
        return null;
    }
    setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    async fetchApi(endpoint, options = {}) {
        const url = `${this.baseUrl}/api/${endpoint}`;
        console.log(`Making request to: ${url}`);
        console.log('Request options:', {
            method: options.method || 'GET',
            headers: {
                Authorization: 'Bearer [REDACTED]',
                "Content-Type": "application/json",
                ...options.headers,
            },
            body: options.body ? JSON.parse(options.body) : undefined
        });
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "Content-Type": "application/json",
                    ...options.headers,
                },
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Home Assistant API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`Home Assistant API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            console.log('Response data:', data);
            return data;
        }
        catch (error) {
            console.error('Failed to make request:', error);
            throw error;
        }
    }
    async getStates() {
        // Check cache first (30 second TTL for device states)
        const cached = this.getCache("states", 30000);
        if (cached) {
            return cached;
        }
        const data = await this.fetchApi("states");
        const states = data;
        this.setCache("states", states);
        return states;
    }
    async getState(entityId) {
        // Check cache first (10 second TTL for individual states)
        const cached = this.getCache(`state_${entityId}`, 10000);
        if (cached) {
            return cached;
        }
        const data = await this.fetchApi(`states/${entityId}`);
        const state = data;
        this.setCache(`state_${entityId}`, state);
        return state;
    }
    async callService(domain, service, data) {
        await this.fetchApi(`services/${domain}/${service}`, {
            method: "POST",
            body: JSON.stringify(data),
        });
        // Clear states cache when services are called as they may change state
        this.cache.delete("states");
    }
}
let instance = null;
export async function get_hass() {
    if (!instance) {
        try {
            instance = new HomeAssistantAPI();
            // Verify connection by trying to get states
            await instance.getStates();
            console.log('Successfully connected to Home Assistant');
        }
        catch (error) {
            console.error('Failed to initialize Home Assistant connection:', error);
            instance = null;
            throw error;
        }
    }
    return instance;
}
// Helper function to call Home Assistant services
export async function call_service(domain, service, data) {
    const hass = await get_hass();
    return hass.callService(domain, service, data);
}
// Helper function to list devices
export async function list_devices() {
    const hass = await get_hass();
    const states = await hass.getStates();
    return states.map((state) => ({
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes
    }));
}
// Helper function to get entity states
export async function get_states() {
    const hass = await get_hass();
    return hass.getStates();
}
// Helper function to get a specific entity state
export async function get_state(entity_id) {
    const hass = await get_hass();
    return hass.getState(entity_id);
}
