// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {APIRequestContext} from '@playwright/test';
import type {Command} from '@mattermost/types/integrations';

import {
    expect,
    isWebhookTestServerReachable,
    type PlaywrightExtended,
    setupWebhookTestServer,
    test,
    testConfig,
} from '@mattermost/playwright-lib';

import {MultiformDialog} from './helpers';

const commandTrigger = 'multiform_dialog';

async function setupMultiform(pw: PlaywrightExtended, request: APIRequestContext) {
    expect(
        await isWebhookTestServerReachable(request),
        `Webhook test server must be reachable at ${testConfig.webhookBaseUrl}`,
    ).toBe(true);
    await setupWebhookTestServer(request, {
        mattermostBaseUrl: testConfig.baseURL,
        adminUsername: testConfig.adminUsername,
        adminPassword: testConfig.adminPassword,
    });

    const {adminClient, team, user} = await pw.initSetup();
    await adminClient.addCommand({
        team_id: team.id,
        trigger: commandTrigger,
        method: 'P',
        username: '',
        icon_url: '',
        auto_complete: false,
        auto_complete_desc: '',
        auto_complete_hint: '',
        display_name: 'Multiform Dialog Test',
        description: 'Step-by-step form submission test',
        url: `${testConfig.webhookBaseUrl}/dialog/multistep`,
    } as Command);

    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name, 'off-topic');
    await channelsPage.toBeVisible();

    return {channelsPage, dialog: new MultiformDialog(page)};
}

async function openMultiform(channelsPage: Awaited<ReturnType<typeof setupMultiform>>['channelsPage']) {
    await channelsPage.postMessage(`/${commandTrigger}`);
}

/**
 * @objective Verify the first multiform step shows its title, fields, and action.
 */
test('MM-T2550A shows the initial multiform step', {tag: '@interactive_dialog'}, async ({pw, request}) => {
    const {channelsPage, dialog} = await setupMultiform(pw, request);

    // # Execute the custom command that opens the multiform
    await openMultiform(channelsPage);

    // * Verify the first step has the expected controls
    await dialog.expectStepOne();

    // # Close the form
    await dialog.close();
    await dialog.expectClosed();
});

/**
 * @objective Verify a user can complete all three steps of a multiform workflow.
 */
test('MM-T2550B completes the multiform workflow', {tag: '@interactive_dialog'}, async ({pw, request}) => {
    const {channelsPage, dialog} = await setupMultiform(pw, request);

    // # Complete each step of the multiform
    await openMultiform(channelsPage);
    await dialog.expectStepOne();
    await dialog.completeStepOne('John', 'john.doe@example.com');
    await dialog.expectStepTwo();
    await dialog.completeStepTwo();
    await dialog.expectStepThree();
    await dialog.completeStepThree('Multiform test completed successfully');

    // * Verify the form closes and the integration posts its completion response
    await dialog.expectClosed();
    await channelsPage.centerView.waitUntilLastPostContains('Multistep completed successfully');
    await channelsPage.centerView.waitUntilLastPostContains('Final step values');
});

/**
 * @objective Verify required-field validation keeps a user on the current multiform step.
 */
test('MM-T2550C validates the first multiform step', {tag: '@interactive_dialog'}, async ({pw, request}) => {
    const {channelsPage, dialog} = await setupMultiform(pw, request);

    // # Submit the first step without entering required values
    await openMultiform(channelsPage);
    await dialog.expectStepOne();
    await channelsPage.page.getByRole('button', {name: 'Next Step'}).click();

    // * Verify both required fields show errors and the first step remains open
    await expect(channelsPage.page.getByText('This field is required.', {exact: true})).toHaveCount(2);
    await dialog.expectStepOne();

    await dialog.close();
});

/**
 * @objective Verify a user can cancel the multiform from the first and second steps.
 */
test('MM-T2550D cancels the multiform at different steps', {tag: '@interactive_dialog'}, async ({pw, request}) => {
    const {channelsPage, dialog} = await setupMultiform(pw, request);

    // # Cancel from the first step
    await openMultiform(channelsPage);
    await dialog.expectStepOne();
    await dialog.cancel();

    // * Verify the first cancellation closes the form and posts a response
    await dialog.expectClosed();
    await channelsPage.centerView.waitUntilLastPostContains('Dialog cancelled');

    // # Reopen the form, advance, and cancel from the second step
    await openMultiform(channelsPage);
    await dialog.completeStepOne('Jane', 'jane@example.com');
    await dialog.expectStepTwo();
    await dialog.cancel();

    // * Verify the second cancellation closes the form and posts a response
    await dialog.expectClosed();
    await channelsPage.centerView.waitUntilLastPostContains('Dialog cancelled');
});

/**
 * @objective Verify each multiform step replaces the previous step's content.
 */
test('MM-T2550E maintains step-specific multiform content', {tag: '@interactive_dialog'}, async ({pw, request}) => {
    const {channelsPage, dialog} = await setupMultiform(pw, request);

    // # Open the form and advance from the personal-information step
    await openMultiform(channelsPage);
    await dialog.expectStepOne();
    await dialog.completeStepOne('Bob', 'bob@example.com');

    // * Verify the work-information step replaces the first step's fields
    await dialog.expectStepTwo();

    await dialog.close();
});
