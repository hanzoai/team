// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FormattedMessage} from 'react-intl';
import {Link} from 'react-router-dom';

import type {Bot as BotType} from '@mattermost/types/bots';
import type {Team} from '@mattermost/types/teams';
import type {UserProfile, UserAccessToken} from '@mattermost/types/users';
import type {RelationOneToOne} from '@mattermost/types/utilities';

import type {ActionResult} from 'mattermost-redux/types/actions';

import AlertBanner from 'components/alert_banner';
import BackstageList from 'components/backstage/components/backstage_list';
import ExternalLink from 'components/external_link';

import * as Utils from 'utils/utils';

import Bot, {matchesFilter} from './bot';

// The server clamps per_page to PerPageMaximum (200), so bots must be fetched
// in pages of that size and accumulated rather than in a single large request.
const BOTS_PER_PAGE = 200;

type Props = {

    /**
    *  Map from botUserId to bot.
    */
    bots: Record<string, BotType>;

    /**
     * List of bot IDs managed by the app framework
     */
    appsBotIDs: string[];

    /**
     * Whether apps framework is enabled
     */
    appsEnabled: boolean;

    /**
    *  Map from botUserId to accessTokens.
    */
    accessTokens?: RelationOneToOne<UserProfile, Record<string, UserAccessToken>>;

    /**
    *  Map from botUserId to owner.
    */
    owners: Record<string, UserProfile>;

    /**
    *  Map from botUserId to user.
    */
    users: Record<string, UserProfile>;
    pluginDisplayNames?: Record<string, string>;
    createBots?: boolean;

    actions: {

        /**
         * Ensure we have bot accounts
         */
        loadBots: (page?: number, perPage?: number) => Promise<ActionResult<BotType[]>>;

        /**
         * Server-side search for bot accounts by username or display name
         */
        searchBots: (term: string) => Promise<ActionResult<BotType[]>>;

        /**
        * Load access tokens for bot accounts
        */
        getUserAccessTokensForUser: (userId: string, page?: number, perPage?: number) => void;

        /**
        * Access token managment
        */
        createUserAccessToken: (userId: string, description: string) => Promise<ActionResult<UserAccessToken>>;

        revokeUserAccessToken: (tokenId: string) => Promise<ActionResult>;
        enableUserAccessToken: (tokenId: string) => Promise<ActionResult>;
        disableUserAccessToken: (tokenId: string) => Promise<ActionResult>;

        /**
        * Load owner of bot account
        */
        getUser: (userId: string) => void;

        /**
        * Disable a bot
        */
        disableBot: (userId: string) => Promise<ActionResult>;

        /**
        * Enable a bot
        */
        enableBot: (userId: string) => Promise<ActionResult>;

        /**
         * Load bot IDs managed by the apps
         */
        fetchAppsBotIDs: () => Promise<ActionResult>;
    };

    /**
    *  Only used for routing since backstage is team based.
    */
    team: Team;
};

type State = {
    loading: boolean;
    loadError: boolean;
    page: number;
    hasMore: boolean;
};

export default class Bots extends React.PureComponent<Props, State> {
    private lastFilter: string | undefined;
    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    public constructor(props: Props) {
        super(props);

        this.state = {
            loading: true,
            loadError: false,
            page: 0,
            hasMore: false,
        };
    }

    public componentWillUnmount(): void {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
    }

    public componentDidMount(): void {
        this.loadPage(0);

        if (this.props.appsEnabled) {
            this.props.actions.fetchAppsBotIDs();
        }
    }

    private async loadPage(page: number): Promise<void> {
        this.setState({loading: true, loadError: false});
        const result = await this.props.actions.loadBots(page, BOTS_PER_PAGE);

        if (result.error || !result.data) {
            this.setState({loading: false, loadError: true});
            return;
        }

        const promises = [];
        for (const bot of result.data) {
            // We don't need to wait for this and we need to accept failure in the case where bot.owner_id is a plugin id
            this.props.actions.getUser(bot.owner_id);

            // We want to wait for these.
            promises.push(this.props.actions.getUser(bot.user_id));
            promises.push(this.props.actions.getUserAccessTokensForUser(bot.user_id));
        }

        await Promise.all(promises);
        this.setState({
            loading: false,
            loadError: false,
            page,
            hasMore: result.data.length >= BOTS_PER_PAGE,
        });
    }

    private handleNextPage = async (): Promise<void> => {
        const nextPage = this.state.page + 1;
        if (Object.values(this.props.bots).length > nextPage * BOTS_PER_PAGE) {
            this.setState({page: nextPage});
        } else {
            await this.loadPage(nextPage);
        }
    };

    private handlePreviousPage = (): void => {
        this.setState((prev) => ({page: Math.max(0, prev.page - 1), loadError: false}));
    };

    private renderLoadError(): JSX.Element | null {
        if (!this.state.loadError) {
            return null;
        }

        return (
            <AlertBanner
                mode='danger'
                message={
                    <FormattedMessage
                        id='bots.manage.load_error.full'
                        defaultMessage='Bot accounts could not be loaded. Refresh the page to try again.'
                    />
                }
            />
        );
    }

    DisabledSection(props: {hasDisabled: boolean; disabledBots: JSX.Element[]; filter?: string}): JSX.Element | null {
        if (!props.hasDisabled) {
            return null;
        }
        const botsToDisplay = React.Children.map(props.disabledBots, (child) => {
            return React.cloneElement(child, {filter: props.filter});
        });
        return (
            <>
                <div className='bot-disabled'>
                    <FormattedMessage
                        id='bots.disabled'
                        defaultMessage='Disabled'
                    />
                </div>
                <div className='bot-list__disabled'>
                    {botsToDisplay}
                </div>
            </>
        );
    }

