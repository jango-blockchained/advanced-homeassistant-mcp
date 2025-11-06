import type { HassEntity } from "../interfaces/hass.js";
import { logger } from "../utils/logger.js";

class HomeAssistantAPI {
  private baseUrl: string;
  private token: string;
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_MAX_SIZE = 100; // Prevent memory leaks

  constructor() {
    this.baseUrl = process.env.HASS_HOST || "http://localhost:8123";
    this.token = process.env.HASS_TOKEN || "";

    if (!this.token || this.token === "your_hass_token_here") {
      throw new Error("HASS_TOKEN is required but not set in environment variables");
    }

    logger.info(`Initializing Home Assistant API with base URL: ${this.baseUrl}`);
    logger.info(`Token loaded: ${this.token ? `yes (${this.token.length} chars)` : "no"}`);
  }

  private getCache<T>(key: string, ttlMs: number = 30000): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttlMs) {
      return entry.data as T;
    }
    // Remove expired entry
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    // Implement LRU cache to prevent memory leaks
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/api/${endpoint}`;
    logger.debug(`Making request to: ${url}`);
    
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
        logger.error('Home Assistant API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Home Assistant API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      logger.debug('Response received successfully');
      return data;
    } catch (error) {
      logger.error('Failed to make request:', error);
      throw error;
    }
  }

  async getStates(): Promise<HassEntity[]> {
    // Check cache first (30 second TTL for device states)
    const cached = this.getCache<HassEntity[]>("states", 30000);
    if (cached) {
      return cached;
    }

    const data = await this.fetchApi("states");
    const states = data as HassEntity[];
    this.setCache("states", states);
    return states;
  }

  async getState(entityId: string): Promise<HassEntity> {
    // Check cache first (10 second TTL for individual states)
    const cached = this.getCache<HassEntity>(`state_${entityId}`, 10000);
    if (cached) {
      return cached;
    }

    const data = await this.fetchApi(`states/${entityId}`);
    const state = data as HassEntity;
    this.setCache(`state_${entityId}`, state);
    return state;
  }

  async callService(domain: string, service: string, data: Record<string, unknown>): Promise<void> {
    await this.fetchApi(`services/${domain}/${service}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    // Clear related states cache when services are called as they may change state
    this.cache.delete("states");
    // Also clear individual state caches that might be affected
    for (const key of this.cache.keys()) {
      if (key.startsWith("state_")) {
        this.cache.delete(key);
      }
    }
  }
}

let instance: HomeAssistantAPI | null = null;

export async function get_hass(): Promise<HomeAssistantAPI> {
  if (!instance) {
    try {
      instance = new HomeAssistantAPI();
      // Verify connection by trying to get states
      await instance.getStates();
      logger.info('Successfully connected to Home Assistant');
    } catch (error) {
      logger.error('Failed to initialize Home Assistant connection:', error);
      instance = null;
      throw error;
    }
  }
  return instance;
}

// Helper function to call Home Assistant services
export async function call_service(
  domain: string,
  service: string,
  data: Record<string, unknown>,
): Promise<void> {
  const hass = await get_hass();
  return hass.callService(domain, service, data);
}

// Helper function to list devices
export async function list_devices(): Promise<Array<{ entity_id: string; state: string; attributes: unknown }>> {
  const hass = await get_hass();
  const states = await hass.getStates();
  return states.map((state: HassEntity) => ({
    entity_id: state.entity_id,
    state: state.state,
    attributes: state.attributes
  }));
}

// Helper function to get entity states
export async function get_states(): Promise<HassEntity[]> {
  const hass = await get_hass();
  return hass.getStates();
}

// Helper function to get a specific entity state
export async function get_state(entity_id: string): Promise<HassEntity> {
  const hass = await get_hass();
  return hass.getState(entity_id);
}
