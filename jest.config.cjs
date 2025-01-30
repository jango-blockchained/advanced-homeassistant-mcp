/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '#(.*)': '<rootDir>/node_modules/$1',
        '^(\\.{1,2}/.*)\\.ts$': '$1',
        '^chalk$': 'chalk',
        '#ansi-styles': 'ansi-styles',
        '#supports-color': 'supports-color'
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@digital-alchemy|chalk|ansi-styles|supports-color)/)'
    ],
    resolver: '<rootDir>/jest-resolver.cjs',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    testMatch: [
        '**/__tests__/helpers.test.ts',
        '**/__tests__/schemas/devices.test.ts'
    ],
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
    collectCoverage: false,
    verbose: true,
    testTimeout: 30000
}; 