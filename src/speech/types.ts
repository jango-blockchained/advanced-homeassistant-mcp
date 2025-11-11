import { EventEmitter } from "events";

export interface IWakeWordDetector {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
}

export interface ISpeechToText extends EventEmitter {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  transcribe(audioData: Buffer): Promise<string>;
}

export interface SpeechToTextConfig {
  modelPath: string;
  modelType: string;
  containerName?: string;
}
