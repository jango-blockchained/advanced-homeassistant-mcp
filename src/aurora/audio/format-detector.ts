/**
 * Audio Format Detector
 * Detects audio file format from buffer headers or file extension
 */

export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  OGG = 'ogg',
  FLAC = 'flac',
  M4A = 'm4a',
  AAC = 'aac',
  UNKNOWN = 'unknown',
}

export interface AudioFormatInfo {
  format: AudioFormat;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  duration?: number;
  bitRate?: number;
  codec?: string;
}

/**
 * Detect audio format from file buffer
 */
export function detectFormatFromBuffer(buffer: Buffer): AudioFormat {
  if (buffer.length < 12) {
    return AudioFormat.UNKNOWN;
  }

  // WAV: starts with "RIFF" followed by size, then "WAVE"
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
    return AudioFormat.WAV;
  }

  // MP3: starts with 0xFF 0xFB (MPEG Frame Sync) or ID3 tag
  if ((buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) || buffer.toString('ascii', 0, 3) === 'ID3') {
    return AudioFormat.MP3;
  }

  // OGG: starts with "OggS"
  if (buffer.toString('ascii', 0, 4) === 'OggS') {
    return AudioFormat.OGG;
  }

  // FLAC: starts with "fLaC"
  if (buffer.toString('ascii', 0, 4) === 'fLaC') {
    return AudioFormat.FLAC;
  }

  // M4A/AAC: starts with specific atoms, often "ftyp" at offset 4
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const subtype = buffer.toString('ascii', 8, 12);
    if (subtype.includes('M4A') || subtype.includes('m4a')) {
      return AudioFormat.M4A;
    }
    if (subtype.includes('isom') || subtype.includes('iso2') || subtype.includes('mp42')) {
      return AudioFormat.M4A;
    }
  }

  // AAC: starts with "ADTS" header (0xFF 0xF1 or 0xFF 0xF9)
  if (buffer[0] === 0xFF && (buffer[1] & 0xF6) === 0xF0) {
    return AudioFormat.AAC;
  }

  return AudioFormat.UNKNOWN;
}

/**
 * Detect audio format from file extension
 */
export function detectFormatFromExtension(filePath: string): AudioFormat {
  const extension = filePath.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'wav':
      return AudioFormat.WAV;
    case 'mp3':
      return AudioFormat.MP3;
    case 'ogg':
    case 'oga':
      return AudioFormat.OGG;
    case 'flac':
      return AudioFormat.FLAC;
    case 'm4a':
      return AudioFormat.M4A;
    case 'aac':
      return AudioFormat.AAC;
    default:
      return AudioFormat.UNKNOWN;
  }
}

/**
 * Get human-readable format name
 */
export function getFormatName(format: AudioFormat): string {
  const names: Record<AudioFormat, string> = {
    [AudioFormat.WAV]: 'WAV',
    [AudioFormat.MP3]: 'MP3',
    [AudioFormat.OGG]: 'OGG Vorbis',
    [AudioFormat.FLAC]: 'FLAC',
    [AudioFormat.M4A]: 'M4A/AAC',
    [AudioFormat.AAC]: 'AAC',
    [AudioFormat.UNKNOWN]: 'Unknown',
  };

  return names[format];
}

/**
 * Check if format is supported
 */
export function isSupportedFormat(format: AudioFormat): boolean {
  const supported = [AudioFormat.WAV, AudioFormat.MP3, AudioFormat.OGG, AudioFormat.FLAC, AudioFormat.M4A, AudioFormat.AAC];
  return supported.includes(format);
}

/**
 * Get supported formats
 */
export function getSupportedFormats(): AudioFormat[] {
  return [AudioFormat.WAV, AudioFormat.MP3, AudioFormat.OGG, AudioFormat.FLAC, AudioFormat.M4A, AudioFormat.AAC];
}
