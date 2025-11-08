// src/aurora/rendering/mapper.ts
class AudioLightMapper {
  settings;
  constructor(settings) {
    this.settings = settings;
  }
  mapFrequencyToColor(slice) {
    switch (this.settings.colorMapping) {
      case "frequency":
        return this.frequencyToRGB(slice);
      case "mood":
        return this.moodToRGB(slice);
      case "custom":
        return this.customColorMapping(slice);
      default:
        return this.frequencyToRGB(slice);
    }
  }
  frequencyToRGB(slice) {
    const intensity = this.settings.intensity;
    const r = Math.round(slice.bass * 255 * intensity);
    const g = Math.round(slice.mid * 255 * intensity);
    const b = Math.round(slice.treble * 255 * intensity);
    return [
      Math.min(255, Math.max(0, r)),
      Math.min(255, Math.max(0, g)),
      Math.min(255, Math.max(0, b))
    ];
  }
  moodToRGB(slice) {
    const brightness = slice.amplitude * this.settings.intensity;
    const hue = slice.dominantFrequency / 20000 * 360;
    return this.hslToRgb(hue, 1, brightness * 0.5);
  }
  customColorMapping(slice) {
    return this.frequencyToRGB(slice);
  }
  mapAmplitudeToBrightness(slice) {
    let value = 0;
    switch (this.settings.brightnessMapping) {
      case "amplitude":
        value = slice.amplitude;
        break;
      case "energy":
        value = (slice.bass + slice.mid + slice.treble) / 3;
        break;
      case "beats":
        value = slice.amplitude;
        break;
      case "custom":
        value = this.customBrightnessMapping(slice);
        break;
      default:
        value = slice.amplitude;
    }
    const brightness = Math.round(value * this.settings.intensity * 255);
    return Math.min(255, Math.max(0, brightness));
  }
  customBrightnessMapping(slice) {
    return slice.amplitude;
  }
  generateCommand(device, slice, isBeat, zoneSettings) {
    const params = {};
    const zoneIntensity = zoneSettings?.intensityMultiplier ?? 1;
    const effectiveIntensity = this.settings.intensity * zoneIntensity;
    if (device.capabilities.supportsColor) {
      const colorMapping = zoneSettings?.colorMapping || this.settings.colorMapping;
      const originalMapping = this.settings.colorMapping;
      this.settings.colorMapping = colorMapping;
      const color = this.mapFrequencyToColor(slice);
      params.rgb_color = color;
      this.settings.colorMapping = originalMapping;
    }
    if (device.capabilities.supportsBrightness) {
      const brightness = this.mapAmplitudeToBrightness(slice);
      params.brightness = Math.round(brightness * effectiveIntensity);
    }
    if (device.capabilities.supportsColorTemp && !device.capabilities.supportsColor) {
      const colorTemp = this.mapFrequencyToColorTemp(slice, device);
      params.color_temp = colorTemp;
    }
    if (this.settings.beatSync && isBeat) {
      if (params.brightness !== undefined) {
        params.brightness = Math.min(255, params.brightness * 1.2);
      }
    }
    if (this.settings.smoothTransitions) {
      params.transition = this.settings.minCommandInterval / 1000;
    } else {
      params.transition = 0;
    }
    return params;
  }
  mapFrequencyToColorTemp(slice, device) {
    const minMireds = device.capabilities.minMireds;
    const maxMireds = device.capabilities.maxMireds;
    if (minMireds == null || maxMireds == null) {
      return 370;
    }
    const min = minMireds;
    const max = maxMireds;
    const ratio = slice.treble / Math.max(0.01, slice.bass);
    const normalized = Math.min(1, ratio / 2);
    return Math.round(max - (max - min) * normalized);
  }
  isBeat(timestamp, beats, tolerance = 0.05) {
    return beats.some((beat) => Math.abs(beat - timestamp) < tolerance);
  }
  hslToRgb(h, s, l) {
    h = h / 360;
    const hue2rgb = (p, q, t) => {
      if (t < 0)
        t += 1;
      if (t > 1)
        t -= 1;
      if (t < 1 / 6)
        return p + (q - p) * 6 * t;
      if (t < 1 / 2)
        return q;
      if (t < 2 / 3)
        return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255)
    ];
  }
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
  }
}

