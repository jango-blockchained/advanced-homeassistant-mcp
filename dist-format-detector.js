// src/aurora/audio/format-detector.ts
var AudioFormat;
((AudioFormat2) => {
  AudioFormat2["WAV"] = "wav";
  AudioFormat2["MP3"] = "mp3";
  AudioFormat2["OGG"] = "ogg";
  AudioFormat2["FLAC"] = "flac";
  AudioFormat2["M4A"] = "m4a";
  AudioFormat2["AAC"] = "aac";
  AudioFormat2["UNKNOWN"] = "unknown";
})(AudioFormat ||= {});
function detectFormatFromBuffer(buffer) {
  if (buffer.length < 12) {
    return "unknown" /* UNKNOWN */;
  }
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE") {
    return "wav" /* WAV */;
  }
  if (buffer[0] === 255 && (buffer[1] & 224) === 224 || buffer.toString("ascii", 0, 3) === "ID3") {
    return "mp3" /* MP3 */;
  }
  if (buffer.toString("ascii", 0, 4) === "OggS") {
    return "ogg" /* OGG */;
  }
  if (buffer.toString("ascii", 0, 4) === "fLaC") {
    return "flac" /* FLAC */;
  }
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    const subtype = buffer.toString("ascii", 8, 12);
    if (subtype.includes("M4A") || subtype.includes("m4a")) {
      return "m4a" /* M4A */;
    }
    if (subtype.includes("isom") || subtype.includes("iso2") || subtype.includes("mp42")) {
      return "m4a" /* M4A */;
    }
  }
  if (buffer[0] === 255 && (buffer[1] & 246) === 240) {
    return "aac" /* AAC */;
  }
  return "unknown" /* UNKNOWN */;
}
function detectFormatFromExtension(filePath) {
  const extension = filePath.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "wav":
      return "wav" /* WAV */;
    case "mp3":
      return "mp3" /* MP3 */;
    case "ogg":
    case "oga":
      return "ogg" /* OGG */;
    case "flac":
      return "flac" /* FLAC */;
    case "m4a":
      return "m4a" /* M4A */;
    case "aac":
      return "aac" /* AAC */;
    default:
      return "unknown" /* UNKNOWN */;
  }
}
function getFormatName(format) {
  const names = {
    ["wav" /* WAV */]: "WAV",
    ["mp3" /* MP3 */]: "MP3",
    ["ogg" /* OGG */]: "OGG Vorbis",
    ["flac" /* FLAC */]: "FLAC",
    ["m4a" /* M4A */]: "M4A/AAC",
    ["aac" /* AAC */]: "AAC",
    ["unknown" /* UNKNOWN */]: "Unknown"
  };
  return names[format];
}
function isSupportedFormat(format) {
  const supported = ["wav" /* WAV */, "mp3" /* MP3 */, "ogg" /* OGG */, "flac" /* FLAC */];
  return supported.includes(format);
}
function getSupportedFormats() {
  return ["wav" /* WAV */, "mp3" /* MP3 */, "ogg" /* OGG */, "flac" /* FLAC */];
}
export {
  isSupportedFormat,
  getSupportedFormats,
  getFormatName,
  detectFormatFromExtension,
  detectFormatFromBuffer,
  AudioFormat
};
