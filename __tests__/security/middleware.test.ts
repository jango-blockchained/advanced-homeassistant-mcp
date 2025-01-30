import { Request, Response } from 'express';
import {
    validateRequest,
    sanitizeInput,
    errorHandler,
    rateLimiter,
    securityHeaders
} from '../../src/security/index.js';

interface MockRequest extends Partial<Request> {
    headers: Record<string, string>;
    is: jest.Mock;
}

describe('Security Middleware', () => {
    let mockRequest: MockRequest;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockRequest = {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer validToken'
            },
            is: jest.fn().mockReturnValue(true),
            body: { test: 'data' }
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            set: jest.fn()
        };
        mockNext = jest.fn();
    });

    describe('Request Validation', () => {
        it('should pass valid requests', () => {
            validateRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should reject requests with invalid content type', () => {
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

        it('should reject requests without authorization', () => {
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

        it('should reject requests with invalid token', () => {
            mockRequest.headers.authorization = 'Bearer invalid.token.format';
            validateRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });

        it('should handle GET requests without body validation', () => {
            mockRequest.method = 'GET';
            mockRequest.body = undefined;
            validateRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Input Sanitization', () => {
        it('should remove HTML tags from request body', () => {
            mockRequest.body = {
                text: '<script>alert("xss")</script>',
                nested: {
                    html: '<img src="x" onerror="alert(1)">'
                }
            };

            sanitizeInput(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.body.text).not.toContain('<script>');
            expect(mockRequest.body.nested.html).not.toContain('<img');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle non-object body', () => {
            mockRequest.body = 'plain text';
            sanitizeInput(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );
            expect(mockRequest.body).toBe('plain text');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle nested objects', () => {
            mockRequest.body = {
                level1: {
                    level2: {
                        text: '<p>test</p>'
                    }
                }
            };

            sanitizeInput(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.body.level1.level2.text).not.toContain('<p>');
            expect(mockNext).toHaveBeenCalled();
        });

        it('should preserve safe content', () => {
            mockRequest.body = {
                text: 'Safe text without HTML',
                number: 42,
                boolean: true
            };

            const originalBody = { ...mockRequest.body };
            sanitizeInput(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockRequest.body).toEqual(originalBody);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Error Handler', () => {
        const originalEnv = process.env.NODE_ENV;

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

        it('should include error details in development mode', () => {
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

        it('should handle non-Error objects', () => {
            const error = 'String error message';

            errorHandler(
                error as any,
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    describe('Rate Limiter', () => {
        it('should be configured with correct options', () => {
            expect(rateLimiter).toBeDefined();
            const middleware = rateLimiter as any;
            expect(middleware.windowMs).toBeDefined();
            expect(middleware.max).toBeDefined();
        });
    });

    describe('Security Headers', () => {
        it('should be configured with secure defaults', () => {
            expect(securityHeaders).toBeDefined();
            const middleware = securityHeaders as any;
            expect(middleware.getDefaultDirectives).toBeDefined();
        });

        it('should set appropriate security headers', () => {
            const mockRes = {
                setHeader: jest.fn()
            };
            securityHeaders(mockRequest as Request, mockRes as any, mockNext);
            expect(mockRes.setHeader).toHaveBeenCalled();
        });
    });
}); 