#!/usr/bin/env bun
/**
 * Aurora Wohnzimmer Light Profiling Tool
 * Interactive tool to discover and profile lights
 */

import fetch from 'node-fetch';

const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN || '';

async function getStates() {
  try {
    const response = await fetch(`${HASS_HOST}/api/states`, {
      headers: {
        Authorization: `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json() as any[];
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
}

async function main() {
  console.log('🎵 Aurora Wohnzimmer Light Discovery');
  console.log('=' .repeat(60));
  console.log(`Home Assistant: ${HASS_HOST}`);
  console.log('');

  const states = await getStates();
  
  if (states.length === 0) {
    console.error('❌ Could not fetch Home Assistant states');
    process.exit(1);
  }

  // Find all lights
  const allLights = states.filter((s) => s.entity_id.startsWith('light.'));
  
  // Filter for Wohnzimmer lights
  const wohnzimmerLights = allLights.filter(
    (s) =>
      s.attributes.friendly_name?.toLowerCase().includes('wohnzimmer') ||
      s.attributes.area_id?.toLowerCase().includes('wohnzimmer') ||
      s.entity_id.toLowerCase().includes('wohnzimmer')
  );

  console.log(`📊 Light Discovery Results:`);
  console.log(`  Total lights in Home Assistant: ${allLights.length}`);
  console.log(`  Wohnzimmer lights found: ${wohnzimmerLights.length}`);
  console.log('');

  if (wohnzimmerLights.length > 0) {
    console.log('🏠 Wohnzimmer Lights:');
    wohnzimmerLights.forEach((light, idx) => {
      const attrs = light.attributes;
      console.log(`  ${idx + 1}. ${attrs.friendly_name || light.entity_id}`);
      console.log(`     Entity ID: ${light.entity_id}`);
      console.log(`     State: ${light.state}`);
      console.log(`     Brightness: ${attrs.brightness ? '✅' : '❌'}`);
      console.log(`     Color: ${attrs.rgb_color ? '✅' : '❌'}`);
      console.log(`     Color Temp: ${attrs.color_temp ? '✅' : '❌'}`);
      console.log(`     Effects: ${attrs.effect_list?.length || 0} effects`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No Wohnzimmer-specific lights found.');
    console.log('  All Available Lights:');
    allLights.forEach((light, idx) => {
      const attrs = light.attributes;
      if (idx < 10) {
        console.log(`  ${idx + 1}. ${attrs.friendly_name || light.entity_id} (${light.entity_id})`);
      }
    });
    if (allLights.length > 10) {
      console.log(`  ... and ${allLights.length - 10} more lights`);
    }
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('Aurora Profiling Setup:');
  console.log('  Use aurora_profile_device tool with entity_id to profile lights');
  console.log('  Available tools:');
  console.log('    • aurora_scan_devices     - Find devices by area/capability');
  console.log('    • aurora_profile_device   - Profile a device for Aurora');
  console.log('    • aurora_analyze_audio    - Analyze audio for sync');
  console.log('    • aurora_render_timeline  - Generate light sync timeline');
  console.log('    • aurora_execute_timeline - Run the timeline');
}

main();
