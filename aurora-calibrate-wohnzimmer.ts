#!/usr/bin/env bun
/**
 * Aurora Wohnzimmer Comprehensive Calibration & Measurement
 * This tool profiles all Wohnzimmer lights and stores results
 */

import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';

const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN || '';
const PROFILES_DIR = path.join(process.cwd(), 'aurora-profiles');

interface LightState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

async function ensureProfilesDir() {
  try {
    await fs.mkdir(PROFILES_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

async function getStates(): Promise<LightState[]> {
  try {
    const response = await fetch(`${HASS_HOST}/api/states`, {
      headers: {
        Authorization: `Bearer ${HASS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as any[];
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
}

async function callService(domain: string, service: string, data: any) {
  try {
    const response = await fetch(
      `${HASS_HOST}/api/services/${domain}/${service}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HASS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function profileDevice(entityId: string, friendlyName: string, capabilities: any) {
  console.log(`\n⏱️  Profiling: ${friendlyName} (${entityId})`);
  console.log('─'.repeat(60));

  const measurements: any[] = [];
  const iterations = 3;

  // Test 1: Latency Test
  console.log(`  📊 Test 1: Response Latency (${iterations} iterations)`);
  for (let i = 0; i < iterations; i++) {
    try {
      // Turn off
      await callService('light', 'turn_off', { entity_id: entityId });
      await new Promise(resolve => setTimeout(resolve, 200));

      // Measure on latency
      const startTime = Date.now();
      await callService('light', 'turn_on', { entity_id: entityId });
      
      // Wait a bit for response
      await new Promise(resolve => setTimeout(resolve, 100));
      const latency = Date.now() - startTime;
      measurements.push({ type: 'latency', value: latency, iteration: i + 1 });
      console.log(`    ✓ Iteration ${i + 1}: ${latency}ms`);
    } catch (e) {
      console.log(`    ✗ Iteration ${i + 1}: Failed`);
    }
  }

  // Test 2: Brightness Linearity (if supported)
  if (capabilities.supportsBrightness) {
    console.log(`\n  📊 Test 2: Brightness Linearity (5 steps)`);
    const steps = [50, 100, 150, 200, 255];
    for (const brightness of steps) {
      try {
        const startTime = Date.now();
        await callService('light', 'turn_on', { 
          entity_id: entityId,
          brightness,
          transition: 0.1,
        });
        const time = Date.now() - startTime;
        measurements.push({ 
          type: 'brightness', 
          input: brightness, 
          time,
        });
        console.log(`    ✓ Brightness ${brightness}: ${time}ms`);
      } catch (e) {
        console.log(`    ✗ Brightness ${brightness}: Failed`);
      }
    }
  }

  // Test 3: Color Test (if supported)
  if (capabilities.supportsColor) {
    console.log(`\n  📊 Test 3: Color Support`);
    try {
      const startTime = Date.now();
      await callService('light', 'turn_on', { 
        entity_id: entityId,
        rgb_color: [255, 0, 0], // Red
        transition: 0.1,
      });
      const time = Date.now() - startTime;
      measurements.push({ type: 'color_response', value: time });
      console.log(`    ✓ Red: ${time}ms`);

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const startTime2 = Date.now();
      await callService('light', 'turn_on', { 
        entity_id: entityId,
        rgb_color: [0, 255, 0], // Green
        transition: 0.1,
      });
      const time2 = Date.now() - startTime2;
      measurements.push({ type: 'color_response', value: time2 });
      console.log(`    ✓ Green: ${time2}ms`);
    } catch (e) {
      console.log(`    ✗ Color test failed`);
    }
  }

  // Test 4: Effects Test
  if (capabilities.supportsEffects && capabilities.effects?.length) {
    console.log(`\n  📊 Test 4: Effects (Testing up to 3 effects)`);
    const effectsToTest = (capabilities.effects || []).slice(0, 3);
    for (const effect of effectsToTest) {
      try {
        const startTime = Date.now();
        await callService('light', 'turn_on', { 
          entity_id: entityId,
          effect,
        });
        const time = Date.now() - startTime;
        measurements.push({ type: 'effect', effect, time });
        console.log(`    ✓ ${effect}: ${time}ms`);
      } catch (e) {
        console.log(`    ✗ ${effect}: Failed`);
      }
    }
  }

  // Test 5: Transition Speed
  console.log(`\n  📊 Test 5: Transition Speed`);
  try {
    // Ensure light is on
    await callService('light', 'turn_on', { entity_id: entityId, brightness: 50 });
    await new Promise(resolve => setTimeout(resolve, 100));

    // Transition to full brightness
    const startTime = Date.now();
    await callService('light', 'turn_on', { 
      entity_id: entityId,
      brightness: 255,
      transition: 1, // 1 second transition
    });
    const time = Date.now() - startTime;
    measurements.push({ type: 'transition', duration: 1, time });
    console.log(`    ✓ 1s transition: ${time}ms to execute`);
  } catch (e) {
    console.log(`    ✗ Transition test failed`);
  }

  // Calculate statistics
  const latencies = measurements.filter(m => m.type === 'latency').map(m => m.value);
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;

  const profile = {
    entity_id: entityId,
    friendly_name: friendlyName,
    timestamp: new Date().toISOString(),
    capabilities: {
      brightness: capabilities.supportsBrightness,
      color: capabilities.supportsColor,
      color_temp: capabilities.supportsColorTemp,
      effects: capabilities.supportsEffects,
      effects_count: capabilities.effects?.length || 0,
    },
    measurements: {
      latency_ms: {
        avg: avgLatency.toFixed(2),
        min: minLatency.toFixed(2),
        max: maxLatency.toFixed(2),
        samples: latencies.length,
      },
      tests_run: measurements.length,
    },
    raw_measurements: measurements,
  };

  console.log(`\n  📈 Summary:`);
  console.log(`    • Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`    • Min Latency: ${minLatency.toFixed(2)}ms`);
  console.log(`    • Max Latency: ${maxLatency.toFixed(2)}ms`);
  console.log(`    • Total Tests: ${measurements.length}`);

  // Save profile
  const profileFile = path.join(PROFILES_DIR, `${entityId.replace('.', '_')}_profile.json`);
  await fs.writeFile(profileFile, JSON.stringify(profile, null, 2));
  console.log(`    ✅ Saved to: ${path.basename(profileFile)}`);

  return profile;
}

async function main() {
  console.log('🎵 Aurora Wohnzimmer Calibration & Measurement Tool');
  console.log('='.repeat(60));
  console.log(`Home Assistant: ${HASS_HOST}`);
  console.log(`Profiles Directory: ${PROFILES_DIR}`);
  console.log('');

  if (!HASS_TOKEN) {
    console.error('❌ Error: HASS_TOKEN not set');
    process.exit(1);
  }

  await ensureProfilesDir();

  const states = await getStates();
  if (states.length === 0) {
    console.error('❌ Could not fetch Home Assistant states');
    process.exit(1);
  }

  // Find Wohnzimmer lights
  const allLights = states.filter(s => s.entity_id.startsWith('light.')) as LightState[];
  const wohnzimmerLights = allLights.filter(
    s =>
      s.attributes.friendly_name?.toLowerCase().includes('wohnzimmer') ||
      s.attributes.area_id?.toLowerCase().includes('wohnzimmer') ||
      s.entity_id.toLowerCase().includes('wohnzimmer')
  );

  console.log(`🏠 Found ${wohnzimmerLights.length} Wohnzimmer lights`);
  console.log('');

  const profiles: any[] = [];

  for (const light of wohnzimmerLights) {
    const capabilities = {
      supportsBrightness: light.attributes.brightness !== undefined,
      supportsColor: light.attributes.rgb_color !== undefined,
      supportsColorTemp: light.attributes.color_temp !== undefined,
      supportsEffects: light.attributes.effect_list !== undefined,
      effects: light.attributes.effect_list || [],
    };

    try {
      const profile = await profileDevice(
        light.entity_id,
        light.attributes.friendly_name || light.entity_id,
        capabilities
      );
      profiles.push(profile);
    } catch (error) {
      console.error(`❌ Failed to profile ${light.entity_id}:`, error);
    }

    // Small delay between profiles
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Save summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Calibration Complete!');
  console.log(`\n✅ Profiled ${profiles.length} lights`);
  
  const summaryFile = path.join(PROFILES_DIR, 'wohnzimmer_calibration_summary.json');
  const summary = {
    timestamp: new Date().toISOString(),
    location: 'Wohnzimmer',
    lights_profiled: profiles.length,
    profiles: profiles.map(p => ({
      entity_id: p.entity_id,
      friendly_name: p.friendly_name,
      avg_latency_ms: p.measurements.latency_ms.avg,
    })),
  };
  await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`✅ Summary saved to: ${path.basename(summaryFile)}`);

  // Turn lights back to previous state
  console.log('\n🔄 Restoring lights to previous state...');
  for (const light of wohnzimmerLights) {
    if (light.state === 'on') {
      await callService('light', 'turn_on', { entity_id: light.entity_id });
    } else if (light.state === 'off') {
      await callService('light', 'turn_off', { entity_id: light.entity_id });
    }
  }
  console.log('✅ Done!');
}

main().catch(console.error);
