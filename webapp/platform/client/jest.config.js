// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/** @type {import('jest').Config} */

module.exports = {
    moduleNameMapper: {
        '^@hanzoteam/types/(.*)$': '<rootDir>/../types/src/$1',
    },
    testPathIgnorePatterns: ['/node_modules/', '/lib/'],
    setupFiles: ['<rootDir>/setup_jest.ts'],
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
    ],
    coverageReporters: ['json', 'lcov', 'text-summary'],
};
