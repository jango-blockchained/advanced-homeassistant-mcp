import { TokenManager } from '../../src/security/index.js';

describe('TokenManager', () => {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNzE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const encryptionKey = 'test_encryption_key_12345';

    describe('Token Encryption/Decryption', () => {
        it('should encrypt and decrypt tokens successfully', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            const decrypted = TokenManager.decryptToken(encrypted, encryptionKey);
            expect(decrypted).toBe(validToken);
        });

        it('should generate different encrypted values for same token', () => {
            const encrypted1 = TokenManager.encryptToken(validToken, encryptionKey);
            const encrypted2 = TokenManager.encryptToken(validToken, encryptionKey);
            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should handle empty tokens', () => {
            expect(() => TokenManager.encryptToken('', encryptionKey)).toThrow();
        });

        it('should handle empty encryption keys', () => {
            expect(() => TokenManager.encryptToken(validToken, '')).toThrow();
        });

        it('should fail decryption with wrong key', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            expect(() => TokenManager.decryptToken(encrypted, 'wrong_key')).toThrow();
        });
    });

    describe('Token Validation', () => {
        it('should validate correct tokens', () => {
            expect(TokenManager.validateToken(validToken)).toBe(true);
        });

        it('should reject expired tokens', () => {
            expect(TokenManager.validateToken(expiredToken)).toBe(false);
        });

        it('should reject malformed tokens', () => {
            const malformedTokens = [
                'not.a.token',
                'invalid-token-format',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
                '',
                'null',
                'undefined'
            ];

            malformedTokens.forEach(token => {
                expect(TokenManager.validateToken(token)).toBe(false);
            });
        });

        it('should reject tokens with invalid signature', () => {
            const tamperedToken = validToken.slice(0, -1) + 'X';
            expect(TokenManager.validateToken(tamperedToken)).toBe(false);
        });

        it('should handle tokens with missing expiration', () => {
            const tokenWithoutExp = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
            expect(TokenManager.validateToken(tokenWithoutExp)).toBe(true);
        });
    });

    describe('Security Features', () => {
        it('should use secure encryption algorithm', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 format
            expect(encrypted.length).toBeGreaterThan(validToken.length); // Should include IV and tag
        });

        it('should prevent token tampering', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            const tampered = encrypted.slice(0, -1) + 'X';
            expect(() => TokenManager.decryptToken(tampered, encryptionKey)).toThrow();
        });

        it('should use unique IVs for each encryption', () => {
            const encrypted1 = TokenManager.encryptToken(validToken, encryptionKey);
            const encrypted2 = TokenManager.encryptToken(validToken, encryptionKey);
            const encrypted3 = TokenManager.encryptToken(validToken, encryptionKey);

            // Each encryption should be different due to unique IVs
            expect(new Set([encrypted1, encrypted2, encrypted3]).size).toBe(3);
        });

        it('should handle large tokens', () => {
            const largeToken = validToken.repeat(10); // Create a much larger token
            const encrypted = TokenManager.encryptToken(largeToken, encryptionKey);
            const decrypted = TokenManager.decryptToken(encrypted, encryptionKey);
            expect(decrypted).toBe(largeToken);
        });
    });

    describe('Error Handling', () => {
        it('should throw descriptive errors for invalid inputs', () => {
            expect(() => TokenManager.encryptToken(null as any, encryptionKey))
                .toThrow(/invalid/i);
            expect(() => TokenManager.encryptToken(validToken, null as any))
                .toThrow(/invalid/i);
            expect(() => TokenManager.decryptToken('invalid-base64', encryptionKey))
                .toThrow(/invalid/i);
        });

        it('should handle corrupted encrypted data', () => {
            const encrypted = TokenManager.encryptToken(validToken, encryptionKey);
            const corrupted = encrypted.substring(10); // Remove part of the encrypted data
            expect(() => TokenManager.decryptToken(corrupted, encryptionKey))
                .toThrow();
        });

        it('should handle invalid base64 input', () => {
            expect(() => TokenManager.decryptToken('not-base64!@#$', encryptionKey))
                .toThrow(/invalid/i);
        });

        it('should handle undefined and null inputs', () => {
            expect(() => TokenManager.validateToken(undefined as any)).toBe(false);
            expect(() => TokenManager.validateToken(null as any)).toBe(false);
        });
    });
}); 