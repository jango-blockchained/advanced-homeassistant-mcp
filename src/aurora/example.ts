/**
 * Aurora Complete Workflow Example
 * Demonstrates the full pipeline from audio analysis to playback
 */

import {
  AudioCapture,
  AudioAnalyzer,
  DeviceScanner,
  DeviceProfiler,
  TimelineGenerator,
  TimelineExecutor,
  DEFAULT_CONFIG,
} from './index';
import type { LightDevice, DeviceProfile, RenderSettings } from './types';

/**
 * Complete Aurora workflow example
 */
export class AuroraWorkflow {
  private hassApi: any;

  constructor(hassApi: any) {
    this.hassApi = hassApi;
  }

  /**
   * Full workflow: Analyze audio, profile devices, render, and play
   */
  async runCompleteWorkflow(audioFilePath: string): Promise<void> {
    console.log('=== Aurora Complete Workflow ===\n');

    // Step 1: Load and analyze audio
    console.log('Step 1: Analyzing audio...');
    const audioCapture = new AudioCapture(
      DEFAULT_CONFIG.audio.sampleRate,
      1 // Mono
    );
    const audioBuffer = await audioCapture.loadFromFile(audioFilePath);
    console.log(`✓ Loaded audio: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz`);

    const analyzer = new AudioAnalyzer(
      DEFAULT_CONFIG.audio.fftSize,
      DEFAULT_CONFIG.audio.hopSize,
      audioBuffer.sampleRate
    );
    const audioFeatures = await analyzer.analyze(audioBuffer);
    console.log(`✓ Analysis complete:`);
    console.log(`  - BPM: ${audioFeatures.bpm}`);
    console.log(`  - Beats: ${audioFeatures.beats.length}`);
    console.log(`  - Mood: ${audioFeatures.mood}`);
    console.log(`  - Energy: ${audioFeatures.energy.toFixed(2)}`);
    console.log(`  - Frequency slices: ${audioFeatures.frequencyData.length}\n`);

    // Step 2: Scan for devices
    console.log('Step 2: Scanning for light devices...');
    const scanner = new DeviceScanner(this.hassApi);
    const devices = await scanner.scanDevices();
    console.log(`✓ Found ${devices.length} light devices`);
    
    const stats = scanner.getStatistics(devices);
    console.log(`  - Available: ${stats.available}`);
    console.log(`  - RGB Color: ${stats.supportsColor}`);
    console.log(`  - Color Temp: ${stats.supportsColorTemp}`);
    console.log(`  - Brightness: ${stats.supportsBrightness}\n`);

    // Step 3: Profile devices (only unprofiled ones)
    console.log('Step 3: Profiling devices...');
    const profiler = new DeviceProfiler(
      this.hassApi.callService.bind(this.hassApi),
      this.hassApi.getState.bind(this.hassApi)
    );
    
    const profiles = new Map<string, DeviceProfile>();
    let profiledCount = 0;
    
    for (const device of devices.slice(0, 3)) { // Profile first 3 for demo
      console.log(`  Profiling ${device.name}...`);
      try {
        const profile = await profiler.profileDevice(device, 2); // 2 iterations
        profiles.set(device.entityId, profile);
        profiledCount++;
        console.log(`  ✓ ${device.name}: ${profile.latencyMs}ms latency`);
      } catch (error) {
        console.log(`  ✗ Failed to profile ${device.name}`);
      }
    }
    console.log(`✓ Profiled ${profiledCount} devices\n`);

    // Step 4: Generate timeline
    console.log('Step 4: Generating timeline...');
    const renderSettings: RenderSettings = {
      ...DEFAULT_CONFIG.rendering,
      intensity: 0.8,
      beatSync: true,
      smoothTransitions: true,
    };

    const generator = new TimelineGenerator(renderSettings);
    const timeline = await generator.generateTimeline(
      audioFeatures,
      devices,
      profiles,
      renderSettings,
      {
        name: `Aurora Timeline - ${new Date().toISOString()}`,
        audioFile: audioFilePath,
      }
    );

    console.log(`✓ Timeline generated:`);
    console.log(`  - ID: ${timeline.id}`);
    console.log(`  - Duration: ${timeline.duration.toFixed(2)}s`);
    console.log(`  - Devices: ${timeline.tracks.length}`);
    console.log(`  - Total commands: ${timeline.metadata.commandCount}`);
    console.log(`  - Commands/second: ${(timeline.metadata.commandCount / timeline.duration).toFixed(2)}`);
    console.log(`  - Processing time: ${timeline.metadata.processingTime.toFixed(2)}s\n`);

    // Show per-device stats
    const stats2 = generator.getTimelineStats(timeline);
    console.log('Per-device command breakdown:');
    for (const deviceStats of stats2.commandsPerDevice.slice(0, 5)) {
      console.log(`  - ${deviceStats.deviceName}: ${deviceStats.commandCount} commands (${deviceStats.compensationMs}ms compensation)`);
    }
    console.log();

    // Step 5: Optimize timeline
    console.log('Step 5: Optimizing timeline...');
    const optimizedTimeline = generator.optimizeTimeline(timeline);
    const commandsRemoved = timeline.metadata.commandCount - optimizedTimeline.metadata.commandCount;
    console.log(`✓ Removed ${commandsRemoved} redundant commands`);
    console.log(`  New total: ${optimizedTimeline.metadata.commandCount} commands\n`);

    // Step 6: Execute timeline
    console.log('Step 6: Starting playback...');
    const executor = new TimelineExecutor(
      this.hassApi.callService.bind(this.hassApi)
    );

    // Play timeline (in reality, this would be async and run in background)
    await executor.play(optimizedTimeline);
    console.log('✓ Playback started!\n');

    // Monitor playback (example - would run in a loop)
    this.monitorPlayback(executor, 5); // Monitor for 5 iterations

    console.log('=== Workflow Complete ===');
  }

