// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {test} from '@mattermost/playwright-lib';

import {searchAndValidate, searchFilterDates, setupSearchDateFilter} from './search_date_filter_helpers';

/**
 * @objective Verify an unfiltered search returns all matching posts in reverse chronological order.
 */
test('MM-T585_1 Unfiltered search for all posts is not affected', {tag: '@search_date_filter'}, async ({pw}) => {
    const {channelsPage, commonText, allMessagesInOrder} = await setupSearchDateFilter(pw);

    // # Search for the text shared by all five dated posts
    // * Verify every matching post appears in reverse chronological order
    await searchAndValidate(channelsPage, commonText, allMessagesInOrder);
});

/**
 * @objective Verify an unfiltered search for the most recent matching post returns only that post.
 */
test('MM-T585_2 Unfiltered search for recent post is not affected', {tag: '@search_date_filter'}, async ({pw}) => {
    const {channelsPage, messages} = await setupSearchDateFilter(pw);

    // # Search for the complete text of the most recent post
    // * Verify only the most recent post appears
    await searchAndValidate(channelsPage, messages.latest, [messages.latest]);
});

/**
 * @objective Verify after: excludes posts created before and on the target date.
 */
test('MM-T587 after: omits results before and on target date', {tag: '@search_date_filter'}, async ({pw}) => {
    const {channelsPage, commonText, messages} = await setupSearchDateFilter(pw);

    // # Search for matching posts after the first fixture date
    // * Verify only posts from later dates appear in reverse chronological order
    await searchAndValidate(channelsPage, `after:${searchFilterDates.first} ${commonText}`, [
        messages.latest,
        messages.secondOffTopic,
        messages.second,
    ]);
});

/**
 * @objective Verify on: returns posts created on the target date and omits posts from other dates.
 */
test('MM-T588 on: omits results before and after target date', {tag: '@search_date_filter'}, async ({pw}) => {
    const {channelsPage, commonText, messages} = await setupSearchDateFilter(pw);

    // # Search for matching posts on the second fixture date
    // * Verify only posts from the target date appear in reverse chronological order
    await searchAndValidate(channelsPage, `on:${searchFilterDates.second} ${commonText}`, [
        messages.secondOffTopic,
        messages.second,
    ]);
});

/**
 * @objective Verify before: and after: can constrain a search to the dates between them.
 */
test('MM-T589 before: and after: can be used together', {tag: '@search_date_filter'}, async ({pw}) => {
    const {channelsPage, commonText, messages} = await setupSearchDateFilter(pw);

    // # Search between the first and latest fixture dates
    // * Verify only posts strictly between the dates appear in reverse chronological order
    await searchAndValidate(
        channelsPage,
        `before:${searchFilterDates.latest} after:${searchFilterDates.first} ${commonText}`,
        [messages.secondOffTopic, messages.second],
    );
});

/**
 * @objective Verify after: can be combined with in: to limit results by date and channel.
 */
test('MM-T592_1 after: can be used in conjunction with in:', {tag: '@search_date_filter'}, async ({pw}) => {
    const {channelsPage, channel, commonText, messages} = await setupSearchDateFilter(pw);

    // # Search after the first fixture date in the test channel
    // * Verify only later posts from that channel appear
    await searchAndValidate(channelsPage, `after:${searchFilterDates.first} in:${channel.name} ${commonText}`, [
        messages.latest,
        messages.second,
    ]);
});

/**
 * @objective Verify after: can be combined with from: to limit results by date and author.
 */
test('MM-T592_2 after: can be used in conjunction with from:', {tag: '@search_date_filter'}, async ({pw}) => {
    const {channelsPage, anotherAdmin, commonText, messages} = await setupSearchDateFilter(pw);

    // # Search after the first fixture date for posts by the second author
    // * Verify only the later post by that author appears
    await searchAndValidate(
        channelsPage,
        `after:${searchFilterDates.first} from:${anotherAdmin.username} ${commonText}`,
        [messages.secondOffTopic],
    );
});

/**
 * @objective Verify re-adding in: to an after: and from: query applies all terms and returns no partial matches.
 */
test('MM-T592_3 after: re-add in: in conjunction with from:', {tag: '@search_date_filter'}, async ({pw}) => {
    const {channelsPage, channel, anotherAdmin, commonText} = await setupSearchDateFilter(pw);
    const query = `after:${searchFilterDates.first} in:${channel.name} ${commonText} from:${anotherAdmin.username} ${commonText}`;

    // # Search with after:, in:, from:, and the repeated common term
    // * Verify the exact no-results message appears
    await searchAndValidate(channelsPage, query);
});

/**
 * @objective Verify before:, after:, from:, and in: can be combined in one search.
 */
test(
    'MM-T593 before:, after:, from:, and in: can be used in one search',
    {tag: '@search_date_filter'},
    async ({pw}) => {
        const {channelsPage, anotherAdmin, commonText, messages} = await setupSearchDateFilter(pw);

        // # Search between two dates in off-topic for posts by the second author
        // * Verify only the matching post appears
        await searchAndValidate(
            channelsPage,
            `before:${searchFilterDates.latest} after:${searchFilterDates.first} from:${anotherAdmin.username} in:off-topic ${commonText}`,
            [messages.secondOffTopic],
        );
    },
);
