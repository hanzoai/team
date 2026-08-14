// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import * as UserAgent from '@mattermost/shared/utils/user_agent';

import {renderWithContext, userEvent} from 'tests/react_testing_utils';

import Completed from './onboarding_tasklist_completed';

const isDesktopAppMock = jest.mocked(UserAgent.isDesktopApp);

jest.mock('@mattermost/shared/utils/user_agent', () => ({
    isDesktopApp: jest.fn(() => false),
}));

const dismissMockFn = jest.fn();

describe('components/onboarding_tasklist/onboarding_tasklist_completed.tsx', () => {
    const props = {
        dismissAction: dismissMockFn,
    };

    beforeEach(() => {
        dismissMockFn.mockClear();
    });

    test('should match snapshot', () => {
        const {container} = renderWithContext(<Completed {...props}/>);
        expect(container).toMatchSnapshot();
    });

    test('finds the completed subtitle', () => {
        const {container} = renderWithContext(<Completed {...props}/>);
        expect(container.querySelectorAll('.completed-subtitle')).toHaveLength(1);
    });

    test('congratulates without selling anything', () => {
        const {container} = renderWithContext(<Completed {...props}/>);
        expect(container.textContent).not.toMatch(/trial/i);
        expect(container.textContent).not.toMatch(/enterprise/i);
    });

    test('dismisses the checklist from the only button it offers', async () => {
        const {container} = renderWithContext(<Completed {...props}/>);
        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(1);

        await userEvent.click(buttons[0]);
        expect(dismissMockFn).toHaveBeenCalledTimes(1);
    });

    test('displays download apps link when not in desktop app', () => {
        isDesktopAppMock.mockReturnValue(false);
        const {container} = renderWithContext(<Completed {...props}/>);
        expect(container.querySelectorAll('.download-apps')).toHaveLength(1);
    });

    test('hides download apps link when in desktop app', () => {
        isDesktopAppMock.mockReturnValue(true);
        const {container} = renderWithContext(<Completed {...props}/>);
        expect(container.querySelectorAll('.download-apps')).toHaveLength(0);
        isDesktopAppMock.mockReturnValue(false);
    });
});
