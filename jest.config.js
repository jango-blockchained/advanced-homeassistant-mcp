/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true
        }]
    },
    extensionsToTreatAsEsm: ['.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    transformIgnorePatterns: [
        'node_modules/(?!(chalk|#ansi-styles|#supports-color)/)'
    ]
}; 