    EnabledSection(props: {enabledBots: JSX.Element[]; filter?: string}): JSX.Element {
        const botsToDisplay = React.Children.map(props.enabledBots, (child) => {
            return React.cloneElement(child, {filter: props.filter});
        });
        return (
            <div>
                {botsToDisplay}
            </div>
        );
    }

    botToJSX = (bot: BotType): JSX.Element => {
        return (
            <Bot
                key={bot.user_id}
                bot={bot}
                owner={this.props.owners[bot.user_id]}
                user={this.props.users[bot.user_id]}
                pluginDisplayName={this.props.pluginDisplayNames?.[bot.user_id]}
                accessTokens={(this.props.accessTokens && this.props.accessTokens[bot.user_id]) || {}}
                actions={this.props.actions}
                team={this.props.team}
                fromApp={this.props.appsBotIDs.includes(bot.user_id)}
            />
        );
    };

    private scheduleServerSearch(filter: string): void {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        this.searchTimer = setTimeout(async () => {
            const result = await this.props.actions.searchBots(filter);
            if (result.data) {
                for (const bot of result.data) {
                    this.props.actions.getUser(bot.owner_id);
                    this.props.actions.getUser(bot.user_id);
                    this.props.actions.getUserAccessTokensForUser(bot.user_id);
                }
            }
        }, 300);
    }

    bots = (filter?: string): [JSX.Element[], boolean] => {
        if (filter !== this.lastFilter) {
            this.lastFilter = filter;
            if (filter) {
                this.scheduleServerSearch(filter);
            } else if (this.searchTimer) {
                clearTimeout(this.searchTimer);
                this.searchTimer = null;
            }
        }

        const sorted = Object.values(this.props.bots).sort((a, b) => a.username.localeCompare(b.username));

        // When browsing (no filter), show only the current page. When searching,
        // show all accumulated results so the server search response is fully visible.
        const bots = filter ? sorted : sorted.slice(this.state.page * BOTS_PER_PAGE, (this.state.page + 1) * BOTS_PER_PAGE);

        const match = (bot: BotType) => matchesFilter(bot, filter, this.props.owners[bot.user_id]);
        const enabledBots = bots.filter((bot) => bot.delete_at === 0).filter(match).map(this.botToJSX);
        const disabledBots = bots.filter((bot) => bot.delete_at > 0).filter(match).map(this.botToJSX);
        const sections = [(
            <div key='sections'>
                <this.EnabledSection
                    enabledBots={enabledBots}
                />
                <this.DisabledSection
                    hasDisabled={disabledBots.length > 0}
                    disabledBots={disabledBots}
                />
            </div>
        )];

        return [sections, enabledBots.length > 0 || disabledBots.length > 0];
    };

    public render(): JSX.Element {
        const accumulatedCount = Object.values(this.props.bots).length;
        const canGoNext = this.state.hasMore || accumulatedCount > (this.state.page + 1) * BOTS_PER_PAGE;
        const canGoPrev = this.state.page > 0;

        return (
            <BackstageList
                header={
                    <FormattedMessage
                        id='bots.manage.header'
                        defaultMessage='Bot Accounts'
                    />
                }
                addText={this.props.createBots &&
                    <FormattedMessage
                        id='bots.manage.add'
                        defaultMessage='Add Bot Account'
                    />
                }
                addLink={'/' + this.props.team.name + '/integrations/bots/add'}
                addButtonId='addBotAccount'
                emptyText={
                    <FormattedMessage
                        id='bots.manage.empty'
                        defaultMessage='No bot accounts found'
                    />
                }
                emptyTextSearch={
                    <FormattedMessage
                        id='bots.emptySearch'
                        // eslint-disable-next-line formatjs/enforce-placeholders -- searchTerm provided by BackstageList
                        defaultMessage='No bot accounts match <b>{searchTerm}</b>'
                        values={{
                            b: (chunks) => <b>{chunks}</b>,
                        }}
                    />
                }
                helpText={
                    <>
                        <FormattedMessage
                            id='bots.manage.help1'
                            defaultMessage='Use {botAccounts} to integrate with Mattermost through plugins or the API. Bot accounts are available to everyone on your server. '
                            values={{
                                botAccounts: (
                                    <ExternalLink
                                        href='https://mattermost.com/pl/default-bot-accounts'
                                        location='bots'
                                    >
                                        <FormattedMessage
                                            id='bots.manage.bot_accounts'
                                            defaultMessage='Bot Accounts'
                                        />
                                    </ExternalLink>
                                ),
                            }}
                        />
                        <FormattedMessage
                            id='bots.help2'
                            defaultMessage={'Enable bot account creation in the <a>System Console</a>.'}
                            values={{
                                a: (chunks) => <Link to='/admin_console/integrations/bot_accounts'>{chunks}</Link>,
                            }}
                        />
                    </>
                }
                searchPlaceholder={Utils.localizeMessage({id: 'bots.manage.search', defaultMessage: 'Search Bot Accounts'})}
                loading={this.state.loading}
                error={this.renderLoadError()}
                nextPage={this.handleNextPage}
                previousPage={this.handlePreviousPage}
                hasNextPage={canGoNext}
                hasPreviousPage={canGoPrev}
            >
                {this.bots}
            </BackstageList>
        );
    }
}
