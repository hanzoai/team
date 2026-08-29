// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/** @type {import('jest').Config} */

const baseConfig = require('./jest.config.js');

const config = {
    ...baseConfig,
    displayName: '@hanzoteam/redux',
    testMatch: [
        '<rootDir>/src/packages/@hanzoteam/redux/src/**/*.test.{js,jsx,ts,tsx}',
    ],
    collectCoverageFrom: [
        'src/packages/@hanzoteam/redux/src/**/*.{js,jsx,ts,tsx}',
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        'src/packages/@hanzoteam/redux/src/selectors/create_selector',
    ],
};

module.exports = config;
