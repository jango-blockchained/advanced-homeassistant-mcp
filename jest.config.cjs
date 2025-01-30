/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '#(.*)': '<rootDir>/node_modules/$1',
        '^(\\.{1,2}/.*)\\.ts$': '$1',
        '^chalk$': '<rootDir>/node_modules/chalk/source/index.js',
        '#ansi-styles': '<rootDir>/node_modules/ansi-styles/index.js',
        '#supports-color': '<rootDir>/node_modules/supports-color/index.js'
    },
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: 'tsconfig.json'
            },
        ],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@digital-alchemy|chalk|#ansi-styles|#supports-color)/)'
    ],
    resolver: '<rootDir>/jest-resolver.cjs',
    testMatch: ['**/__tests__/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'clover', 'html'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
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
    }
}; 