import { EventEmitter } from "events";

export class LiteMCP extends EventEmitter {
  private static instance: LiteMCP;
  private constructor() {
    super();
    // Initialize with default configuration
    this.configure({});
  }

  public static getInstance(): LiteMCP {
    if (!LiteMCP.instance) {
      LiteMCP.instance = new LiteMCP();
    }
    return LiteMCP.instance;
  }

  public configure(config: Record<string, any>): void {
    // Store configuration
    this.config = {
      ...this.defaultConfig,
      ...config,
    };
  }

  private config: Record<string, any> = {};
  private defaultConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 5000,
  };

  public execute(command: string, params: Record<string, any> = {}): Promise<any> {
    try {
      // Emit command execution event
      this.emit("command", { command, params });

      // Execute command logic here. processCommand is sync today; if it
      // ever needs to do async work we'll re-add the await.
      const result = this.processCommand(command, params);

      // Emit success event
      this.emit("success", { command, params, result });

      return Promise.resolve(result);
    } catch (error) {
      // Emit error event
      this.emit("error", { command, params, error });
      return Promise.reject(error as Error);
    }
  }

  private processCommand(command: string, params: Record<string, any>): { command: string; params: Record<string, any>; status: string } {
    // Command processing logic
    return { command, params, status: "processed" };
  }

  public shutdown(): Promise<void> {
    // Cleanup logic
    this.removeAllListeners();
    return Promise.resolve();
  }
}
