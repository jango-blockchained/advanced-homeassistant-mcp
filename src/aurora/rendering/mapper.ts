/**
 * Audio-to-Light Mapper
 * Maps audio features to lighting effects
 */

import type {
  AudioFeatures,
  FrequencySlice,
  LightDevice,
  CommandParams,
  RenderSettings,
  ZoneSettings,
} from '../types';

export class AudioLightMapper {
  private settings: RenderSettings;

  constructor(settings: RenderSettings) {
    this.settings = settings;
  }

  /**
   * Map frequency data to RGB color
   */
  mapFrequencyToColor(slice: FrequencySlice): [number, number, number] {
    switch (this.settings.colorMapping) {
      case 'frequency':
        return this.frequencyToRGB(slice);
      case 'mood':
        return this.moodToRGB(slice);
      case 'custom':
        return this.customColorMapping(slice);
      default:
        return this.frequencyToRGB(slice);
    }
  }

  /**
   * Map frequency bands to RGB colors
   * Bass → Red, Mid → Green, Treble → Blue
   */
  private frequencyToRGB(slice: FrequencySlice): [number, number, number] {
    const intensity = this.settings.intensity;
    
    // Scale each band by intensity
    const r = Math.round(slice.bass * 255 * intensity);
    const g = Math.round(slice.mid * 255 * intensity);
    const b = Math.round(slice.treble * 255 * intensity);

    return [
      Math.min(255, Math.max(0, r)),
      Math.min(255, Math.max(0, g)),
      Math.min(255, Math.max(0, b)),
    ];
  }

  /**
   * Map mood to color palette
   */
  private moodToRGB(slice: FrequencySlice): [number, number, number] {
    // Use amplitude to vary brightness
    const brightness = slice.amplitude * this.settings.intensity;
    
    // Use dominant frequency to determine hue
    const hue = (slice.dominantFrequency / 20000) * 360;
    
    return this.hslToRgb(hue, 1.0, brightness * 0.5);
  }

  /**
   * Custom color mapping (placeholder)
   */
  private customColorMapping(slice: FrequencySlice): [number, number, number] {
    // TODO: Implement custom user-defined color mapping
    return this.frequencyToRGB(slice);
  }

  /**
   * Map audio amplitude to brightness
   */
  mapAmplitudeToBrightness(slice: FrequencySlice): number {
    let value = 0;

    switch (this.settings.brightnessMapping) {
      case 'amplitude':
        value = slice.amplitude;
        break;
      case 'energy':
        // Use combined energy from all bands
        value = (slice.bass + slice.mid + slice.treble) / 3;
        break;
      case 'beats':
        // This will be handled by beat synchronization
        value = slice.amplitude;
        break;
      case 'custom':
        value = this.customBrightnessMapping(slice);
        break;
      default:
        value = slice.amplitude;
    }

    // Scale by intensity and convert to 0-255 range
    const brightness = Math.round(value * this.settings.intensity * 255);
    return Math.min(255, Math.max(0, brightness));
  }

  /**
   * Custom brightness mapping (placeholder)
   */
  private customBrightnessMapping(slice: FrequencySlice): number {
    // TODO: Implement custom user-defined brightness mapping
    return slice.amplitude;
  }

  /**
   * Generate command parameters for a device at a specific time
   */
  generateCommand(
    device: LightDevice,
    slice: FrequencySlice,
    isBeat: boolean,
    zoneSettings?: ZoneSettings
  ): CommandParams {
    const params: CommandParams = {};

    // Apply zone-specific intensity multiplier
    const zoneIntensity = zoneSettings?.intensityMultiplier || 1.0;
    const effectiveIntensity = this.settings.intensity * zoneIntensity;

    // Color mapping
    if (device.capabilities.supportsColor) {
      const colorMapping = zoneSettings?.colorMapping || this.settings.colorMapping;
      const originalMapping = this.settings.colorMapping;
      this.settings.colorMapping = colorMapping;
      
      const color = this.mapFrequencyToColor(slice);
      params.rgb_color = color;
      
      this.settings.colorMapping = originalMapping;
    }

    // Brightness mapping
    if (device.capabilities.supportsBrightness) {
      const brightness = this.mapAmplitudeToBrightness(slice);
      params.brightness = Math.round(brightness * effectiveIntensity);
    }

    // Color temperature for devices that support it but not RGB
    if (device.capabilities.supportsColorTemp && !device.capabilities.supportsColor) {
      const colorTemp = this.mapFrequencyToColorTemp(slice, device);
      params.color_temp = colorTemp;
    }

    // Beat synchronization: add flash effect on beats
    if (this.settings.beatSync && isBeat) {
      if (params.brightness !== undefined) {
        params.brightness = Math.min(255, params.brightness * 1.2);
      }
    }

    // Smooth transitions
    if (this.settings.smoothTransitions) {
      params.transition = this.settings.minCommandInterval / 1000; // Convert to seconds
    } else {
      params.transition = 0;
    }

    return params;
  }

  /**
   * Map frequency to color temperature (for tunable white bulbs)
   */
  private mapFrequencyToColorTemp(slice: FrequencySlice, device: LightDevice): number {
    if (!device.capabilities.minMireds || !device.capabilities.maxMireds) {
      return 370; // Default ~2700K
    }

    // Higher frequencies → cooler (lower mireds)
    // Lower frequencies → warmer (higher mireds)
    const min = device.capabilities.minMireds;
    const max = device.capabilities.maxMireds;
    
    // Use treble/bass ratio to determine temperature
    const ratio = slice.treble / Math.max(0.01, slice.bass);
    const normalized = Math.min(1, ratio / 2); // Normalize to 0-1
    
    // Interpolate between min and max mireds
    return Math.round(max - (max - min) * normalized);
  }

  /**
   * Check if timestamp is a beat
   */
  isBeat(timestamp: number, beats: number[], tolerance: number = 0.05): boolean {
    return beats.some(beat => Math.abs(beat - timestamp) < tolerance);
  }

  /**
   * HSL to RGB conversion
   */
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;
    
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

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
      Math.round(b * 255),
    ];
  }

  /**
   * Update render settings
   */
  updateSettings(settings: Partial<RenderSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }
}
