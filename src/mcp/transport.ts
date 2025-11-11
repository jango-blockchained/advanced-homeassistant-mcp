/**
 * Base Transport for MCP
 *
 * This module provides a base class for all transport implementations.
 */

import {
  TransportLayer,
  MCPRequest,
  MCPResponse,
  MCPStreamPart,
  MCPNotification,
} from "./types.js";

/**
 * Abstract base class for all transports
 */
export abstract class BaseTransport implements TransportLayer {
  public name: string = "base";
  protected handler: ((request: MCPRequest) => Promise<MCPResponse>) | null = null;

  /**
   * Initialize the transport with a request handler
   */
  public initialize(handler: (request: MCPRequest) => Promise<MCPResponse>): void {
    this.handler = handler;
  }

  /**
   * Start the transport
   */
  public abstract start(): Promise<void>;

  /**
   * Stop the transport
   */
  public abstract stop(): Promise<void>;

  /**
   * Send a notification to a client
   */
  public sendNotification?(notification: MCPNotification): void;

  /**
   * Send a streaming response part
   */
  public sendStreamPart?(streamPart: MCPStreamPart): void;
}
