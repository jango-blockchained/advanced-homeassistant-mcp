/**
 * Aurora MCP Tools
 * Exposes Aurora functionality through Model Context Protocol
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool: aurora_analyze_audio
 * Analyzes an audio file and returns features (BPM, beats, mood, etc.)
 */
export const auroraAnalyzeAudioTool: Tool = {
  name: 'aurora_analyze_audio',
  description: 'Analyze audio file to extract features like BPM, beats, mood, and frequency data for Aurora sound-to-light system',
  inputSchema: {
    type: 'object',
    properties: {
      audio_file: {
        type: 'string',
        description: 'Path to audio file (WAV format supported)',
      },
      sample_rate: {
        type: 'number',
        description: 'Sample rate for analysis (default: 44100)',
        default: 44100,
      },
      fft_size: {
        type: 'number',
        description: 'FFT size for frequency analysis (default: 2048)',
        default: 2048,
      },
    },
    required: ['audio_file'],
  },
};

/**
 * Tool: aurora_scan_devices
 * Scans for available light devices
 */
export const auroraScanDevicesTool: Tool = {
  name: 'aurora_scan_devices',
  description: 'Scan Home Assistant for available light devices that can be used with Aurora',
  inputSchema: {
    type: 'object',
    properties: {
      area: {
        type: 'string',
        description: 'Filter devices by area/room (optional)',
      },
      capability: {
        type: 'string',
        enum: ['color', 'color_temp', 'brightness'],
        description: 'Filter by capability (optional)',
      },
    },
    required: [],
  },
};

/**
 * Tool: aurora_profile_device
 * Profiles a device to measure latency and capabilities
 */
export const auroraProfileDeviceTool: Tool = {
  name: 'aurora_profile_device',
  description: 'Profile a light device to measure response latency and transition capabilities for accurate synchronization',
  inputSchema: {
    type: 'object',
    properties: {
      entity_id: {
        type: 'string',
        description: 'Home Assistant entity ID of the light to profile (e.g., light.living_room)',
      },
      iterations: {
        type: 'number',
        description: 'Number of test iterations for accuracy (default: 3)',
        default: 3,
      },
    },
    required: ['entity_id'],
  },
};

/**
 * Tool: aurora_render_timeline
 * Generates a pre-rendered timeline from audio and devices
 */
export const auroraRenderTimelineTool: Tool = {
  name: 'aurora_render_timeline',
  description: 'Generate a pre-rendered lighting timeline synchronized to audio features with device-specific timing compensation',
  inputSchema: {
    type: 'object',
    properties: {
      audio_file: {
        type: 'string',
        description: 'Path to audio file to sync lights with',
      },
      devices: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of device entity IDs to include (optional, uses all if not specified)',
      },
      intensity: {
        type: 'number',
        description: 'Effect intensity (0.0 to 1.0, default: 0.7)',
        minimum: 0.0,
        maximum: 1.0,
        default: 0.7,
      },
      color_mapping: {
        type: 'string',
        enum: ['frequency', 'mood', 'custom'],
        description: 'How to map audio to colors (default: frequency)',
        default: 'frequency',
      },
      beat_sync: {
        type: 'boolean',
        description: 'Emphasize detected beats (default: true)',
        default: true,
      },
      smooth_transitions: {
        type: 'boolean',
        description: 'Use smooth transitions between commands (default: true)',
        default: true,
      },
      timeline_name: {
        type: 'string',
        description: 'Name for the timeline (optional)',
      },
    },
    required: ['audio_file'],
  },
};

/**
 * Tool: aurora_play_timeline
 * Executes a pre-rendered timeline
 */
export const auroraPlayTimelineTool: Tool = {
  name: 'aurora_play_timeline',
  description: 'Play a pre-rendered Aurora timeline with precise synchronization across all devices',
  inputSchema: {
    type: 'object',
    properties: {
      timeline_id: {
        type: 'string',
        description: 'ID of the timeline to play',
      },
      start_position: {
        type: 'number',
        description: 'Start position in seconds (default: 0)',
        default: 0,
      },
    },
    required: ['timeline_id'],
  },
};

/**
 * Tool: aurora_control_playback
 * Controls playback of an active timeline
 */
export const auroraControlPlaybackTool: Tool = {
  name: 'aurora_control_playback',
  description: 'Control Aurora timeline playback (pause, resume, stop, seek)',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['pause', 'resume', 'stop', 'seek'],
        description: 'Playback action to perform',
      },
      position: {
        type: 'number',
        description: 'Position in seconds (required for seek action)',
      },
    },
    required: ['action'],
  },
};

/**
 * Tool: aurora_get_status
 * Gets current Aurora system status
 */
export const auroraGetStatusTool: Tool = {
  name: 'aurora_get_status',
  description: 'Get current status of Aurora system including playback state and statistics',
  inputSchema: {
    type: 'object',
    properties: {
      verbose: {
        type: 'boolean',
        description: 'Include detailed statistics (default: false)',
        default: false,
      },
    },
    required: [],
  },
};

/**
 * Tool: aurora_list_timelines
 * Lists available timelines
 */
export const auroraListTimelinesTool: Tool = {
  name: 'aurora_list_timelines',
  description: 'List all saved Aurora timelines with metadata',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of timelines to return (default: 10)',
        default: 10,
      },
    },
    required: [],
  },
};

/**
 * Tool: aurora_export_timeline
 * Exports a timeline to JSON
 */
export const auroraExportTimelineTool: Tool = {
  name: 'aurora_export_timeline',
  description: 'Export an Aurora timeline to JSON format for backup or sharing',
  inputSchema: {
    type: 'object',
    properties: {
      timeline_id: {
        type: 'string',
        description: 'ID of the timeline to export',
      },
      output_path: {
        type: 'string',
        description: 'Path to save JSON file (optional)',
      },
    },
    required: ['timeline_id'],
  },
};

/**
 * Tool: aurora_import_timeline
 * Imports a timeline from JSON
 */
export const auroraImportTimelineTool: Tool = {
  name: 'aurora_import_timeline',
  description: 'Import an Aurora timeline from JSON file',
  inputSchema: {
    type: 'object',
    properties: {
      input_path: {
        type: 'string',
        description: 'Path to JSON file to import',
      },
    },
    required: ['input_path'],
  },
};

/**
 * All Aurora tools
 */
export const auroraTools: Tool[] = [
  auroraAnalyzeAudioTool,
  auroraScanDevicesTool,
  auroraProfileDeviceTool,
  auroraRenderTimelineTool,
  auroraPlayTimelineTool,
  auroraControlPlaybackTool,
  auroraGetStatusTool,
  auroraListTimelinesTool,
  auroraExportTimelineTool,
  auroraImportTimelineTool,
];