  /**
   * Monitor playback status
   */
  private monitorPlayback(executor: TimelineExecutor, iterations: number): void {
    let count = 0;
    const interval = setInterval(() => {
      const state = executor.getState();
      const stats = executor.getQueueStats();
      
      console.log(`[Playback] Position: ${state.position.toFixed(2)}s | ` +
                  `Executed: ${stats.executed} | Failed: ${stats.failed} | ` +
                  `Pending: ${executor.getPendingCommandsCount()}`);
      
      count++;
      if (count >= iterations || state.state === 'stopped') {
        clearInterval(interval);
        if (count >= iterations) {
          executor.stop();
          console.log('Playback stopped (demo limit reached)');
        }
      }
    }, 1000);
  }

  /**
   * Quick test: Analyze audio only
   */
  async analyzeAudioOnly(audioFilePath: string): Promise<void> {
    const capture = new AudioCapture();
    const analyzer = new AudioAnalyzer();
    
    const audioBuffer = await capture.loadFromFile(audioFilePath);
    const features = await analyzer.analyze(audioBuffer);
    
    console.log('Audio Analysis Results:');
    console.log(`  Duration: ${features.duration.toFixed(2)}s`);
    console.log(`  BPM: ${features.bpm}`);
    console.log(`  Beats: ${features.beats.length}`);
    console.log(`  Energy: ${features.energy.toFixed(2)}`);
    console.log(`  Mood: ${features.mood}`);
    
    // Show first few beats
    console.log('  First 5 beats (seconds):');
    features.beats.slice(0, 5).forEach((beat, i) => {
      console.log(`    ${i + 1}. ${beat.toFixed(3)}s`);
    });
  }

  /**
   * Quick test: Scan and profile devices only
   */
  async scanAndProfileOnly(): Promise<void> {
    const scanner = new DeviceScanner(this.hassApi);
    const devices = await scanner.scanDevices();
    
    console.log(`Found ${devices.length} devices:`);
    devices.slice(0, 10).forEach((device, i) => {
      console.log(`  ${i + 1}. ${device.name} (${device.entityId})`);
      console.log(`     Color: ${device.capabilities.supportsColor}, ` +
                  `Brightness: ${device.capabilities.supportsBrightness}, ` +
                  `State: ${device.state}`);
    });

    // Profile one device as example
    if (devices.length > 0) {
      console.log('\nProfiling first device...');
      const profiler = new DeviceProfiler(
        this.hassApi.callService.bind(this.hassApi),
        this.hassApi.getState.bind(this.hassApi)
      );
      
      const profile = await profiler.profileDevice(devices[0]);
      console.log('Profile results:');
      console.log(`  Latency: ${profile.latencyMs}ms`);
      console.log(`  Transition range: ${profile.minTransitionMs}-${profile.maxTransitionMs}ms`);
      console.log(`  Calibration method: ${profile.calibrationMethod}`);
    }
  }

  /**
   * Generate and export timeline without execution
   */
  async generateTimelineOnly(
    audioFilePath: string,
    outputPath?: string
  ): Promise<void> {
    // Analyze audio
    const capture = new AudioCapture();
    const analyzer = new AudioAnalyzer();
    const audioBuffer = await capture.loadFromFile(audioFilePath);
    const features = await analyzer.analyze(audioBuffer);

    // Get devices
    const scanner = new DeviceScanner(this.hassApi);
    const devices = await scanner.scanDevices();

    // Generate timeline (without profiles for quick generation)
    const generator = new TimelineGenerator(DEFAULT_CONFIG.rendering);
    const timeline = await generator.generateTimeline(
      features,
      devices,
      new Map(), // No profiles
      DEFAULT_CONFIG.rendering,
      { name: 'Quick Timeline', audioFile: audioFilePath }
    );

    // Export
    const json = generator.exportTimeline(timeline);
    
    if (outputPath) {
      // In real implementation, would save to file
      console.log(`Timeline exported to ${outputPath}`);
    } else {
      console.log('Timeline JSON:');
      console.log(json.substring(0, 500) + '...');
    }
    
    const stats = generator.getTimelineStats(timeline);
    console.log(`\nTimeline stats:`);
    console.log(`  Duration: ${stats.duration}s`);
    console.log(`  Devices: ${stats.deviceCount}`);
    console.log(`  Commands: ${stats.totalCommands}`);
    console.log(`  Avg commands/device: ${stats.avgCommandsPerDevice.toFixed(1)}`);
  }
}

/**
 * Example usage
 */
export async function runAuroraExample(hassApi: any, audioFile: string): Promise<void> {
  const workflow = new AuroraWorkflow(hassApi);
  
  try {
    await workflow.runCompleteWorkflow(audioFile);
  } catch (error) {
    console.error('Aurora workflow failed:', error);
  }
}
