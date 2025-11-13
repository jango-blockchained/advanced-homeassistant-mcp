/**
 * Unit Tests: Voice Session Manager
 *
 * Tests for voice interaction session management including:
 * - Session creation and lifecycle
 * - Command tracking and history
 * - Context management
 * - Session timeout and cleanup
 * - Statistics and monitoring
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { voiceSessionManager } from "../../src/speech/voiceSessionManager";
import type { VoiceCommand, SessionContext } from "../../src/speech/voiceSessionManager";

describe("VoiceSessionManager", () => {
  let sessionId: string;

  beforeEach(() => {
    // Start a fresh session for each test
    sessionId = voiceSessionManager.startSession("living_room");
  });

  afterEach(() => {
    // Clean up session after each test
    if (sessionId) {
      voiceSessionManager.endSession(sessionId);
      voiceSessionManager.clearSession(sessionId);
    }
  });

  describe("Session Creation and Lifecycle", () => {
    test("should start a new session", () => {
      expect(sessionId).toBeDefined();
      expect(sessionId).toContain("voice_");
    });

    test("should create session with room context", () => {
      const newSessionId = voiceSessionManager.startSession("bedroom");
      const session = voiceSessionManager.getSession(newSessionId);

      expect(session).toBeDefined();
      expect(session?.context.currentRoom).toBe("bedroom");

      voiceSessionManager.endSession(newSessionId);
      voiceSessionManager.clearSession(newSessionId);
    });

    test("should create session without room context", () => {
      const newSessionId = voiceSessionManager.startSession();
      const session = voiceSessionManager.getSession(newSessionId);

      expect(session).toBeDefined();
      expect(session?.context.currentRoom).toBeUndefined();

      voiceSessionManager.endSession(newSessionId);
      voiceSessionManager.clearSession(newSessionId);
    });

    test("should get current session", () => {
      const currentSession = voiceSessionManager.getCurrentSession();

      expect(currentSession).toBeDefined();
      expect(currentSession?.id).toBe(sessionId);
      expect(currentSession?.isActive).toBe(true);
    });

    test("should get session by ID", () => {
      const session = voiceSessionManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });

    test("should end session", () => {
      const result = voiceSessionManager.endSession(sessionId);

      expect(result).toBe(true);

      const session = voiceSessionManager.getSession(sessionId);
      expect(session?.isActive).toBe(false);
    });

    test("should emit session_started event", (done) => {
      voiceSessionManager.once("session_started", (session) => {
        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
        voiceSessionManager.endSession(session.id);
        voiceSessionManager.clearSession(session.id);
        done();
      });

      voiceSessionManager.startSession("test_room");
    });

    test("should emit session_ended event", (done) => {
      const testSessionId = voiceSessionManager.startSession("test_room");

      voiceSessionManager.once("session_ended", (session) => {
        expect(session).toBeDefined();
        expect(session.id).toBe(testSessionId);
        voiceSessionManager.clearSession(testSessionId);
        done();
      });

      voiceSessionManager.endSession(testSessionId);
    });

    test("should clear session", () => {
      const testSessionId = voiceSessionManager.startSession();
      const result = voiceSessionManager.clearSession(testSessionId);

      expect(result).toBe(true);

      const session = voiceSessionManager.getSession(testSessionId);
      expect(session).toBeNull();
    });

    test("should handle ending non-existent session", () => {
      const result = voiceSessionManager.endSession("non_existent_id");
      expect(result).toBe(false);
    });
  });

  describe("Command Management", () => {
    test("should add command to current session", () => {
      const command = voiceSessionManager.addCommand({
        transcription: "Turn on the lights",
        intent: "turn_on",
        action: "turn_on",
        target: "light.living_room",
        success: true,
      });

      expect(command).toBeDefined();
      expect(command.id).toBeDefined();
      expect(command.timestamp).toBeDefined();
      expect(command.transcription).toBe("Turn on the lights");
    });

    test("should throw error when adding command without active session", () => {
      voiceSessionManager.endSession(sessionId);

      expect(() => {
        voiceSessionManager.addCommand({
          transcription: "Test command",
        });
      }).toThrow("No active voice session");
    });

    test("should track command history", () => {
      voiceSessionManager.addCommand({
        transcription: "Command 1",
        success: true,
      });

      voiceSessionManager.addCommand({
        transcription: "Command 2",
        success: true,
      });

      const history = voiceSessionManager.getCommandHistory(sessionId);

      expect(history).toHaveLength(2);
      expect(history[0].transcription).toBe("Command 1");
      expect(history[1].transcription).toBe("Command 2");
    });

    test("should limit command history", () => {
      // Add more than the limit
      for (let i = 0; i < 15; i++) {
        voiceSessionManager.addCommand({
          transcription: `Command ${i}`,
        });
      }

      const history = voiceSessionManager.getCommandHistory(sessionId, 10);

      expect(history).toHaveLength(10);
      expect(history[0].transcription).toBe("Command 5");
      expect(history[9].transcription).toBe("Command 14");
    });

    test("should update session last activity on command add", () => {
      const session = voiceSessionManager.getSession(sessionId);
      const initialActivity = session?.lastActivity ?? 0;

      // Wait a bit
      const waitTime = 50;
      const start = Date.now();
      while (Date.now() - start < waitTime) {
        // Busy wait
      }

      voiceSessionManager.addCommand({
        transcription: "Test command",
      });

      const updatedSession = voiceSessionManager.getSession(sessionId);
      const updatedActivity = updatedSession?.lastActivity ?? 0;

      expect(updatedActivity).toBeGreaterThan(initialActivity);
    });

    test("should emit command_added event", (done) => {
      voiceSessionManager.once("command_added", (command, session) => {
        expect(command).toBeDefined();
        expect(command.transcription).toBe("Test command");
        expect(session).toBeDefined();
        expect(session.id).toBe(sessionId);
        done();
      });

      voiceSessionManager.addCommand({
        transcription: "Test command",
      });
    });

    test("should track command success/failure", () => {
      voiceSessionManager.addCommand({
        transcription: "Success command",
        success: true,
      });

      voiceSessionManager.addCommand({
        transcription: "Failed command",
        success: false,
        error: "Test error",
      });

      const history = voiceSessionManager.getCommandHistory(sessionId);

      expect(history[0].success).toBe(true);
      expect(history[1].success).toBe(false);
      expect(history[1].error).toBe("Test error");
    });
  });

  describe("Context Management", () => {
    test("should update session context", () => {
      const updates: Partial<SessionContext> = {
        currentRoom: "bedroom",
        lastAction: "turn_on",
        recentEntities: ["light.bedroom"],
      };

      const updatedContext = voiceSessionManager.updateContext(sessionId, updates);

      expect(updatedContext).toBeDefined();
      expect(updatedContext?.currentRoom).toBe("bedroom");
      expect(updatedContext?.lastAction).toBe("turn_on");
      expect(updatedContext?.recentEntities).toContain("light.bedroom");
    });

    test("should get session context", () => {
      voiceSessionManager.updateContext(sessionId, {
        currentRoom: "kitchen",
      });

      const context = voiceSessionManager.getContext(sessionId);

      expect(context).toBeDefined();
      expect(context?.currentRoom).toBe("kitchen");
    });

    test("should handle context updates for non-existent session", () => {
      const result = voiceSessionManager.updateContext("invalid_id", {
        currentRoom: "test",
      });

      expect(result).toBeNull();
    });

    test("should track recent entities", () => {
      voiceSessionManager.updateContext(sessionId, {
        recentEntities: ["light.living_room", "light.bedroom"],
      });

      voiceSessionManager.updateContext(sessionId, {
        recentEntities: ["light.kitchen"],
      });

      const entities = voiceSessionManager.getRecentEntities(sessionId);

      expect(entities).toContain("light.living_room");
      expect(entities).toContain("light.bedroom");
      expect(entities).toContain("light.kitchen");
    });

    test("should limit recent entities", () => {
      const manyEntities = Array.from({ length: 25 }, (_, i) => `light.room_${i}`);

      voiceSessionManager.updateContext(sessionId, {
        recentEntities: manyEntities,
      });

      const entities = voiceSessionManager.getRecentEntities(sessionId);

      expect(entities.length).toBeLessThanOrEqual(20);
    });

    test("should deduplicate recent entities", () => {
      voiceSessionManager.updateContext(sessionId, {
        recentEntities: ["light.living_room", "light.living_room", "light.bedroom"],
      });

      const entities = voiceSessionManager.getRecentEntities(sessionId);

      const uniqueEntities = new Set(entities);
      expect(uniqueEntities.size).toBe(entities.length);
    });

    test("should emit context_updated event", (done) => {
      voiceSessionManager.once("context_updated", (context, session) => {
        expect(context).toBeDefined();
        expect(context.currentRoom).toBe("office");
        expect(session).toBeDefined();
        done();
      });

      voiceSessionManager.updateContext(sessionId, {
        currentRoom: "office",
      });
    });
  });

  describe("Session Activity and Timeout", () => {
    test("should check if session is active", () => {
      const isActive = voiceSessionManager.isSessionActive(sessionId);
      expect(isActive).toBe(true);
    });

    test("should return false for non-existent session", () => {
      const isActive = voiceSessionManager.isSessionActive("invalid_id");
      expect(isActive).toBe(false);
    });

    test("should track last activity time", () => {
      const session = voiceSessionManager.getSession(sessionId);
      const initialActivity = session?.lastActivity ?? 0;

      voiceSessionManager.updateContext(sessionId, {
        lastAction: "test",
      });

      const updatedSession = voiceSessionManager.getSession(sessionId);
      const updatedActivity = updatedSession?.lastActivity ?? 0;

      expect(updatedActivity).toBeGreaterThanOrEqual(initialActivity);
    });

    test("should get active sessions", () => {
      const session1 = voiceSessionManager.startSession("room1");
      const session2 = voiceSessionManager.startSession("room2");
      voiceSessionManager.endSession(session2);

      const activeSessions = voiceSessionManager.getActiveSessions();

      expect(activeSessions.length).toBeGreaterThanOrEqual(2); // At least our sessions
      expect(activeSessions.some(s => s.id === sessionId)).toBe(true);
      expect(activeSessions.some(s => s.id === session1)).toBe(true);
      expect(activeSessions.every(s => s.isActive)).toBe(true);

      voiceSessionManager.endSession(session1);
      voiceSessionManager.clearSession(session1);
      voiceSessionManager.clearSession(session2);
    });
  });

  describe("Session Statistics", () => {
    test("should get session statistics", () => {
      voiceSessionManager.addCommand({
        transcription: "Command 1",
        success: true,
      });

      voiceSessionManager.addCommand({
        transcription: "Command 2",
        success: true,
      });

      voiceSessionManager.addCommand({
        transcription: "Command 3",
        success: false,
        error: "Test error",
      });

      const stats = voiceSessionManager.getSessionStats(sessionId);

      expect(stats).toBeDefined();
      expect(stats?.sessionId).toBe(sessionId);
      expect(stats?.commandCount).toBe(3);
      expect(stats?.successCount).toBe(2);
      expect(stats?.errorCount).toBe(1);
      expect(stats?.successRate).toBeCloseTo(66.67, 1);
      expect(stats?.isActive).toBe(true);
    });

    test("should calculate success rate correctly", () => {
      for (let i = 0; i < 10; i++) {
        voiceSessionManager.addCommand({
          transcription: `Command ${i}`,
          success: i < 8, // 80% success rate
        });
      }

      const stats = voiceSessionManager.getSessionStats(sessionId);

      expect(stats?.successRate).toBeCloseTo(80, 0);
    });

    test("should handle stats for session with no commands", () => {
      const newSessionId = voiceSessionManager.startSession();
      const stats = voiceSessionManager.getSessionStats(newSessionId);

      expect(stats?.commandCount).toBe(0);
      expect(stats?.successCount).toBe(0);
      expect(stats?.errorCount).toBe(0);
      expect(stats?.successRate).toBe(0);

      voiceSessionManager.endSession(newSessionId);
      voiceSessionManager.clearSession(newSessionId);
    });

    test("should return null stats for non-existent session", () => {
      const stats = voiceSessionManager.getSessionStats("invalid_id");
      expect(stats).toBeNull();
    });

    test("should track session duration", () => {
      // Wait a bit
      const waitTime = 100;
      const start = Date.now();
      while (Date.now() - start < waitTime) {
        // Busy wait
      }

      const stats = voiceSessionManager.getSessionStats(sessionId);

      expect(stats?.duration).toBeGreaterThan(0);
    });
  });

  describe("Command History Queries", () => {
    beforeEach(() => {
      // Add some test commands
      for (let i = 0; i < 5; i++) {
        voiceSessionManager.addCommand({
          transcription: `Test command ${i}`,
          intent: i % 2 === 0 ? "turn_on" : "turn_off",
          success: i !== 3, // Fail the 4th command
        });
      }
    });

    test("should get command history with default limit", () => {
      const history = voiceSessionManager.getCommandHistory(sessionId);

      expect(history).toHaveLength(5);
    });

    test("should get command history with custom limit", () => {
      const history = voiceSessionManager.getCommandHistory(sessionId, 3);

      expect(history).toHaveLength(3);
      expect(history[0].transcription).toBe("Test command 2");
    });

    test("should return empty array for non-existent session", () => {
      const history = voiceSessionManager.getCommandHistory("invalid_id");

      expect(history).toHaveLength(0);
    });

    test("should get recent entities for non-existent session", () => {
      const entities = voiceSessionManager.getRecentEntities("invalid_id");

      expect(entities).toHaveLength(0);
    });
  });

  describe("Multiple Sessions", () => {
    test("should manage multiple concurrent sessions", () => {
      const session1 = voiceSessionManager.startSession("room1");
      const session2 = voiceSessionManager.startSession("room2");
      const session3 = voiceSessionManager.startSession("room3");

      expect(voiceSessionManager.getSession(session1)).toBeDefined();
      expect(voiceSessionManager.getSession(session2)).toBeDefined();
      expect(voiceSessionManager.getSession(session3)).toBeDefined();

      voiceSessionManager.endSession(session1);
      voiceSessionManager.endSession(session2);
      voiceSessionManager.endSession(session3);
      voiceSessionManager.clearSession(session1);
      voiceSessionManager.clearSession(session2);
      voiceSessionManager.clearSession(session3);
    });

    test("should track current session correctly", () => {
      const session1 = voiceSessionManager.startSession("room1");
      const session2 = voiceSessionManager.startSession("room2");

      // Current session should be the last started one
      const currentSession = voiceSessionManager.getCurrentSession();
      expect(currentSession?.id).toBe(session2);

      voiceSessionManager.endSession(session1);
      voiceSessionManager.endSession(session2);
      voiceSessionManager.clearSession(session1);
      voiceSessionManager.clearSession(session2);
    });

    test("should isolate commands between sessions", () => {
      const session1 = voiceSessionManager.startSession("room1");
      
      voiceSessionManager.addCommand({
        transcription: "Session 1 command",
      });

      const session2 = voiceSessionManager.startSession("room2");
      
      voiceSessionManager.addCommand({
        transcription: "Session 2 command",
      });

      const history1 = voiceSessionManager.getCommandHistory(session1);
      const history2 = voiceSessionManager.getCommandHistory(session2);

      expect(history1).toHaveLength(1);
      expect(history1[0].transcription).toBe("Session 1 command");

      expect(history2).toHaveLength(1);
      expect(history2[0].transcription).toBe("Session 2 command");

      voiceSessionManager.endSession(session1);
      voiceSessionManager.endSession(session2);
      voiceSessionManager.clearSession(session1);
      voiceSessionManager.clearSession(session2);
    });
  });

  describe("Edge Cases", () => {
    test("should handle session ID collisions gracefully", () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const newSessionId = voiceSessionManager.startSession();
        ids.add(newSessionId);
        voiceSessionManager.endSession(newSessionId);
        voiceSessionManager.clearSession(newSessionId);
      }

      // All IDs should be unique
      expect(ids.size).toBe(100);
    });

    test("should handle rapid session creation and deletion", () => {
      const sessionIds: string[] = [];

      for (let i = 0; i < 10; i++) {
        sessionIds.push(voiceSessionManager.startSession(`room_${i}`));
      }

      for (const id of sessionIds) {
        voiceSessionManager.endSession(id);
        voiceSessionManager.clearSession(id);
      }

      // Verify all sessions are cleaned up
      for (const id of sessionIds) {
        expect(voiceSessionManager.getSession(id)).toBeNull();
      }
    });

    test("should handle context update with undefined session ID", () => {
      const result = voiceSessionManager.updateContext(undefined, {
        currentRoom: "test",
      });

      // Should use current session
      expect(result).not.toBeNull();
    });

    test("should handle getting context with undefined session ID", () => {
      const context = voiceSessionManager.getContext(undefined);

      // Should use current session
      expect(context).not.toBeNull();
    });

    test("should handle empty command history request", () => {
      const newSessionId = voiceSessionManager.startSession();
      const history = voiceSessionManager.getCommandHistory(newSessionId);

      expect(history).toHaveLength(0);

      voiceSessionManager.endSession(newSessionId);
      voiceSessionManager.clearSession(newSessionId);
    });
  });
});
