/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFiles: ['./jest.setup.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '#(.*)': '<rootDir>/node_modules/$1',
        '^(\\.{1,2}/.*)\\.ts$': '$1',
        '^chalk$': '<rootDir>/node_modules/chalk/source/index.js',
        '#ansi-styles': '<rootDir>/node_modules/ansi-styles/index.js',
        '#supports-color': '<rootDir>/node_modules/supports-color/index.js'
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
        }],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@digital-alchemy|chalk|#ansi-styles|#supports-color)/)'
    ],
    resolver: '<rootDir>/jest-resolver.cjs',
    testMatch: ['**/__tests__/**/*.test.ts'],
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'clover', 'html'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/*.test.ts',
        '!src/types/**/*',
        '!src/polyfills.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    verbose: true
}; 