// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/** @type {import('jest').Config} */

const baseConfig = require('./jest.config.js');

const config = {
    ...baseConfig,
    displayName: 'channels',
    testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/src/packages/@hanzoteam/redux/',
    ],
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/packages/@hanzoteam/redux/**',
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        'src/packages/@hanzoteam/redux/',
    ],
};

module.exports = config;