// src/aurora/rendering/synchronizer.ts
class SynchronizationCalculator {
  calculateCompensation(device, profile, referenceLatency) {
    if (!profile) {
      return this.estimateCompensation(device);
    }
    return profile.latencyMs - referenceLatency;
  }
  estimateCompensation(device) {
    if (device.manufacturer) {
      const manufacturer = device.manufacturer.toLowerCase();
      if (manufacturer.includes("philips") || manufacturer.includes("hue")) {
        return 50;
      }
      if (manufacturer.includes("lifx")) {
        return 80;
      }
      if (manufacturer.includes("ikea") || manufacturer.includes("tradfri")) {
        return 150;
      }
      if (manufacturer.includes("tp-link") || manufacturer.includes("kasa")) {
        return 120;
      }
      if (manufacturer.includes("tuya") || manufacturer.includes("smart life")) {
        return 300;
      }
      if (manufacturer.includes("yeelight")) {
        return 250;
      }
    }
    return 200;
  }
  calculateReferenceLatency(devices, profiles) {
    let minLatency = Number.MAX_VALUE;
    for (const device of devices) {
      const profile = profiles.get(device.entityId);
      let latency;
      if (profile) {
        latency = profile.latencyMs;
      } else {
        latency = this.estimateCompensation(device);
      }
      if (latency < minLatency) {
        minLatency = latency;
      }
    }
    return minLatency === Number.MAX_VALUE ? 50 : minLatency;
  }
  compensateCommand(command, compensationMs) {
    const originalTimestamp = command.originalTimestamp || command.timestamp;
    const compensatedTimestamp = Math.max(0, command.timestamp - compensationMs / 1000);
    return {
      ...command,
      timestamp: compensatedTimestamp,
      originalTimestamp
    };
  }
  compensateCommands(commands, compensationMs) {
    return commands.map((cmd) => this.compensateCommand(cmd, compensationMs));
  }
  calculateGroupingInterval(commands, minIntervalMs) {
    const groups = new Map;
    const sorted = [...commands].sort((a, b) => a.timestamp - b.timestamp);
    let currentGroupTime = 0;
    let currentGroup = [];
    for (const command of sorted) {
      const commandTimeMs = command.timestamp * 1000;
      if (currentGroup.length === 0) {
        currentGroupTime = commandTimeMs;
        currentGroup = [command];
      } else if (commandTimeMs - currentGroupTime < minIntervalMs) {
        currentGroup.push(command);
      } else {
        groups.set(currentGroupTime, currentGroup);
        currentGroupTime = commandTimeMs;
        currentGroup = [command];
      }
    }
    if (currentGroup.length > 0) {
      groups.set(currentGroupTime, currentGroup);
    }
    return groups;
  }
  analyzeSynchronization(devices, profiles) {
    const referenceLatency = this.calculateReferenceLatency(devices, profiles);
    const compensations = [];
    let minCompensation = Number.MAX_VALUE;
    let maxCompensation = Number.MIN_VALUE;
    for (const device of devices) {
      const profile = profiles.get(device.entityId);
      const compensation = this.calculateCompensation(device, profile, referenceLatency);
      compensations.push(compensation);
      minCompensation = Math.min(minCompensation, compensation);
      maxCompensation = Math.max(maxCompensation, compensation);
    }
    const avgCompensation = compensations.reduce((sum, c) => sum + c, 0) / compensations.length;
    const compensationRange = maxCompensation - minCompensation;
    return {
      referenceLatency,
      minCompensation,
      maxCompensation,
      avgCompensation,
      compensationRange,
      devicesCount: devices.length,
      profiledDevicesCount: Array.from(profiles.keys()).filter((id) => devices.some((d) => d.entityId === id)).length
    };
  }
  validateCompensation(commands, compensationMs) {
    const minTimestamp = Math.min(...commands.map((c) => c.timestamp));
    return minTimestamp * 1000 >= compensationMs;
  }
}

