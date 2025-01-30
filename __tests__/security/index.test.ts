import { TokenManager, validateRequest, sanitizeInput, errorHandler } from '../../src/security';
import { Request, Response } from 'express';

describe('Security Module', () => {
    describe('TokenManager', () => {
        const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNzE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        const encryptionKey = 'test_encryption_key';

        it('should encrypt and decrypt tokens', () => {
            const encrypted = TokenManager.encryptToken(testToken, encryptionKey);
            const decrypted = TokenManager.decryptToken(encrypted, encryptionKey);

            expect(decrypted).toBe(testToken);
        });

        it('should validate tokens correctly', () => {
            expect(TokenManager.validateToken(testToken)).toBe(true);
            expect(TokenManager.validateToken('invalid_token')).toBe(false);
            expect(TokenManager.validateToken('')).toBe(false);
        });

        it('should handle expired tokens', () => {
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
            expect(TokenManager.validateToken(expiredToken)).toBe(false);
        });
    });

    describe('Request Validation', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;
        let mockNext: jest.Mock;

        beforeEach(() => {
            mockRequest = {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: 'Bearer validToken'
                },
                is: jest.fn().mockReturnValue(true),
                body: { test: 'data' }
            };
            mockResponse = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
        });

        it('should pass valid requests', () => {
            validateRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should reject invalid content type', () => {
            mockRequest.is = jest.fn().mockReturnValue(false);

            validateRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(415);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Unsupported Media Type - Content-Type must be application/json'
            });
        });

        it('should reject missing token', () => {
            mockRequest.headers = {};

            validateRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid or expired token'
            });
        });

        it('should reject invalid request body', () => {
            mockRequest.body = null;

            validateRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid request body'
            });
        });
    });

    describe('Input Sanitization', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;
        let mockNext: jest.Mock;

        beforeEach(() => {
            mockRequest = {
                body: {}
            };
            mockResponse = {};
            mockNext = jest.fn();
        });

        it('should sanitize HTML tags from request body', () => {
            mockRequest.body = {
                text: 'Test <script>alert("xss")</script>',
                nested: {
                    html: '<img src="x" onerror="alert(1)">'
                }
            };

            sanitizeInput(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.body).toEqual({
                text: 'Test alert("xss")',
                nested: {
                    html: 'img src="x" onerror="alert(1)"'
                }
            });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle non-object body', () => {
            mockRequest.body = 'string body';

            sanitizeInput(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.body).toBe('string body');
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Error Handler', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;
        let mockNext: jest.Mock;
        const originalEnv = process.env.NODE_ENV;

        beforeEach(() => {
            mockRequest = {};
            mockResponse = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
        });

        afterAll(() => {
            process.env.NODE_ENV = originalEnv;
        });

        it('should handle errors in production mode', () => {
            process.env.NODE_ENV = 'production';
            const error = new Error('Test error');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: undefined
            });
        });

        it('should include error message in development mode', () => {
            process.env.NODE_ENV = 'development';
            const error = new Error('Test error');

            errorHandler(
                error,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Test error'
            });
        });
    });
}); 