/**
 * Voice Session Manager
 *
 * Manages voice interaction sessions including:
 * - Session tracking and lifecycle
 * - Command history for context
 * - Multi-turn conversation support
 * - Session state and context preservation
 * - Timeout management
 */

import { EventEmitter } from "events";
import { logger } from "../utils/logger.js";

export interface VoiceCommand {
  id: string;
  timestamp: number;
  transcription: string;
  intent?: string;
  action?: string;
  target?: string;
  success?: boolean;
  error?: string;
}

export interface SessionContext {
  currentRoom?: string;
  lastAction?: string;
  recentEntities: string[];
  recentCommands: VoiceCommand[];
}

export interface VoiceSession {
  id: string;
  createdAt: number;
  lastActivity: number;
  context: SessionContext;
  commands: VoiceCommand[];
  isActive: boolean;
}

/**
 * Voice Session Manager - Singleton pattern
 */
class VoiceSessionManager extends EventEmitter {
  private static instance: VoiceSessionManager | null = null;
  private sessions: Map<string, VoiceSession> = new Map();
  private currentSessionId: string | null = null;
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_HISTORY = 50; // Keep last 50 commands
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    // Start periodic cleanup of inactive sessions
    this.startCleanupInterval();
    logger.info("VoiceSessionManager initialized");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): VoiceSessionManager {
    if (!VoiceSessionManager.instance) {
      VoiceSessionManager.instance = new VoiceSessionManager();
    }
    return VoiceSessionManager.instance;
  }

  /**
   * Start a new voice session
   */
  public startSession(room?: string): string {
    const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: VoiceSession = {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      context: {
        currentRoom: room,
        recentEntities: [],
        recentCommands: [],
      },
      commands: [],
      isActive: true,
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    logger.info(`Voice session started: ${sessionId}`, { room });
    this.emit("session_started", session);

    return sessionId;
  }

  /**
   * End the current voice session
   */
  public endSession(sessionId?: string): boolean {
    const id = sessionId ?? this.currentSessionId;
    if (typeof id !== "string") {
      return false;
    }

    const session = this.sessions.get(id);
    if (!session) {
      return false;
    }

    session.isActive = false;
    session.lastActivity = Date.now();

    logger.info(`Voice session ended: ${id}`, {
      duration: Date.now() - session.createdAt,
      commandCount: session.commands.length,
    });
    this.emit("session_ended", session);

    if (id === this.currentSessionId) {
      this.currentSessionId = null;
    }

    return true;
  }

  /**
   * Get current session
   */
  public getCurrentSession(): VoiceSession | null {
    if (typeof this.currentSessionId !== "string") {
      return null;
    }
    return this.sessions.get(this.currentSessionId) ?? null;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): VoiceSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Add command to current session
   */
  public addCommand(command: Omit<VoiceCommand, "id" | "timestamp">): VoiceCommand {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error("No active voice session");
    }

    const voiceCommand: VoiceCommand = {
      ...command,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    session.commands.push(voiceCommand);
    session.context.recentCommands.push(voiceCommand);

    // Keep only recent commands
    if (session.context.recentCommands.length > 10) {
      session.context.recentCommands.shift();
    }

    session.lastActivity = Date.now();

    logger.debug(`Command added to session ${session.id}:`, {
      intent: command.intent,
      transcription: command.transcription,
    });
    this.emit("command_added", voiceCommand, session);

    return voiceCommand;
  }

  /**
   * Update session context (room, entities, etc.)
   */
  public updateContext(
    sessionId: string | undefined,
    updates: Partial<SessionContext>,
  ): SessionContext | null {
    const id = sessionId ?? this.currentSessionId;
    if (typeof id !== "string") {
      return null;
    }

    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }

    // Update context fields
    if (updates.currentRoom !== undefined) {
      session.context.currentRoom = updates.currentRoom;
    }

    if (updates.lastAction !== undefined) {
      session.context.lastAction = updates.lastAction;
    }

    if (updates.recentEntities) {
      session.context.recentEntities = [
        ...new Set([...session.context.recentEntities, ...updates.recentEntities]),
      ].slice(-20); // Keep last 20 entities
    }

    session.lastActivity = Date.now();

    logger.debug(`Context updated for session ${id}:`, updates);
    this.emit("context_updated", session.context, session);

    return session.context;
  }

  /**
   * Get session context
   */
  public getContext(sessionId?: string): SessionContext | null {
    const id = sessionId ?? this.currentSessionId;
    if (typeof id !== "string") {
      return null;
    }

    const session = this.sessions.get(id);
    return session?.context ?? null;
  }

  /**
   * Get command history
   */
  public getCommandHistory(sessionId?: string, limit: number = 10): VoiceCommand[] {
    const id = sessionId ?? this.currentSessionId;
    if (typeof id !== "string") {
      return [];
    }

    const session = this.sessions.get(id);
    if (!session) {
      return [];
    }

    return session.commands.slice(-limit);
  }

  /**
   * Get recent entities mentioned in commands
   */
  public getRecentEntities(sessionId?: string): string[] {
    const id = sessionId ?? this.currentSessionId;
    if (typeof id !== "string") {
      return [];
    }

    const session = this.sessions.get(id);
    return session?.context.recentEntities ?? [];
  }

  /**
   * Check if session is still active (not timed out)
   */
  public isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const timeSinceLastActivity = Date.now() - session.lastActivity;
    const isTimeout = timeSinceLastActivity > this.SESSION_TIMEOUT;

    if (isTimeout && session.isActive) {
      logger.info(`Session ${sessionId} timed out after ${timeSinceLastActivity}ms`);
      this.endSession(sessionId);
      this.emit("session_timeout", session);
      return false;
    }

    return session.isActive;
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): VoiceSession[] {
    const now = Date.now();
    const active: VoiceSession[] = [];

    for (const session of this.sessions.values()) {
      const timeSinceLastActivity = now - session.lastActivity;
      if (timeSinceLastActivity <= this.SESSION_TIMEOUT && session.isActive) {
        active.push(session);
      }
    }

    return active;
  }

  /**
   * Get session statistics
   */
  public getSessionStats(sessionId?: string): Record<string, unknown> | null {
    const id = sessionId ?? this.currentSessionId;
    if (typeof id !== "string") {
      return null;
    }

    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }

    const successCount = session.commands.filter((cmd) => cmd.success === true).length;
    const errorCount = session.commands.filter((cmd) => cmd.success !== true).length;
    const duration = Date.now() - session.createdAt;

    return {
      sessionId: session.id,
      duration,
      commandCount: session.commands.length,
      successCount,
      errorCount,
      successRate: session.commands.length > 0 ? (successCount / session.commands.length) * 100 : 0,
      room: session.context.currentRoom,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
    };
  }

  /**
   * Clear session (for cleanup)
   */
  public clearSession(sessionId: string): boolean {
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    return this.sessions.delete(sessionId);
  }

  /**
   * Start periodic cleanup of old sessions
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [id, session] of this.sessions.entries()) {
        const timeSinceLastActivity = now - session.lastActivity;
        if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
          logger.debug(`Cleaning up inactive session: ${id}`);
          this.sessions.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} inactive voice sessions`);
        this.emit("cleanup", cleanedCount);
      }
    }, 60000); // Check every minute
  }

  /**
   * Shutdown manager
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // End all active sessions
    for (const session of this.sessions.values()) {
      if (session.isActive) {
        this.endSession(session.id);
      }
    }

    this.sessions.clear();
    this.removeAllListeners();

    logger.info("VoiceSessionManager shut down");
  }
}

export const voiceSessionManager = VoiceSessionManager.getInstance();
