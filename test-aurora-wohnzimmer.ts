#!/usr/bin/env bun
/**
 * Test Aurora Profiling and Measurement for Wohnzimmer Lights
 * This script profiles and measures the lights in the living room
 */

import fetch from 'node-fetch';
import type { LightDevice, DeviceCapabilities } from './src/aurora/types';
import { DeviceProfiler } from './src/aurora/devices/profiler';
import { DeviceScanner } from './src/aurora/devices/scanner';

const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN || '';
const HASS_SOCKET_URL = process.env.HASS_SOCKET_URL || 'ws://homeassistant.local:8123/api/websocket';

// Home Assistant API wrapper
class HomeAssistantAPI {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getStates() {
    const response = await fetch(`${this.baseUrl}/api/states`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async getState(entityId: string) {
    const response = await fetch(`${this.baseUrl}/api/states/${entityId}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async callService(domain: string, service: string, serviceData: any) {
    const response = await fetch(
      `${this.baseUrl}/api/services/${domain}/${service}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      }
    );
    return response.json();
  }
}

async function main() {
  console.log('🎵 Aurora Wohnzimmer Profiling & Measurement');
  console.log('=' .repeat(50));
  console.log(`Home Assistant: ${HASS_HOST}`);
  console.log('');

  if (!HASS_TOKEN) {
    console.error('❌ Error: HASS_TOKEN environment variable not set');
    process.exit(1);
  }

  try {
    // Initialize Home Assistant API
    const hass = new HomeAssistantAPI(HASS_HOST, HASS_TOKEN);

    // Get all states
    console.log('📡 Fetching Home Assistant states...');
    const states = await hass.getStates() as any[];

    // Filter for Wohnzimmer (living room) lights
    const wohnzimmerLights = states.filter(
      (s) =>
        s.entity_id.startsWith('light.') &&
        (s.attributes.friendly_name?.toLowerCase().includes('wohnzimmer') ||
          s.attributes.area_id?.includes('wohnzimmer') ||
          s.entity_id.includes('wohnzimmer') ||
          s.entity_id.includes('living_room'))
    );

    console.log(`✅ Found ${wohnzimmerLights.length} light(s) in Wohnzimmer:`);
    console.log('');

    if (wohnzimmerLights.length === 0) {
      console.log('ℹ️  All lights in Home Assistant:');
      const allLights = states.filter((s) => s.entity_id.startsWith('light.'));
      allLights.forEach((light) => {
        console.log(
          `  - ${light.entity_id}: ${light.attributes.friendly_name || 'Unknown'} (${light.state})`
        );
      });
      console.log('');
      console.log('📝 Profiling all available lights instead...');
    }

    const lightsToProfile = wohnzimmerLights.length > 0 ? wohnzimmerLights : states.filter((s) => s.entity_id.startsWith('light.'));

    // Initialize profiler
    const profiler = new DeviceProfiler(
      (domain: string, service: string, data: any) => hass.callService(domain, service, data),
      (entityId: string) => hass.getState(entityId)
    );

    // Profile each light
    for (const lightState of lightsToProfile) {
      const entityId = lightState.entity_id;
      const friendlyName = lightState.attributes.friendly_name || entityId;

      console.log(`🔍 Profiling: ${friendlyName} (${entityId})`);
      console.log('-' .repeat(50));

      try {
        // Create LightDevice object
        const device: LightDevice = {
          entityId,
          name: friendlyName,
          state: (lightState.state === 'on' ? 'on' : (lightState.state === 'off' ? 'off' : 'unavailable')) as 'on' | 'off' | 'unavailable',
          manufacturer: lightState.attributes.device_info?.manufacturer,
          model: lightState.attributes.device_info?.model,
          capabilities: {
            supportsBrightness: lightState.attributes.brightness !== undefined,
            supportsColor: lightState.attributes.rgb_color !== undefined,
            supportsColorTemp: lightState.attributes.color_temp !== undefined,
            supportsEffects: lightState.attributes.effect_list !== undefined,
            effects: lightState.attributes.effect_list || [],
            colorModes: lightState.attributes.color_modes || [],
            minBrightness: 0,
            maxBrightness: 255,
            minMireds: lightState.attributes.min_color_temp_mired,
            maxMireds: lightState.attributes.max_color_temp_mired,
            minColorTempKelvin: lightState.attributes.min_kelvin,
            maxColorTempKelvin: lightState.attributes.max_kelvin,
          } as DeviceCapabilities,
        };

        console.log(`  📊 Capabilities:`);
        console.log(`    - Brightness: ${device.capabilities.supportsBrightness ? '✅' : '❌'}`);
        console.log(`    - Color: ${device.capabilities.supportsColor ? '✅' : '❌'}`);
        console.log(`    - Color Temp: ${device.capabilities.supportsColorTemp ? '✅' : '❌'}`);
        console.log(`    - Effects: ${device.capabilities.supportsEffects ? '✅' : '❌'}`);
        console.log('');

        // Profile the device
        console.log('  ⏱️  Running profiling tests (3 iterations)...');
        const profile = await profiler.profileDevice(device, 3);

        console.log(`  ✅ Profiling complete!`);
        console.log('  📈 Results:');
        console.log(`    - Response Latency: ${profile.latencyMs?.toFixed(2)}ms`);
        console.log(`    - Min Transition: ${profile.minTransitionMs?.toFixed(2)}ms`);
        console.log(`    - Max Transition: ${profile.maxTransitionMs?.toFixed(2)}ms`);
        console.log(`    - Color Accuracy: ${profile.colorAccuracy ? (profile.colorAccuracy * 100).toFixed(2) : 'N/A'}%`);
        console.log(`    - Brightness Linearity: ${profile.brightnessLinearity ? (profile.brightnessLinearity * 100).toFixed(2) : 'N/A'}%`);
        console.log(`    - Last Calibrated: ${profile.lastCalibrated}`);
        console.log(`    - Calibration Method: ${profile.calibrationMethod}`);
        console.log('');
      } catch (error) {
        console.error(
          `  ❌ Profiling failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log('');
      }
    }

    console.log('=' .repeat(50));
    console.log('✅ Aurora profiling complete!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
