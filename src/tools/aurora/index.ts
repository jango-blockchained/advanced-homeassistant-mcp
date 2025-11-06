/**
 * Aurora Tools Index
 * Exports all Aurora sound-to-light tools
 */

export { auroraAnalyzeAudioTool } from "./analyze-audio.tool.js";
export { auroraScanDevicesTool } from "./scan-devices.tool.js";
export { auroraProfileDeviceTool } from "./profile-device.tool.js";
export { auroraRenderTimelineTool } from "./render-timeline.tool.js";
export { auroraPlayTimelineTool } from "./play-timeline.tool.js";
export { auroraControlPlaybackTool } from "./control-playback.tool.js";
export { auroraGetStatusTool } from "./get-status.tool.js";
export { auroraListTimelinesTool } from "./list-timelines.tool.js";
export { auroraExportTimelineTool, auroraImportTimelineTool } from "./timeline-io.tool.js";
export { getAuroraManager, resetAuroraManager } from "./manager.js";

import { Tool } from "../../types/index.js";
import { auroraAnalyzeAudioTool } from "./analyze-audio.tool.js";
import { auroraScanDevicesTool } from "./scan-devices.tool.js";
import { auroraProfileDeviceTool } from "./profile-device.tool.js";
import { auroraRenderTimelineTool } from "./render-timeline.tool.js";
import { auroraPlayTimelineTool } from "./play-timeline.tool.js";
import { auroraControlPlaybackTool } from "./control-playback.tool.js";
import { auroraGetStatusTool } from "./get-status.tool.js";
import { auroraListTimelinesTool } from "./list-timelines.tool.js";
import { auroraExportTimelineTool, auroraImportTimelineTool } from "./timeline-io.tool.js";

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
