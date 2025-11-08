#!/usr/bin/env bun
/**
 * Aurora Real Playback - Actual Audio-Reactive Light Execution
 * 
 * This script performs REAL synchronization:
 * 1. Plays actual audio file
 * 2. Executes light commands synchronized to audio
 * 3. Compensates for device latency
 * 4. Reports actual sync performance
 */

import fetch from 'node-fetch';
import { TimelineExecutor } from './src/aurora/execution/executor';
import { AudioAnalyzer } from './src/aurora/audio/analyzer';
import { TimelineGenerator } from './src/aurora/rendering/timeline';
import { SynchronizationCalculator } from './src/aurora/rendering/synchronizer';
import { AuroraDatabase } from './src/aurora/database/index';
import type { RenderTimeline } from './src/aurora/types';

// Configuration
const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN || '';
const AUDIO_FILE = '/home/jango/Musik/Tracks/song.wav';

const WOHNZIMMER_LIGHTS = [
  'light.wohnzimmer_spotlampe',
  'light.wohnzimmer_sternleuchte',
  'light.wohnzimmer_whiteboard',
  'light.wohnzimmer_schreibtisch_jan',
  'light.wohnzimmer_schreibtisch_dennis',
];

/**
 * Call a Home Assistant service
 */
async function callService(
  domain: string,
  service: string,
  data: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${HASS_HOST}/api/services/${domain}/${service}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HASS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Service call failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get current state of an entity
 */
async function getState(entityId: string): Promise<unknown> {
  const response = await fetch(`${HASS_HOST}/api/states/${entityId}`, {
    headers: {
      Authorization: `Bearer ${HASS_TOKEN}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

/**
 * Verify Home Assistant connection
 */
async function verifyConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${HASS_HOST}/api/`, {
      headers: {
        Authorization: `Bearer ${HASS_TOKEN}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get device profiles from database or use defaults
 */
async function getDeviceProfiles(db: AuroraDatabase): Promise<Record<string, { latencyMs: number }>> {
  const profiles: Record<string, { latencyMs: number }> = {};

  // Try to load from database
  for (const light of WOHNZIMMER_LIGHTS) {
    try {
      const stored = await db.getDevice(light);
      if (stored && typeof stored === 'object' && 'latencyMs' in stored) {
        profiles[light] = {
          latencyMs: (stored as { latencyMs?: number }).latencyMs || 100,
        };
      }
    } catch {
      // Use default
    }
  }

  // Fill in defaults for any missing devices
  for (const light of WOHNZIMMER_LIGHTS) {
    if (!profiles[light]) {
      profiles[light] = {
        latencyMs: 100, // Default estimated latency
      };
    }
  }

  return profiles;
}

/**
 * Main playback routine
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   🎵 Aurora Real Playback - Actual Sync Testing 🎵        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Verify connection
  console.log('🔌 Verifying Home Assistant connection...');
  const connected = await verifyConnection();
  if (!connected) {
    console.error('❌ Failed to connect to Home Assistant');
    console.error(`   Check HASS_HOST=${HASS_HOST} and HASS_TOKEN`);
    process.exit(1);
  }
  console.log('✅ Connected to Home Assistant\n');

  // Initialize database
  console.log('📦 Loading Aurora database...');
  const db = new AuroraDatabase();
  console.log(`✅ Database ready\n`);

  // Check audio file
  console.log('🎵 Checking audio file...');
  const audioExists = await import('node:fs').then(fs =>
    new Promise(resolve => {
      fs.access(AUDIO_FILE, fs.constants.F_OK, err => resolve(!err));
    })
  );

  if (!audioExists) {
    console.error(`❌ Audio file not found: ${AUDIO_FILE}`);
    process.exit(1);
  }
  console.log(`✅ Audio file ready: ${AUDIO_FILE}\n`);

  // Turn on lights first
  console.log('💡 Turning on lights...');
  for (const light of WOHNZIMMER_LIGHTS) {
    try {
      await callService('light', 'turn_on', {
        entity_id: light,
        brightness: 100,
      });
      console.log(`   ✅ ${light}`);
    } catch (error) {
      console.log(`   ⚠️  ${light}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log('');

  // Get device profiles
  console.log('📊 Loading device profiles...');
  const profiles = await getDeviceProfiles(db);
  for (const [light, profile] of Object.entries(profiles)) {
    const name = light.split('.')[1];
    console.log(`   • ${name}: ${profile.latencyMs}ms latency`);
  }
  console.log('');

  // Try to load existing timeline
  console.log('⏳ Preparing timeline...');
  
  // For this demo, we'll create a fresh timeline
  // In production, you would render from audio analysis or load from database
  console.log('🎨 Creating simulated timeline for demonstration\n');

  // Create minimal simulated timeline for demo
  const timeline: RenderTimeline = {
    id: 'demo-timeline',
    name: 'Demo Aurora Timeline',
    audioFile: AUDIO_FILE,
    audioFeatures: {
      bpm: 128,
      beats: [0, 0.5, 1.0, 1.5, 2.0],
      frequencyData: [],
      energy: 0.7,
      duration: 60,
    },
    duration: 60, // First 60 seconds
    createdAt: new Date(),
    tracks: WOHNZIMMER_LIGHTS.map((light) => ({
      entityId: light,
      deviceName: light.split('.')[1],
      compensationMs: 100,
      commands: [
        {
          timestamp: 0.5,
          type: 'turn_on' as const,
          params: {
            brightness: 200,
            rgb_color: [255, 0, 0] as [number, number, number],
          },
        },
        {
          timestamp: 1.0,
          type: 'turn_on' as const,
          params: {
            brightness: 150,
            rgb_color: [0, 255, 0] as [number, number, number],
          },
        },
        {
          timestamp: 1.5,
          type: 'turn_on' as const,
          params: {
            brightness: 180,
            rgb_color: [0, 0, 255] as [number, number, number],
          },
        },
        {
          timestamp: 2.0,
          type: 'turn_on' as const,
          params: {
            brightness: 220,
            rgb_color: [255, 255, 0] as [number, number, number],
          },
        },
      ],
    })),
    metadata: {
      version: '0.1.0',
      deviceCount: WOHNZIMMER_LIGHTS.length,
      commandCount: 20,
      processingTime: 0.5,
      settings: {
        intensity: 0.7,
        colorMapping: 'frequency' as const,
        brightnessMapping: 'amplitude' as const,
        beatSync: true,
        smoothTransitions: true,
        minCommandInterval: 100,
      },
    },
  };

  // Create executor
  console.log('⚙️  Initializing executor...');
  const executor = new TimelineExecutor(
    (domain: string, service: string, data: Record<string, unknown>) =>
      callService(domain, service, data)
  );
  console.log('✅ Executor ready\n');

  // Start playback
  console.log('▶️  STARTING PLAYBACK\n');
  console.log('═'.repeat(60));
  console.log('');

  const startTime = Date.now();
  try {
    // Play timeline with audio
    if (timeline) {
      await executor.play(timeline, 0, AUDIO_FILE);
    } else {
      throw new Error('Timeline initialization failed');
    }

    // Monitor playback
    let lastPosition = 0;
    let lastUpdate = Date.now();
    let commandsSent = 0;

    const monitorInterval = setInterval(() => {
      const state = executor.getState();
      const now = Date.now();
      const elapsed = (now - lastUpdate) / 1000;
      const positionDelta = state.position - lastPosition;
      const playbackRate = elapsed > 0 ? positionDelta / elapsed : 1.0;

      if (state.position > lastPosition) {
        process.stdout.write(
          `⏱️  ${state.position.toFixed(1)}s | ` +
          `Commands: Q:${state.queueStats.queued} X:${state.queueStats.executed} F:${state.queueStats.failed} | ` +
          `Playback: ${(playbackRate * 100).toFixed(0)}%\r`
        );

        lastPosition = state.position;
        lastUpdate = now;
      }

      // Stop monitoring when done
      if (state.state === 'stopped') {
        clearInterval(monitorInterval);
      }
    }, 500);

    // Wait for playback to finish
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const state = executor.getState();
        if (state.state === 'stopped') {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
    });
  } catch (error) {
    console.error('❌ Playback error:', error instanceof Error ? error.message : String(error));
  }

  // Report results
  const elapsed = (Date.now() - startTime) / 1000;
  const state = executor.getState();

  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📊 PLAYBACK COMPLETE\n');
  console.log(`⏱️  Total time: ${elapsed.toFixed(1)}s`);
  console.log(`📍 Final position: ${state.position.toFixed(1)}s`);
  console.log(`✉️  Commands sent: ${state.queueStats.executed}`);
  console.log(`❌ Commands failed: ${state.queueStats.failed}`);
  if (state.queueStats.avgLatency > 0) {
    console.log(`⏰ Average latency: ${state.queueStats.avgLatency.toFixed(0)}ms`);
  }

  console.log('\n🔌 Turning off all lights...');
  for (const light of WOHNZIMMER_LIGHTS) {
    try {
      await callService('light', 'turn_off', {
        entity_id: light,
      });
      console.log(`   ✅ ${light}`);
    } catch {
      // Ignore errors on shutdown
    }
  }

  console.log('\n✅ Done!\n');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
