#!/usr/bin/env bun
/**
 * Aurora Web Server
 * HTTP server for Aurora web UI and API
 */

import { handleAuroraRoute, type AuroraServerContext } from './src/aurora/server/routes';
import { AuroraDatabase } from './src/aurora/database';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = parseInt(process.env.AURORA_PORT || '3000', 10);
const HASS_HOST = process.env.HASS_HOST || 'http://homeassistant.local:8123';
const HASS_TOKEN = process.env.HASS_TOKEN || '';

if (!HASS_TOKEN) {
  console.error('❌ HASS_TOKEN environment variable is required');
  console.error('   Set it with: export HASS_TOKEN=your_long_lived_access_token');
  process.exit(1);
}

// Initialize Aurora context
const db = new AuroraDatabase();

const context: AuroraServerContext = {
  db,
  executor: null,
  hassCallService: async (domain: string, service: string, data: Record<string, unknown>) => {
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
  },
  hassGetState: async (entityId: string) => {
    const response = await fetch(`${HASS_HOST}/api/states/${entityId}`, {
      headers: {
        Authorization: `Bearer ${HASS_TOKEN}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  },
  hassGetStates: async () => {
    const response = await fetch(`${HASS_HOST}/api/states`, {
      headers: {
        Authorization: `Bearer ${HASS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get states: ${response.statusText}`);
    }

    return response.json();
  },
};

// Start HTTP server
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve Aurora API routes
    if (url.pathname.startsWith('/aurora/')) {
      return handleAuroraRoute(req, context);
    }

    // Serve React build from public/dist/
    // Try to serve static assets first
    let filePath: string;
    
    if (url.pathname === '/' || url.pathname === '/index.html') {
      filePath = join(process.cwd(), 'public', 'dist', 'index.html');
    } else if (url.pathname.startsWith('/assets/')) {
      filePath = join(process.cwd(), 'public', 'dist', url.pathname);
    } else {
      // For other paths, try to serve from dist, fallback to index.html for SPA routing
      const testPath = join(process.cwd(), 'public', 'dist', url.pathname);
      filePath = existsSync(testPath) ? testPath : join(process.cwd(), 'public', 'dist', 'index.html');
    }
    
    if (existsSync(filePath)) {
      const file = await readFile(filePath);
      const ext = filePath.split('.').pop()?.toLowerCase() || '';
      
      const contentTypes: Record<string, string> = {
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
      };

      return new Response(new Uint8Array(file), {
        headers: {
          'Content-Type': contentTypes[ext] || 'application/octet-stream',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
});

// Get database stats
const stats = await db.getStats();

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                  🎵 Aurora Web Server 🎵                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`🌐 Web UI:           http://localhost:${PORT}`);
console.log(`🔌 Home Assistant:   ${HASS_HOST}`);
console.log(`💾 Database:         ${stats.timelineCount} timelines, ${stats.deviceCount} devices`);
console.log('');
console.log('📚 Available endpoints:');
console.log('   GET  /                      - Web UI');
console.log('   GET  /aurora/devices        - List devices');
console.log('   POST /aurora/analyze        - Analyze audio');
console.log('   POST /aurora/render         - Render timeline');
console.log('   POST /aurora/play           - Start playback');
console.log('   GET  /aurora/status         - Playback status');
console.log('   GET  /aurora/timelines      - List timelines');
console.log('');
console.log('✨ Ready! Open http://localhost:' + PORT + ' in your browser');
console.log('');
