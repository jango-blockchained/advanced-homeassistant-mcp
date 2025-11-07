/**
 * Device Scanner Module
 * Discovers and catalogs Home Assistant light entities
 */

import type { HomeAssistantAPI } from '../../hass/api';
import type { LightDevice, DeviceCapabilities } from '../types';

export class DeviceScanner {
  private hassApi: HomeAssistantAPI;

  constructor(hassApi: HomeAssistantAPI) {
    this.hassApi = hassApi;
  }

  /**
   * Scan for all available light entities
   */
  async scanDevices(area?: string): Promise<LightDevice[]> {
    const devices: LightDevice[] = [];

    try {
      // Get all light entities from Home Assistant
      const states = await this.hassApi.getStates();
      const lightStates = states.filter(state => state.entity_id.startsWith('light.'));

      for (const state of lightStates) {
        // Filter by area if specified
        if (area) {
          const entityArea = await this.getEntityArea(state.entity_id);
          if (entityArea !== area) {
            continue;
          }
        }

        const device = await this.createDeviceInfo(state);
        devices.push(device);
      }

      return devices;
    } catch (error) {
      throw new Error(`Failed to scan devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed information about a specific device
   */
  async getDeviceInfo(entityId: string): Promise<LightDevice | null> {
    try {
      const state = await this.hassApi.getState(entityId);
      if (!state || !state.entity_id.startsWith('light.')) {
        return null;
      }

      return await this.createDeviceInfo(state);
    } catch (error) {
      return null;
    }
  }

  /**
   * Create device info from Home Assistant state
   */
  private async createDeviceInfo(state: any): Promise<LightDevice> {
    const capabilities = this.extractCapabilities(state);
    const area = await this.getEntityArea(state.entity_id);

    return {
      entityId: state.entity_id,
      name: state.attributes.friendly_name || state.entity_id,
      manufacturer: state.attributes.device_info?.manufacturer,
      model: state.attributes.device_info?.model,
      capabilities,
      area,
      state: state.state as 'on' | 'off' | 'unavailable',
    };
  }

  /**
   * Extract device capabilities from state attributes
   */
  private extractCapabilities(state: any): DeviceCapabilities {
    const attrs = state.attributes || {};
    
    // Modern Home Assistant uses supported_color_modes
    const colorModes = attrs.supported_color_modes || [];
    
    // Check for color support via color modes
    const supportsColor = colorModes.includes('hs') || 
                         colorModes.includes('rgb') || 
                         colorModes.includes('xy') ||
                         colorModes.includes('rgbw') ||
                         colorModes.includes('rgbww');
    
    const supportsColorTemp = colorModes.includes('color_temp');
    const supportsBrightness = colorModes.includes('brightness') ||
                               colorModes.length > 0; // Most modes support brightness
    
    // Fallback to legacy feature flags if color modes not available
    const supportedFeatures = attrs.supported_features || 0;
    const SUPPORT_BRIGHTNESS = 1;
    const SUPPORT_COLOR_TEMP = 2;
    const SUPPORT_EFFECT = 4;
    const SUPPORT_COLOR = 16;

    return {
      supportsBrightness: supportsBrightness || (supportedFeatures & SUPPORT_BRIGHTNESS) !== 0,
      supportsColorTemp: supportsColorTemp || (supportedFeatures & SUPPORT_COLOR_TEMP) !== 0,
      supportsColor: supportsColor || (supportedFeatures & SUPPORT_COLOR) !== 0,
      supportsEffects: (supportedFeatures & SUPPORT_EFFECT) !== 0,
      effects: attrs.effect_list || [],
      minMireds: attrs.min_mireds,
      maxMireds: attrs.max_mireds,
      minColorTempKelvin: attrs.min_color_temp_kelvin,
      maxColorTempKelvin: attrs.max_color_temp_kelvin,
      minBrightness: 0,
      maxBrightness: 255,
      colorModes: colorModes.length > 0 ? colorModes : undefined,
      currentColorMode: attrs.color_mode,
      brightnessPercentage: attrs.brightness ? Math.round((attrs.brightness / 255) * 100) : undefined,
      effectSpeed: attrs.effect_speed || undefined,
    };
  }

  /**
   * Get the area/zone for an entity
   */
  private async getEntityArea(entityId: string): Promise<string | undefined> {
    try {
      // Try to get area from entity registry
      const config = await this.hassApi.callService('config', 'core', {});
      // Note: This is a simplified version. Real implementation would query entity registry
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Group devices by area
   */
  async groupDevicesByArea(devices: LightDevice[]): Promise<Map<string, LightDevice[]>> {
    const grouped = new Map<string, LightDevice[]>();

    for (const device of devices) {
      const area = device.area || 'unassigned';
      if (!grouped.has(area)) {
        grouped.set(area, []);
      }
      grouped.get(area)!.push(device);
    }

    return grouped;
  }

  /**
   * Filter devices by capability
   */
  filterByCapability(
    devices: LightDevice[],
    capability: keyof DeviceCapabilities
  ): LightDevice[] {
    return devices.filter(device => device.capabilities[capability] === true);
  }

  /**
   * Get device statistics
   */
  getStatistics(devices: LightDevice[]): {
    total: number;
    available: number;
    supportsColor: number;
    supportsColorTemp: number;
    supportsBrightness: number;
    areas: number;
  } {
    const areas = new Set(devices.map(d => d.area).filter(Boolean));

    return {
      total: devices.length,
      available: devices.filter(d => d.state !== 'unavailable').length,
      supportsColor: devices.filter(d => d.capabilities.supportsColor).length,
      supportsColorTemp: devices.filter(d => d.capabilities.supportsColorTemp).length,
      supportsBrightness: devices.filter(d => d.capabilities.supportsBrightness).length,
      areas: areas.size,
    };
  }
}
