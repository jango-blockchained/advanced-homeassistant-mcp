declare module "node-record-lpcm16" {
  import { Readable } from "stream";

  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    audioType?: string;
    threshold?: number;
    thresholdStart?: number;
    thresholdEnd?: number;
    silence?: number;
    verbose?: boolean;
    recordProgram?: string;
  }

  interface Recording {
    stream(): Readable;
    stop(): void;
  }

  export function record(options?: RecordOptions): Recording;
}
