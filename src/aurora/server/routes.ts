/**
 * Aurora Web Server Routes
 * REST API for audio analysis, timeline rendering, and playback control
 */

import type { Server } from 'bun';
import { AudioAnalyzer } from '../audio/analyzer';
import { AudioCapture } from '../audio/capture';
import { TimelineGenerator } from '../rendering/timeline';
import { TimelineExecutor } from '../execution/executor';
import { DeviceScanner } from '../devices/scanner';
import { DeviceProfiler } from '../devices/profiler';
import { AuroraDatabase } from '../database';
import type { RenderTimeline, RenderSettings } from '../types';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export interface AuroraServerContext {
  db: AuroraDatabase;
  executor: TimelineExecutor | null;
  hassCallService: (domain: string, service: string, data: Record<string, unknown>) => Promise<unknown>;
  hassGetState: (entityId: string) => Promise<unknown>;
  hassGetStates: () => Promise<unknown>;
}

/**
 * Handle Aurora API routes
 */
export async function handleAuroraRoute(
  req: Request,
  ctx: AuroraServerContext
): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS headers for web UI
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Route handlers
    switch (path) {
      case '/aurora/devices':
        return await handleGetDevices(req, ctx, corsHeaders);
      
      case '/aurora/analyze':
        return await handleAnalyzeAudio(req, ctx, corsHeaders);
      
      case '/aurora/render':
        return await handleRenderTimeline(req, ctx, corsHeaders);
      
      case '/aurora/timelines':
        return await handleGetTimelines(req, ctx, corsHeaders);
      
      case '/aurora/play':
        return await handlePlayTimeline(req, ctx, corsHeaders);
      
      case '/aurora/pause':
        return await handlePausePlayback(req, ctx, corsHeaders);
      
      case '/aurora/resume':
        return await handleResumePlayback(req, ctx, corsHeaders);
      
      case '/aurora/stop':
        return await handleStopPlayback(req, ctx, corsHeaders);
      
      case '/aurora/status':
        return await handleGetStatus(req, ctx, corsHeaders);
      
      case '/aurora/profile':
        return await handleProfileDevice(req, ctx, corsHeaders);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Route not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Aurora route error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /aurora/devices - List available light devices
 */
async function handleGetDevices(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const scanner = new DeviceScanner({
    getStates: ctx.hassGetStates,
    getState: ctx.hassGetState,
    callService: ctx.hassCallService,
  } as any);
  const devices = await scanner.scanDevices();

  return new Response(
    JSON.stringify(devices),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /aurora/analyze - Analyze audio file
 * Body: { audioFile: string, sampleRate?: number, fftSize?: number }
 */
async function handleAnalyzeAudio(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await req.json() as { audioFile: string; sampleRate?: number; fftSize?: number };

  if (!body.audioFile) {
    return new Response(
      JSON.stringify({ error: 'audioFile is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!existsSync(body.audioFile)) {
    return new Response(
      JSON.stringify({ error: 'Audio file not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const analyzer = new AudioAnalyzer(body.sampleRate || 44100, body.fftSize || 2048);
  const audioBuffer = await analyzer.loadAudioFile(body.audioFile);
  const features = await analyzer.analyzeAudio(audioBuffer);

  // Store in cache
  ctx.db.setCacheEntry(`audio:${body.audioFile}`, {
    audioFeatures: features,
    analyzedAt: new Date(),
  });

  return new Response(
    JSON.stringify({ features }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /aurora/render - Render timeline from audio
 * Body: { audioFile: string, devices: string[], settings?: RenderSettings }
 */
async function handleRenderTimeline(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await req.json() as { 
    audioFile: string; 
    devices: string[];
    settings?: Partial<RenderSettings>;
    name?: string;
  };

  if (!body.audioFile || !body.devices?.length) {
    return new Response(
      JSON.stringify({ error: 'audioFile and devices are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check for cached analysis
  let audioFeatures;
  const cached = ctx.db.getCacheEntry(`audio:${body.audioFile}`);
  if (cached?.audioFeatures) {
    audioFeatures = cached.audioFeatures;
  } else {
    // Analyze audio
    const capture = new AudioCapture();
    const audioBuffer = await capture.loadFromFile(body.audioFile);
    const analyzer = new AudioAnalyzer();
    audioFeatures = await analyzer.analyze(audioBuffer);
  }

  // Get device profiles
  const deviceProfiles = await Promise.all(
    body.devices.map(async (entityId) => {
      const stored = await ctx.db.getDevice(entityId);
      return {
        entityId,
        latencyMs: stored?.latencyMs || 100,
        capabilities: stored?.capabilities || {},
      };
    })
  );

  // Render timeline
  const generator = new TimelineGenerator();
  const settings: RenderSettings = {
    intensity: body.settings?.intensity ?? 0.7,
    colorMapping: body.settings?.colorMapping ?? 'frequency',
    brightnessMapping: body.settings?.brightnessMapping ?? 'amplitude',
    beatSync: body.settings?.beatSync ?? true,
    smoothTransitions: body.settings?.smoothTransitions ?? true,
    minCommandInterval: body.settings?.minCommandInterval ?? 100,
  };

  const timeline = await generator.generateTimeline(
    audioFeatures,
    deviceProfiles,
    settings
  );

  // Store timeline
  const timelineId = `timeline-${Date.now()}`;
  const timelineName = body.name || `Timeline ${new Date().toISOString()}`;
  
  await ctx.db.createTimeline({
    id: timelineId,
    name: timelineName,
    audioFile: body.audioFile,
    duration: audioFeatures.duration,
    deviceCount: body.devices.length,
    commandCount: timeline.tracks.reduce((sum, t) => sum + t.commands.length, 0),
    createdAt: new Date(),
  });

  // Store tracks
  for (const track of timeline.tracks) {
    await ctx.db.addDeviceTrack(timelineId, {
      entityId: track.entityId,
      deviceName: track.deviceName,
      compensationMs: track.compensationMs,
      commandCount: track.commands.length,
    });
  }

  return new Response(
    JSON.stringify({ 
      timeline: {
        ...timeline,
        id: timelineId,
        name: timelineName,
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * GET /aurora/timelines - List saved timelines
 */
async function handleGetTimelines(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const timelines = await ctx.db.listTimelines();

  return new Response(
    JSON.stringify({ timelines }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /aurora/play - Start playback
 * Body: { timelineId: string, startPosition?: number }
 */
async function handlePlayTimeline(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await req.json() as { timelineId: string; startPosition?: number };

  if (!body.timelineId) {
    return new Response(
      JSON.stringify({ error: 'timelineId is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Load timeline
  const timeline = await ctx.db.getTimeline(body.timelineId);
  if (!timeline) {
    return new Response(
      JSON.stringify({ error: 'Timeline not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Initialize executor if needed
  if (!ctx.executor) {
    ctx.executor = new TimelineExecutor(ctx.hassCallService);
  }

  // Convert database timeline to RenderTimeline format
  const renderTimeline: RenderTimeline = timeline as unknown as RenderTimeline;

  // Start playback
  await ctx.executor.play(
    renderTimeline,
    body.startPosition || 0,
    timeline.audioFile
  );

  const state = ctx.executor.getState();

  return new Response(
    JSON.stringify({ 
      status: 'playing',
      state 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /aurora/pause - Pause playback
 */
async function handlePausePlayback(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!ctx.executor) {
    return new Response(
      JSON.stringify({ error: 'No active playback' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  ctx.executor.pause();
  const state = ctx.executor.getState();

  return new Response(
    JSON.stringify({ status: 'paused', state }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /aurora/resume - Resume playback
 */
async function handleResumePlayback(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!ctx.executor) {
    return new Response(
      JSON.stringify({ error: 'No active playback' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await ctx.executor.resume();
  const state = ctx.executor.getState();

  return new Response(
    JSON.stringify({ status: 'playing', state }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /aurora/stop - Stop playback
 */
async function handleStopPlayback(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!ctx.executor) {
    return new Response(
      JSON.stringify({ error: 'No active playback' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  ctx.executor.stop();
  const state = ctx.executor.getState();

  return new Response(
    JSON.stringify({ status: 'stopped', state }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * GET /aurora/status - Get current playback status
 */
async function handleGetStatus(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const state = ctx.executor?.getState() || {
    state: 'idle',
    position: 0,
    mode: 'prerendered',
    queueStats: { queued: 0, executed: 0, failed: 0, avgLatency: 0 },
  };

  const status = {
    state: state.state,
    currentTime: state.position,
    duration: state.timeline?.duration ?? 0,
    timelineId: state.timeline?.id,
  };

  return new Response(
    JSON.stringify(status),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /aurora/profile - Profile a device
 * Body: { entityId: string, iterations?: number }
 */
async function handleProfileDevice(
  req: Request,
  ctx: AuroraServerContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const body = await req.json() as { entityId: string; iterations?: number };

  if (!body.entityId) {
    return new Response(
      JSON.stringify({ error: 'entityId is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const profiler = new DeviceProfiler(ctx.hassCallService, ctx.hassGetState);
  const profile = await profiler.profileDevice(body.entityId, body.iterations || 3);

  // Store profile
  await ctx.db.saveDeviceProfile(body.entityId, profile);

  return new Response(
    JSON.stringify({ profile }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
