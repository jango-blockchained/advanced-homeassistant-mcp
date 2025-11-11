import { describe, expect, it, beforeEach } from "bun:test";
import { TokenManager } from "../index";
import jwt from "jsonwebtoken";

const validSecret = "test_secret_that_is_at_least_32_chars_long";
const testIp = "127.0.0.1";

// Mock the rate limit window for faster tests
const MOCK_RATE_LIMIT_WINDOW = 100; // 100ms instead of 15 minutes

describe("Security Module", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = validSecret;
    // Reset failed attempts map
    (TokenManager as any).failedAttempts = new Map();
    // Mock the security config
    (TokenManager as any).SECURITY_CONFIG = {
      ...(TokenManager as any).SECURITY_CONFIG,
      LOCKOUT_DURATION: MOCK_RATE_LIMIT_WINDOW,
      MAX_FAILED_ATTEMPTS: 5,
      MAX_TOKEN_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  });

  describe("TokenManager", () => {
    it("should encrypt and decrypt tokens", () => {
      const originalToken = "test-token";
      const encryptedToken = TokenManager.encryptToken(originalToken, validSecret);
      expect(encryptedToken).toBeDefined();
      expect(encryptedToken.includes(originalToken)).toBe(false);

      const decryptedToken = TokenManager.decryptToken(encryptedToken, validSecret);
      expect(decryptedToken).toBeDefined();
      expect(decryptedToken).toBe(originalToken);
    });

    it("should validate tokens correctly", () => {
      const payload = { userId: "123", role: "user" };
      const token = jwt.sign(payload, validSecret, { expiresIn: "1h" });
      const result = TokenManager.validateToken(token, testIp);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify payload separately
      const decoded = jwt.verify(token, validSecret) as typeof payload;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });

    it("should handle empty tokens", () => {
      const result = TokenManager.validateToken("", testIp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token format");
    });

    it("should handle expired tokens", () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        userId: "123",
        role: "user",
        iat: now - 3600, // issued 1 hour ago
        exp: now - 1800, // expired 30 minutes ago
      };
      const token = jwt.sign(payload, validSecret);
      const result = TokenManager.validateToken(token, testIp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token has expired");
    });

    it("should handle token tampering", () => {
      // Use a different IP for this test to avoid rate limiting
      const uniqueIp = "192.168.1.1";
      const payload = { userId: "123", role: "user" };
      const token = jwt.sign(payload, validSecret);
      const tamperedToken = token.slice(0, -5) + "xxxxx"; // Tamper with signature

      const result = TokenManager.validateToken(tamperedToken, uniqueIp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token signature");
    });
  });

  describe("Token Encryption", () => {
    it("should use different IVs for same token", () => {
      const token = "test-token";
      const encrypted1 = TokenManager.encryptToken(token, validSecret);
      const encrypted2 = TokenManager.encryptToken(token, validSecret);
      expect(encrypted1).toBeDefined();
      expect(encrypted2).toBeDefined();
      expect(encrypted1 === encrypted2).toBe(false);
    });

    it("should handle large tokens", () => {
      const largeToken = "x".repeat(1024);
      const encrypted = TokenManager.encryptToken(largeToken, validSecret);
      const decrypted = TokenManager.decryptToken(encrypted, validSecret);
      expect(decrypted).toBe(largeToken);
    });

    it("should fail gracefully with invalid encrypted data", () => {
      expect(() => TokenManager.decryptToken("invalid-encrypted-data", validSecret)).toThrow(
        "Invalid encrypted token",
      );
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      // Reset failed attempts before each test
      (TokenManager as any).failedAttempts = new Map();
    });

    it("should track failed attempts by IP", () => {
      const invalidToken = "x".repeat(64);
      const ip1 = "1.1.1.1";
      const ip2 = "2.2.2.2";

      // Make a single failed attempt for each IP
      TokenManager.validateToken(invalidToken, ip1);
      TokenManager.validateToken(invalidToken, ip2);

      const attempts = (TokenManager as any).failedAttempts;
      expect(attempts.has(ip1)).toBe(true);
      expect(attempts.has(ip2)).toBe(true);
      expect(attempts.get(ip1).count).toBe(1);
      expect(attempts.get(ip2).count).toBe(1);
      expect(attempts.get(ip1).lastAttempt).toBeGreaterThan(0);
      expect(attempts.get(ip2).lastAttempt).toBeGreaterThan(0);
    });

    it("should handle rate limiting for failed attempts", async () => {
      const invalidToken = "x".repeat(64);
      const uniqueIp = "10.0.0.1";

      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        const result = TokenManager.validateToken(invalidToken, uniqueIp);
        expect(result.valid).toBe(false);
        if (i < 4) {
          expect(result.error).toBe("Invalid token signature");
        } else {
          expect(result.error).toBe("Too many failed attempts. Please try again later.");
        }
      }

      // Next attempt should be rate limited
      const result = TokenManager.validateToken(invalidToken, uniqueIp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Too many failed attempts. Please try again later.");

      // Wait for rate limit window to expire
      await new Promise((resolve) => setTimeout(resolve, MOCK_RATE_LIMIT_WINDOW + 50));

      // After window expires, should get normal error again
      const finalResult = TokenManager.validateToken(invalidToken, uniqueIp);
      expect(finalResult.valid).toBe(false);
      expect(finalResult.error).toBe("Invalid token signature");
    });

    it("should reset rate limits after window expires", async () => {
      const invalidToken = "x".repeat(64);
      const uniqueIp = "172.16.0.1";

      // Make some failed attempts
      for (let i = 0; i < 3; i++) {
        const result = TokenManager.validateToken(invalidToken, uniqueIp);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid token signature");
      }

      // Wait for rate limit window to expire
      await new Promise((resolve) => setTimeout(resolve, MOCK_RATE_LIMIT_WINDOW + 50));

      // After window expires, should get normal error
      const result = TokenManager.validateToken(invalidToken, uniqueIp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token signature");

      // Should have one new attempt recorded
      const attempts = (TokenManager as any).failedAttempts;
      expect(attempts.has(uniqueIp)).toBe(true);
      expect(attempts.get(uniqueIp).count).toBe(1);
    });
  });
});
