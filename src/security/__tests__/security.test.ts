import { describe, expect, it, beforeEach } from "bun:test";
import { TokenManager } from "../index";
import { SignJWT, jwtVerify } from "jose";

const validSecret = "test_secret_that_is_at_least_32_chars_long";
const testIp = "127.0.0.1";
const encoder = new TextEncoder();

describe("Security Module", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = validSecret;
    // Reset failed attempts map. `TokenManager.failedAttempts` is a getter
    // returning the live Map; mutate via .clear() rather than reassigning
    // (which would throw because the property has no setter).
    TokenManager.failedAttempts.clear();
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

    it("should validate tokens correctly", async () => {
      const payload: Record<string, unknown> = { userId: "123", role: "user" };
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(encoder.encode(validSecret));
      const result = await TokenManager.validateToken(token, testIp);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify payload separately
      const { payload: decoded } = await jwtVerify(token, encoder.encode(validSecret));
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });

    it("should handle empty tokens", async () => {
      const result = await TokenManager.validateToken("", testIp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token format");
    });

    it("should handle expired tokens", async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: Record<string, unknown> = {
        userId: "123",
        role: "user",
        iat: now - 3600, // issued 1 hour ago
        exp: now - 1800, // expired 30 minutes ago
      };
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .sign(encoder.encode(validSecret));
      const result = await TokenManager.validateToken(token, testIp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token has expired");
    });

    it("should handle token tampering", async () => {
      // Use a different IP for this test to avoid rate limiting
      const uniqueIp = "192.168.1.1";
      const payload: Record<string, unknown> = { userId: "123", role: "user" };
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(encoder.encode(validSecret));
      const tamperedToken = token.slice(0, -5) + "xxxxx"; // Tamper with signature

      const result = await TokenManager.validateToken(tamperedToken, uniqueIp);
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
      TokenManager.failedAttempts.clear();
    });

    it("should track failed attempts by IP", async () => {
      const invalidToken = "x".repeat(64);
      const ip1 = "1.1.1.1";
      const ip2 = "2.2.2.2";

      // Make a single failed attempt for each IP
      await TokenManager.validateToken(invalidToken, ip1);
      await TokenManager.validateToken(invalidToken, ip2);

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

      // Source semantics: isRateLimited() runs BEFORE recordFailedAttempt(),
      // so the first MAX_FAILED_ATTEMPTS calls all hit the verify path and
      // get "Invalid token signature"; the (MAX+1)th call sees count=MAX and
      // returns the rate-limit error instead. With MAX_FAILED_ATTEMPTS=5,
      // attempts 1-5 fail with the signature error and #6 is rate limited.
      for (let i = 0; i < 5; i++) {
        const result = await TokenManager.validateToken(invalidToken, uniqueIp);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid token signature");
      }

      const sixth = await TokenManager.validateToken(invalidToken, uniqueIp);
      expect(sixth.valid).toBe(false);
      expect(sixth.error).toBe("Too many failed attempts. Please try again later.");

      // The lockout window is the production 15 minutes — we can't wait that
      // out in a unit test, so simulate elapsed time by aging the entry.
      const record = TokenManager.failedAttempts.get(uniqueIp)!;
      record.lastAttempt = Date.now() - (15 * 60 * 1000 + 1000);

      // After window expires, should get the normal verify error again.
      const finalResult = await TokenManager.validateToken(invalidToken, uniqueIp);
      expect(finalResult.valid).toBe(false);
      expect(finalResult.error).toBe("Invalid token signature");
    });

    it("should reset rate limits after window expires", async () => {
      const invalidToken = "x".repeat(64);
      const uniqueIp = "172.16.0.1";

      // Make some failed attempts (still under the limit).
      for (let i = 0; i < 3; i++) {
        const result = await TokenManager.validateToken(invalidToken, uniqueIp);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid token signature");
      }

      // Age the entry past the lockout window — `isRateLimited` also
      // deletes-on-expiry, so the next attempt starts a fresh count.
      const record = TokenManager.failedAttempts.get(uniqueIp)!;
      record.lastAttempt = Date.now() - (15 * 60 * 1000 + 1000);

      const result = await TokenManager.validateToken(invalidToken, uniqueIp);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token signature");

      // Counter should have reset and recorded one fresh attempt.
      expect(TokenManager.failedAttempts.has(uniqueIp)).toBe(true);
      expect(TokenManager.failedAttempts.get(uniqueIp)!.count).toBe(1);
    });
  });
});