// node_modules/uuid/dist/esm-browser/stringify.js
var byteToHex = [];
for (let i = 0;i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// node_modules/uuid/dist/esm-browser/rng.js
var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
    getRandomValues = crypto.getRandomValues.bind(crypto);
  }
  return getRandomValues(rnds8);
}

// node_modules/uuid/dist/esm-browser/native.js
var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var native_default = { randomUUID };

// node_modules/uuid/dist/esm-browser/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i = 0;i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;
// src/aurora/rendering/timeline.ts
class TimelineGenerator {
  mapper;
  synchronizer;
  constructor(settings) {
    this.mapper = new AudioLightMapper(settings);
    this.synchronizer = new SynchronizationCalculator;
  }
  async generateTimeline(audioFeatures, devices, profiles, settings, options = {}) {
    const startTime = Date.now();
    this.mapper.updateSettings(settings);
    const referenceLatency = this.synchronizer.calculateReferenceLatency(devices, profiles);
    const tracks = [];
    let totalCommands = 0;
    for (const device of devices) {
      const profile = profiles.get(device.entityId);
      const track = await this.generateDeviceTrack(device, profile, audioFeatures, referenceLatency, settings, options);
      tracks.push(track);
      totalCommands += track.commands.length;
    }
    const processingTime = (Date.now() - startTime) / 1000;
    const metadata = {
      version: "0.1.0",
      settings,
      deviceCount: devices.length,
      commandCount: totalCommands,
      processingTime
    };
    const timeline = {
      id: options.id || v4_default(),
      name: options.name || `Timeline ${new Date().toISOString()}`,
      audioFile: options.audioFile,
      audioFeatures,
      duration: audioFeatures.duration,
      tracks,
      metadata,
      createdAt: new Date
    };
    return timeline;
  }
  async generateDeviceTrack(device, profile, audioFeatures, referenceLatency, settings, options) {
    const commands = [];
    const compensationMs = this.synchronizer.calculateCompensation(device, profile, referenceLatency);
    const zoneSettings = device.area && settings.zoneSettings ? settings.zoneSettings[device.area] : undefined;
    const transitionTime = profile ? Math.min(profile.maxTransitionMs, settings.minCommandInterval) / 1000 : settings.minCommandInterval / 1000;
    let lastCommandTime = -settings.minCommandInterval / 1000;
    for (const slice of audioFeatures.frequencyData) {
      if (slice.timestamp - lastCommandTime < settings.minCommandInterval / 1000) {
        continue;
      }
      const isBeat = this.mapper.isBeat(slice.timestamp, audioFeatures.beats);
      const params = this.generateOptimizedCommand(device, slice, isBeat, zoneSettings, profile, transitionTime);
      let commandType = "turn_on";
      if (params.rgb_color && device.capabilities.supportsColor) {
        commandType = "set_color";
      } else if (params.effect && device.capabilities.supportsEffects) {
        commandType = "effect";
      } else if (params.brightness !== undefined && device.capabilities.supportsBrightness) {
        commandType = "set_brightness";
      } else if (params.color_temp !== undefined && device.capabilities.supportsColorTemp) {
        commandType = "set_color_temp";
      }
      const command = {
        timestamp: slice.timestamp,
        type: commandType,
        params
      };
      commands.push(command);
      lastCommandTime = slice.timestamp;
    }
    if (settings.beatSync && profile) {
      this.addBeatEmphasisCommands(commands, audioFeatures.beats, device, profile, settings);
    }
    const optimizedCommands = this.removeRedundantCommands(commands);
    const compensatedCommands = this.synchronizer.compensateCommands(optimizedCommands, compensationMs);
    return {
      entityId: device.entityId,
      deviceName: device.name,
      commands: compensatedCommands,
      compensationMs
    };
  }
  generateOptimizedCommand(device, slice, isBeat, zoneSettings, profile, transitionTime) {
    const params = {};
    const zoneIntensity = zoneSettings?.intensityMultiplier ?? 1;
    const effectiveIntensity = this.mapper.settings.intensity * zoneIntensity;
    if (device.capabilities.supportsColor) {
      const colorMapping = zoneSettings?.colorMapping || this.mapper.settings.colorMapping;
      const originalMapping = this.mapper.settings.colorMapping;
      this.mapper.settings.colorMapping = colorMapping;
      const color = this.mapper.mapFrequencyToColor(slice);
      params.rgb_color = this.optimizeColorForDevice(color, device, profile);
      this.mapper.settings.colorMapping = originalMapping;
    }
    if (device.capabilities.supportsBrightness) {
      const brightness = this.mapper.mapAmplitudeToBrightness(slice);
      const optimizedBrightness = Math.round(brightness * effectiveIntensity);
      const minBrightness = device.capabilities.minBrightness ?? 0;
      const maxBrightness = device.capabilities.maxBrightness ?? 255;
      params.brightness = Math.max(minBrightness, Math.min(maxBrightness, optimizedBrightness));
      if (profile?.brightnessCurve) {
        params.brightness = this.applyBrightnessCurveCompensation(params.brightness, profile.brightnessCurve);
      }
    }
    if (device.capabilities.supportsColorTemp && !device.capabilities.supportsColor) {
      const colorTemp = this.mapper.mapFrequencyToColorTemp(slice, device);
      params.color_temp = colorTemp;
    }
    if (this.mapper.settings.beatSync && isBeat) {
      if (device.capabilities.supportsEffects && device.capabilities.effects?.length) {
        const beatEffect = this.selectBeatEffect(device, profile);
        if (beatEffect) {
          params.effect = beatEffect;
          params.transition = 0;
        }
      } else if (params.brightness !== undefined) {
        params.brightness = Math.min(255, params.brightness * 1.2);
      }
    }
    params.transition = this.selectOptimalTransitionTime(device, profile, transitionTime);
    return params;
  }
  optimizeColorForDevice(color, device, profile) {
    if (profile?.colorAccuracy && profile.colorAccuracy < 0.95) {
      const correctionFactor = profile.colorAccuracy;
      return [
        Math.round(color[0] * correctionFactor),
        Math.round(color[1] * correctionFactor),
        Math.round(color[2] * correctionFactor)
      ];
    }
    return color;
  }
  applyBrightnessCurveCompensation(requestedBrightness, brightnessCurve) {
    return requestedBrightness;
  }
  selectBeatEffect(device, profile) {
    if (!device.capabilities.effects || device.capabilities.effects.length === 0) {
      return;
    }
    if (profile?.effectsPerformance) {
      const fastEffects = profile.effectsPerformance.filter((e) => e.supported && e.responseTimeMs && e.responseTimeMs < 200);
      if (fastEffects.length > 0) {
        const flashEffect = fastEffects.find((e) => e.effectName.toLowerCase().includes("flash") || e.effectName.toLowerCase().includes("strobe"));
        return flashEffect?.effectName || fastEffects[0].effectName;
      }
    }
    return device.capabilities.effects[0];
  }
  selectOptimalTransitionTime(device, profile, suggestedTime) {
    if (!profile) {
      return suggestedTime;
    }
    const clamped = Math.max(profile.minTransitionMs / 1000, Math.min(profile.maxTransitionMs / 1000, suggestedTime));
    return clamped;
  }
  addBeatEmphasisCommands(commands, beats, device, profile, settings) {
    if (!settings || settings.intensity === undefined) {
      return;
    }
    for (const beatTime of beats) {
      const closestCommand = commands.reduce((closest, cmd) => {
        const currentDist = Math.abs(cmd.timestamp - beatTime);
        const closestDist = Math.abs(closest.timestamp - beatTime);
        return currentDist < closestDist ? cmd : closest;
      });
      if (Math.abs(closestCommand.timestamp - beatTime) < 0.1) {
        if (closestCommand.params.brightness !== undefined) {
          closestCommand.params.brightness = Math.min(255, closestCommand.params.brightness * 1.3);
        }
      } else {
        if (device.capabilities.supportsBrightness) {
          const beatCommand = {
            timestamp: beatTime,
            type: "set_brightness",
            params: {
              brightness: Math.round(255 * settings.intensity),
              transition: 0.05
            }
          };
          commands.push(beatCommand);
        }
      }
    }
    commands.sort((a, b) => a.timestamp - b.timestamp);
  }
  optimizeTimeline(timeline) {
    const optimizedTracks = [];
    for (const track of timeline.tracks) {
      const optimizedCommands = this.removeRedundantCommands(track.commands);
      optimizedTracks.push({
        ...track,
        commands: optimizedCommands
      });
    }
    const totalCommands = optimizedTracks.reduce((sum, track) => sum + track.commands.length, 0);
    return {
      ...timeline,
      tracks: optimizedTracks,
      metadata: {
        ...timeline.metadata,
        commandCount: totalCommands
      }
    };
  }
  removeRedundantCommands(commands) {
    if (commands.length === 0)
      return commands;
    const filtered = [commands[0]];
    for (let i = 1;i < commands.length; i++) {
      const current = commands[i];
      const previous = filtered[filtered.length - 1];
      if (!this.areCommandsSimilar(current, previous)) {
        filtered.push(current);
      }
    }
    return filtered;
  }
  areCommandsSimilar(cmd1, cmd2) {
    if (cmd1.type !== cmd2.type)
      return false;
    if (cmd1.params.rgb_color && cmd2.params.rgb_color) {
      const colorDiff = Math.abs(cmd1.params.rgb_color[0] - cmd2.params.rgb_color[0]) + Math.abs(cmd1.params.rgb_color[1] - cmd2.params.rgb_color[1]) + Math.abs(cmd1.params.rgb_color[2] - cmd2.params.rgb_color[2]);
      if (colorDiff < 15)
        return true;
    }
    if (cmd1.params.brightness !== undefined && cmd2.params.brightness !== undefined) {
      const brightnessDiff = Math.abs(cmd1.params.brightness - cmd2.params.brightness);
      if (brightnessDiff < 5)
        return true;
    }
    return false;
  }
  exportTimeline(timeline) {
    return JSON.stringify(timeline, null, 2);
  }
  importTimeline(json) {
    const data = JSON.parse(json);
    data.createdAt = new Date(data.createdAt);
    return data;
  }
  getTimelineStats(timeline) {
    const commandsPerDevice = timeline.tracks.map((t) => ({
      entityId: t.entityId,
      deviceName: t.deviceName,
      commandCount: t.commands.length,
      compensationMs: t.compensationMs
    }));
    const avgCommandsPerDevice = timeline.metadata.commandCount / timeline.metadata.deviceCount;
    const commandsPerSecond = timeline.metadata.commandCount / timeline.duration;
    return {
      timelineId: timeline.id,
      duration: timeline.duration,
      deviceCount: timeline.metadata.deviceCount,
      totalCommands: timeline.metadata.commandCount,
      avgCommandsPerDevice,
      commandsPerSecond,
      processingTime: timeline.metadata.processingTime,
      commandsPerDevice
    };
  }
}
export {
  TimelineGenerator
};
