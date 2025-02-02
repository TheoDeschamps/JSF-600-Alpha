export default {
    testEnvironment: 'node',
    injectGlobals: true,
    roots: ['<rootDir>/dist'],
    testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
    moduleNameMapper: {
        '^@socket-handlers/(.*)$': '<rootDir>/dist/socket-handlers/$1',
        '^@models/(.*)$': '<rootDir>/dist/models/$1',
        '^@utils/(.*)$': '<rootDir>/dist/utils/$1'
    },
};