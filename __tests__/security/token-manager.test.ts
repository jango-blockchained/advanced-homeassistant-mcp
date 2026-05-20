import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { TokenManager } from '../../src/security/index.js';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret-that-is-long-enough-for-testing-purposes';

describe('TokenManager', () => {
    beforeAll(() => {
        process.env.JWT_SECRET = TEST_SECRET;
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    const encryptionKey = 'test-encryption-key-32-chars-long!!';
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    describe('Token Encryption/Decryption', () => {
        test('should encrypt and decrypt tokens successfully', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            const decrypted = TokenManager.decryptToken(encrypted, encryptionKey);
            expect(decrypted).toBe(validToken);
        });

        test('should generate different encrypted values for same token', () => {
            const encrypted1 = TokenManager.encryptToken(validToken, encryptionKey);
            const encrypted2 = TokenManager.encryptToken(validToken, encryptionKey);
            expect(encrypted1).not.toBe(encrypted2);
        });

        test('should handle empty tokens', () => {
            expect(() => TokenManager.encryptToken('', encryptionKey)).toThrow('Invalid token');
            expect(() => TokenManager.decryptToken('', encryptionKey)).toThrow('Invalid encrypted token');
        });

        test('should handle empty encryption keys', () => {
            expect(() => TokenManager.encryptToken(validToken, '')).toThrow('Invalid encryption key');
            expect(() => TokenManager.decryptToken(validToken, '')).toThrow('Invalid encryption key');
        });

        test('should fail decryption with wrong key', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            expect(() => TokenManager.decryptToken(encrypted, 'wrong-key-32-chars-long!!!!!!!!')).toThrow();
        });
    });

    describe('Token Validation', () => {
        test('should validate correct tokens', () => {
            const payload = { sub: '123', name: 'Test User', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 };
            const token = jwt.sign(payload, TEST_SECRET);
            const result = TokenManager.validateToken(token);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('should reject expired tokens', () => {
            const payload = { sub: '123', name: 'Test User', iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 };
            const token = jwt.sign(payload, TEST_SECRET);
            const result = TokenManager.validateToken(token);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Token has expired');
        });

        test('should reject malformed tokens', () => {
            const result = TokenManager.validateToken('invalid-token');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Token length below minimum requirement');
        });

        test('should reject tokens with invalid signature', () => {
            const payload = { sub: '123', name: 'Test User', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 };
            const token = jwt.sign(payload, 'different-secret');
            const result = TokenManager.validateToken(token);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid token signature');
        });

        test('should handle tokens with missing expiration', () => {
            const payload = { sub: '123', name: 'Test User' };
            const token = jwt.sign(payload, TEST_SECRET);
            const result = TokenManager.validateToken(token);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Token missing required claims');
        });

        test('should handle undefined and null inputs', () => {
            const undefinedResult = TokenManager.validateToken(undefined);
            expect(undefinedResult.valid).toBe(false);
            expect(undefinedResult.error).toBe('Invalid token format');

            const nullResult = TokenManager.validateToken(null);
            expect(nullResult.valid).toBe(false);
            expect(nullResult.error).toBe('Invalid token format');
        });
    });

    describe('Security Features', () => {
        test('should use secure encryption algorithm', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            expect(encrypted).toContain('aes-256-gcm');
        });

        test('should prevent token tampering', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            const tampered = encrypted.slice(0, -5) + 'xxxxx';
            expect(() => TokenManager.decryptToken(tampered, encryptionKey)).toThrow();
        });

        test('should use unique IVs for each encryption', () => {
            const encrypted1 = TokenManager.encryptToken(validToken, encryptionKey);
            const encrypted2 = TokenManager.encryptToken(validToken, encryptionKey);
            const iv1 = encrypted1.split(':')[1];
            const iv2 = encrypted2.split(':')[1];
            expect(iv1).not.toBe(iv2);
        });

        test('should handle large tokens', () => {
            const largeToken = 'x'.repeat(10000);
            const encrypted = TokenManager.encryptToken(largeToken, encryptionKey);
            const decrypted = TokenManager.decryptToken(encrypted, encryptionKey);
            expect(decrypted).toBe(largeToken);
        });
    });

    describe('Error Handling', () => {
        test('should throw descriptive errors for invalid inputs', () => {
            // Cast through unknown to satisfy strict typings while still
            // exercising the runtime null-input path the source guards.
            expect(() => TokenManager.encryptToken(null as unknown as string, encryptionKey)).toThrow('Invalid token');
            expect(() => TokenManager.encryptToken(validToken, null as unknown as string)).toThrow('Invalid encryption key');
            expect(() => TokenManager.decryptToken('invalid-base64', encryptionKey)).toThrow('Invalid encrypted token');
        });

        test('should handle corrupted encrypted data', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            const corrupted = encrypted.replace(/[a-zA-Z]/g, 'x');
            expect(() => TokenManager.decryptToken(corrupted, encryptionKey)).toThrow();
        });

        test('should handle invalid base64 input', () => {
            expect(() => TokenManager.decryptToken('not-base64!@#$%^', encryptionKey)).toThrow();
        });
    });
}); 