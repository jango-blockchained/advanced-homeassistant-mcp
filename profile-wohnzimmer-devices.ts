#!/usr/bin/env bun
/**
 * Aurora Wohnzimmer Device Profiling
 * Profiles all devices in the Wohnzimmer area for synchronization accuracy
 */

import { getAuroraManager } from './src/tools/aurora/manager.js';
import { logger } from './src/utils/logger.js';

interface ProfileData {
  entity_id: string;
  name: string;
  latency_ms: number;
  min_transition: number;
  max_transition: number;
  color_accuracy: number;
  brightness_linearity: number;
  calibration_method: string;
  timestamp: string;
}

async function profileAllWohnzimmerDevices() {
  console.log('🎨 Aurora Wohnzimmer Device Profiling\n');
  console.log('=' .repeat(60));
  
  try {
    const manager = await getAuroraManager();
    
    // Step 1: Scan for Wohnzimmer devices
    console.log('\n📍 Step 1: Scanning Wohnzimmer devices...\n');
    
    const scanResult = await manager.handleScanDevices({
      area: 'Wohnzimmer'
    });
    
    const devices = scanResult.devices;
    console.log(`✅ Found ${devices.length} devices in Wohnzimmer\n`);
    
    if (devices.length === 0) {
      console.log('❌ No devices found in Wohnzimmer area');
      return;
    }
    
    // Display device list
    console.log('📋 Devices to profile:');
    devices.forEach((dev, idx) => {
      console.log(`  ${idx + 1}. ${dev.name} (${dev.entityId})`);
    });
    console.log();
    
    // Step 2: Profile each device
    console.log('⏱️  Step 2: Profiling devices...\n');
    
    const profiles: ProfileData[] = [];
    const startTime = Date.now();
    
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      const progress = `[${i + 1}/${devices.length}]`;
      
      try {
        console.log(`${progress} Profiling: ${device.name}...`);
        
        const profile = await manager.handleProfileDevice({
          entity_id: device.entityId,
          iterations: 3
        });
        
        const profileData: ProfileData = {
          entity_id: device.entityId,
          name: device.name,
          latency_ms: profile.latencyMs ?? 0,
          min_transition: profile.minTransitionMs ?? 0,
          max_transition: profile.maxTransitionMs ?? 0,
          color_accuracy: (profile.colorAccuracy ?? 0) * 100,
          brightness_linearity: (profile.brightnessLinearity ?? 0) * 100,
          calibration_method: 'auto',
          timestamp: new Date().toISOString()
        };
        
        profiles.push(profileData);
        
        console.log(`   ✅ Latency: ${profileData.latency_ms}ms`);
        console.log(`   ✅ Transitions: ${profileData.min_transition}-${profileData.max_transition}s`);
        console.log(`   ✅ Color Accuracy: ${profileData.color_accuracy}%`);
        console.log(`   ✅ Brightness Linearity: ${profileData.brightness_linearity}%`);
        console.log();
        
      } catch (error) {
        console.log(`   ⚠️  Failed: ${error instanceof Error ? error.message : String(error)}`);
        console.log();
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // Step 3: Summary and Statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 PROFILING COMPLETE\n');
    
    console.log(`✅ Successfully profiled: ${profiles.length}/${devices.length} devices`);
    console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);
    
    if (profiles.length > 0) {
      const avgLatency = profiles.reduce((sum, p) => sum + p.latency_ms, 0) / profiles.length;
      const avgColorAccuracy = profiles.reduce((sum, p) => sum + p.color_accuracy, 0) / profiles.length;
      const avgBrightness = profiles.reduce((sum, p) => sum + p.brightness_linearity, 0) / profiles.length;
      
      console.log('\n📈 Statistics:');
      console.log(`   • Average Latency: ${avgLatency.toFixed(1)}ms`);
      console.log(`   • Average Color Accuracy: ${avgColorAccuracy.toFixed(1)}%`);
      console.log(`   • Average Brightness Linearity: ${avgBrightness.toFixed(1)}%`);
    }
    
    // Step 4: Detailed Results
    console.log('\n' + '='.repeat(60));
    console.log('📋 DETAILED RESULTS\n');
    
    profiles.forEach((profile, idx) => {
      console.log(`${idx + 1}. ${profile.name}`);
      console.log(`   Entity ID: ${profile.entity_id}`);
      console.log(`   Latency: ${profile.latency_ms}ms`);
      console.log(`   Transition Range: ${profile.min_transition}-${profile.max_transition}s`);
      console.log(`   Color Accuracy: ${profile.color_accuracy}%`);
      console.log(`   Brightness Linearity: ${profile.brightness_linearity}%`);
      console.log();
    });
    
    // Step 5: Recommendations
    console.log('='.repeat(60));
    console.log('💡 RECOMMENDATIONS\n');
    
    const highLatency = profiles.filter(p => p.latency_ms > 250);
    const lowAccuracy = profiles.filter(p => p.color_accuracy < 90);
    const lowBrightness = profiles.filter(p => p.brightness_linearity < 80);
    
    if (highLatency.length > 0) {
      console.log(`⚠️  High Latency Devices (>250ms):`);
      highLatency.forEach(p => {
        console.log(`   • ${p.name}: ${p.latency_ms}ms`);
      });
      console.log();
    }
    
    if (lowAccuracy.length > 0) {
      console.log(`⚠️  Lower Color Accuracy (<90%):`);
      lowAccuracy.forEach(p => {
        console.log(`   • ${p.name}: ${p.color_accuracy}%`);
      });
      console.log();
    }
    
    if (lowBrightness.length > 0) {
      console.log(`⚠️  Lower Brightness Linearity (<80%):`);
      lowBrightness.forEach(p => {
        console.log(`   • ${p.name}: ${p.brightness_linearity}%`);
      });
      console.log();
    }
    
    if (highLatency.length === 0 && lowAccuracy.length === 0 && lowBrightness.length === 0) {
      console.log('✅ All devices performing well! Ready for Aurora timeline creation.');
      console.log();
    }
    
    // Step 6: Next Steps
    console.log('=' .repeat(60));
    console.log('🎯 NEXT STEPS\n');
    console.log('1. Analyze audio file: aurora_analyze_audio(audio_file="/path/to/song.wav")');
    console.log('2. Render timeline: aurora_render_timeline(audio_file="...", devices=[...])');
    console.log('3. Play timeline: aurora_play_timeline(timeline_id="...")');
    console.log();
    
  } catch (error) {
    console.error('❌ Error during profiling:', error);
    process.exit(1);
  }
}

// Run the profiling
profileAllWohnzimmerDevices().then(() => {
  console.log('✅ Wohnzimmer device profiling completed successfully!\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Profiling failed:', error);
  process.exit(1);
});
