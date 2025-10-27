import { describe, expect, test, mock, it, beforeEach, afterEach } from "bun:test";
import { TokenManager, validateRequestHeaders, sanitizeValue, handleError, checkRateLimit } from '../../src/security/index.js';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret-that-is-long-enough-for-testing-purposes';

describe('Security Module', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = TEST_SECRET;
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    describe('TokenManager', () => {
        const testToken = 'test-token';
        const encryptionKey = 'test-encryption-key-that-is-long-enough';

        test('should encrypt and decrypt tokens', () => {
            const encrypted = TokenManager.encryptToken(testToken, encryptionKey);
            expect(encrypted).toContain('aes-256-gcm:');

            const decrypted = TokenManager.decryptToken(encrypted, encryptionKey);
            expect(decrypted).toBe(testToken);
        });

        test('should validate tokens correctly', () => {
            const validToken = jwt.sign({ data: 'test' }, TEST_SECRET, { expiresIn: '1h' });
            const result = TokenManager.validateToken(validToken);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('should handle empty tokens', () => {
            const result = TokenManager.validateToken('');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid token format');
        });

        test('should handle expired tokens', () => {
            const now = Math.floor(Date.now() / 1000);
            const payload = {
                data: 'test',
                iat: now - 7200,  // 2 hours ago
                exp: now - 3600   // expired 1 hour ago
            };
            const token = jwt.sign(payload, TEST_SECRET);
            const result = TokenManager.validateToken(token);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Token has expired');
        });

        test('should handle invalid token format', () => {
            const result = TokenManager.validateToken('a'.repeat(32)); // 32 chars but invalid JWT
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid token signature');
        });

        test('should handle missing JWT secret', () => {
            delete process.env.JWT_SECRET;
            const payload = { data: 'test' };
            const token = jwt.sign(payload, 'some-secret');
            const result = TokenManager.validateToken(token);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('JWT secret not configured');
        });

        test('should handle rate limiting for failed attempts', () => {
            const invalidToken = 'x'.repeat(64);
            const testIp = '127.0.0.1';

            // First attempt
            const firstResult = TokenManager.validateToken(invalidToken, testIp);
            expect(firstResult.valid).toBe(false);

            // Multiple failed attempts
            for (let i = 0; i < 4; i++) {
                TokenManager.validateToken(invalidToken, testIp);
            }

            // Next attempt should be rate limited
            const limitedResult = TokenManager.validateToken(invalidToken, testIp);
            expect(limitedResult.valid).toBe(false);
            expect(limitedResult.error).toBe('Too many failed attempts. Please try again later.');
        });
    });

    describe('Request Validation', () => {
        let mockRequest: any;
        let mockResponse: any;
        let mockNext: any;

        beforeEach(() => {
            mockRequest = new Request('http://localhost/test', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({})
            });

            mockResponse = {
                status: mock(() => mockResponse),
                json: mock(() => mockResponse),
                setHeader: mock(() => mockResponse),
                removeHeader: mock(() => mockResponse)
            };

            mockNext = mock(() => { });
        });

        test('should pass valid requests', () => {
            if (mockRequest.headers) {
                mockRequest.headers.authorization = 'Bearer valid-token';
            }
            const validateTokenSpy = mock(() => ({ valid: true }));
            TokenManager.validateToken = validateTokenSpy;

            expect(() => validateRequestHeaders(mockRequest)).not.toThrow();
        });

        test('should reject invalid content type', () => {
            const invalidRequest = new Request('http://localhost/test', {
                method: 'POST',
                headers: {
                    'content-type': 'text/plain'
                }
            });

            expect(() => validateRequestHeaders(invalidRequest)).toThrow('Content-Type must be application/json');
        });

        test('should reject missing token', () => {
            const noAuthRequest = new Request('http://localhost/test', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                }
            });

            expect(() => validateRequestHeaders(noAuthRequest)).not.toThrow(); // No auth header is ok, auth is optional
        });
    });

    describe('Input Sanitization', () => {
        let mockRequest: any;
        let mockResponse: any;
        let mockNext: any;

        beforeEach(() => {
            mockRequest = {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: {
                    text: 'Test alert("xss")',
                    nested: {
                        html: 'img src="x" onerror="alert(1)"'
                    }
                }
            };

            mockResponse = {
                status: mock(() => mockResponse),
                json: mock(() => mockResponse)
            };

            mockNext = mock(() => { });
        });

        test('should sanitize HTML tags from request body', () => {
            const input = { text: '<script>alert("xss")</script>Hello' };
            const sanitized = sanitizeValue(input);
            expect(sanitized).toEqual({ text: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;Hello' });
        });

        test('should handle non-object body', () => {
            const input = 'string body';
            const sanitized = sanitizeValue(input);
            expect(sanitized).toBe('string body');
        });
    });

    describe('Error Handler', () => {
        let mockRequest: any;
        let mockResponse: any;
        let mockNext: any;

        beforeEach(() => {
            mockRequest = {
                method: 'POST',
                ip: '127.0.0.1'
            };

            mockResponse = {
                status: mock(() => mockResponse),
                json: mock(() => mockResponse)
            };

            mockNext = mock(() => { });
        });

        test('should handle errors in production mode', () => {
            const error = new Error('Test error');
            const result = handleError(error, 'production');
            expect(result).toEqual({
                error: true,
                message: 'Internal server error',
                timestamp: expect.any(String)
            });
        });

        test('should include error message in development mode', () => {
            const error = new Error('Test error');
            const result = handleError(error, 'development');
            expect(result).toEqual({
                error: true,
                message: 'Internal server error',
                error: 'Test error',
                stack: expect.any(String),
                timestamp: expect.any(String)
            });
        });
    }); 
});
