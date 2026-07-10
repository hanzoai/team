// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {useDispatch} from 'react-redux';
import AsyncSelect from 'react-select/async';

import {Button} from '@mattermost/shared/components/button';
import {WithTooltip} from '@mattermost/shared/components/tooltip';
import type {ChannelWithTeamData} from '@mattermost/types/channels';
import type {UserPropertyField} from '@mattermost/types/properties_user';

import {searchUsersForExpression} from 'mattermost-redux/actions/access_control';
import {searchAllChannels} from 'mattermost-redux/actions/channels';
import type {ActionResult} from 'mattermost-redux/types/actions';

import Markdown from 'components/markdown';

import TestResultsModal from '../modals/policy_test/test_modal';

import './shared.scss';

// Sentinel emitted by the server in masked CEL expressions for values the caller cannot see.
export const MASKED_VALUE_TOKEN_LITERAL = '"--------"';

// CEL attribute-path prefixes. The requesting user is user.attributes.*; the
// accessed channel (resource) is resource.attributes.*.
export const USER_ATTRIBUTES_PREFIX = 'user.attributes.';
export const RESOURCE_ATTRIBUTES_PREFIX = 'resource.attributes.';

// value_type on a visual-AST condition. Matches model.ValueType: 0 = literal,
// 1 = attribute reference (the RHS is another attribute path, e.g. a
// resource.attributes.* selector rather than a quoted constant).
export const VISUAL_AST_ATTRIBUTE_VALUE_TYPE = 1;

// CEL operator constants
export enum CELOperator {
    EQUALS = '==',
    NOT_EQUALS = '!=',
    GREATER_THAN = '>',
    GREATER_THAN_OR_EQUAL = '>=',
    LESS_THAN = '<',
    LESS_THAN_OR_EQUAL = '<=',
    STARTS_WITH = 'startsWith',
    ENDS_WITH = 'endsWith',
    CONTAINS = 'contains',
    IN = 'in',
}

// Operator label constants
export enum OperatorLabel {
    IS = 'is',
    IS_NOT = 'is not',
    STARTS_WITH = 'starts with',
    ENDS_WITH = 'ends with',
    CONTAINS = 'contains',
    IN = 'in',
    HAS_ANY_OF = 'has any of',
    HAS_ALL_OF = 'has all of',

    // Ranked-attribute comparison operators. These are shown only for
    // attributes of type 'rank' and replace the standard operator set there.
    // IS_NOT (above) is reused for the ranked "is not" (≠) operator.
    IS_EXACTLY = 'is exactly',
    IS_AT_LEAST = 'is at least',
    IS_GREATER_THAN = 'is greater than',
    IS_AT_MOST = 'is at most',
    IS_LESS_THAN = 'is less than',
}

// Map from visual AST operator to UI label. The comparison symbols (>=, >, <, <=)
// are only ever produced by ranked attributes, so they map directly to the ranked
// labels. EQUALS/NOT_EQUALS map to the generic IS/IS_NOT here; parseExpression
// promotes EQUALS to IS_EXACTLY when the attribute is ranked.
export const OPERATOR_LABELS: Record<string, string> = {
    [CELOperator.EQUALS]: OperatorLabel.IS,
    [CELOperator.NOT_EQUALS]: OperatorLabel.IS_NOT,
    [CELOperator.GREATER_THAN_OR_EQUAL]: OperatorLabel.IS_AT_LEAST,
    [CELOperator.GREATER_THAN]: OperatorLabel.IS_GREATER_THAN,
    [CELOperator.LESS_THAN_OR_EQUAL]: OperatorLabel.IS_AT_MOST,
    [CELOperator.LESS_THAN]: OperatorLabel.IS_LESS_THAN,
    [CELOperator.STARTS_WITH]: OperatorLabel.STARTS_WITH,
    [CELOperator.ENDS_WITH]: OperatorLabel.ENDS_WITH,
    [CELOperator.CONTAINS]: OperatorLabel.CONTAINS,
    [CELOperator.IN]: OperatorLabel.IN,
    hasAnyOf: OperatorLabel.HAS_ANY_OF,
    hasAllOf: OperatorLabel.HAS_ALL_OF,
};

type OperatorType = 'comparison' | 'method' | 'list';

// Map from UI label to operator configuration
export const OPERATOR_CONFIG: Record<string, {type: OperatorType; celOp: CELOperator}> = {
    [OperatorLabel.IS]: {type: 'comparison', celOp: CELOperator.EQUALS},
    [OperatorLabel.IS_NOT]: {type: 'comparison', celOp: CELOperator.NOT_EQUALS},
    [OperatorLabel.STARTS_WITH]: {type: 'method', celOp: CELOperator.STARTS_WITH},
    [OperatorLabel.ENDS_WITH]: {type: 'method', celOp: CELOperator.ENDS_WITH},
    [OperatorLabel.CONTAINS]: {type: 'method', celOp: CELOperator.CONTAINS},
    [OperatorLabel.IN]: {type: 'list', celOp: CELOperator.IN},
    [OperatorLabel.HAS_ANY_OF]: {type: 'list', celOp: CELOperator.IN},
    [OperatorLabel.HAS_ALL_OF]: {type: 'list', celOp: CELOperator.IN},

    // Ranked comparison operators emit `attr <op> "Option"`. The backend
    [OperatorLabel.IS_EXACTLY]: {type: 'comparison', celOp: CELOperator.EQUALS},
    [OperatorLabel.IS_AT_LEAST]: {type: 'comparison', celOp: CELOperator.GREATER_THAN_OR_EQUAL},
    [OperatorLabel.IS_GREATER_THAN]: {type: 'comparison', celOp: CELOperator.GREATER_THAN},
    [OperatorLabel.IS_AT_MOST]: {type: 'comparison', celOp: CELOperator.LESS_THAN_OR_EQUAL},
    [OperatorLabel.IS_LESS_THAN]: {type: 'comparison', celOp: CELOperator.LESS_THAN},
};

export function isMultiValueOperator(op: string): boolean {
    return op === OperatorLabel.IN || op === OperatorLabel.HAS_ANY_OF || op === OperatorLabel.HAS_ALL_OF;
}

export function isMultiselectOperator(op: string): boolean {
    return op === OperatorLabel.HAS_ANY_OF || op === OperatorLabel.HAS_ALL_OF;
}

// Ordinal comparison operators exclusive to ranked attributes. IS_NOT is
// intentionally excluded — it is shared with the standard operator set — so it
// is not filtered out of non-ranked attribute menus.
export function isRankOperator(op: string): boolean {
    return op === OperatorLabel.IS_EXACTLY ||
        op === OperatorLabel.IS_AT_LEAST ||
        op === OperatorLabel.IS_GREATER_THAN ||
        op === OperatorLabel.IS_AT_MOST ||
        op === OperatorLabel.IS_LESS_THAN;
}

export function isSimpleCondition(s: string): boolean {
    const trimmed = s.trim();

    // The first pattern accepts ==, != and the ranked ordinal operators
    // (>=, <=, >, <) against either a quoted value or a resource.attributes.*
    // selector (comparing the user attribute to the accessed channel's). >= /
    // <= precede > / < in the alternation so the two-char forms match before
    // the one-char ones.
    return Boolean(
        trimmed.match(/^user\.attributes\.\w+\s*(==|!=|>=|<=|>|<)\s*(?:['"][^'"]*['"]|resource\.attributes\.\w+)$/) ||
        trimmed.match(/^user\.attributes\.\w+\s+in\s+\[.*?\]$/) ||
        trimmed.match(/^((\[.*?\])|['"][^'"]*['"])\s+in\s+user\.attributes\.\w+$/) ||
        trimmed.match(/^user\.attributes\.\w+\.startsWith\(['"][^'"]*['"].*?\)$/) ||
        trimmed.match(/^user\.attributes\.\w+\.endsWith\(['"][^'"]*['"].*?\)$/) ||
        trimmed.match(/^user\.attributes\.\w+\.contains\(['"][^'"]*['"].*?\)$/),
    );
}

export function isMultiselectOrGroup(s: string): boolean {
    const trimmed = s.trim();
    if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
        return false;
    }
    const inner = trimmed.slice(1, -1);
    return inner.split('||').every((part) => {
        const p = part.trim();
        return Boolean(p.match(/^['"][^'"]*['"]\s+in\s+user\.attributes\.\w+$/));
    });
}

export function isSimpleExpression(expr: string): boolean {
    if (!expr) {
        return true;
    }
    return expr.split('&&').every((condition) => {
        return isSimpleCondition(condition) || isMultiselectOrGroup(condition);
    });
}

// Checks if there are any usable attributes for ABAC policies.
// An attribute is usable if:
// 1. It doesn't contain spaces (CEL incompatible)
// 2. It's either synced from LDAP/SAML, admin-managed, plugin-managed (protected), OR user-managed attributes are enabled
export function hasUsableAttributes(
    userAttributes: UserPropertyField[],
    enableUserManagedAttributes: boolean,
): boolean {
    return userAttributes.some((attr) => {
        const hasSpaces = attr.name.includes(' ');
        const isSynced = attr.attrs?.ldap || attr.attrs?.saml;
        const isAdminManaged = attr.attrs?.managed === 'admin';
        const isProtected = attr.attrs?.protected;
        const allowed = isSynced || isAdminManaged || isProtected || enableUserManagedAttributes;
        return !hasSpaces && allowed;
    });
}

interface TestButtonProps {
    onClick: () => void;
    disabled: boolean;
    disabledTooltip?: string;

    /** Override the default "Test access rule" label. Used by the
     *  permission-rule editors to surface "Simulate rules" instead,
     *  matching the dual-lane simulation modal they open. */
    label?: React.ReactNode;
}

interface AddAttributeButtonProps {
    onClick: () => void;
    disabled: boolean;
}

interface HelpTextProps {
    message: string;
    onLearnMoreClick?: () => void;
}

export function TestButton({onClick, disabled, disabledTooltip, label}: TestButtonProps): JSX.Element {
    const button = (
        <Button
            emphasis='tertiary'
            size='sm'
            onClick={onClick}
            disabled={disabled}
        >
            <i className='icon icon-lock-outline'/>
            {label ?? (
                <FormattedMessage
                    id='admin.access_control.table_editor.test_access_rule'
                    defaultMessage='Test access rule'
                />
            )}
        </Button>
    );

    if (disabled && disabledTooltip) {
        return (
            <WithTooltip title={disabledTooltip}>
                {button}
            </WithTooltip>
        );
    }

    return button;
}

// True when an expression compares against the accessed channel's attributes.
// Such a rule can only be tested against a concrete channel's values, so the
// editor must supply one (its own scope, or the inline TestChannelSelect).
export function referencesResourceAttributes(expression: string): boolean {
    return expression.includes(RESOURCE_ATTRIBUTES_PREFIX);
}

type ChannelOption = {label: string; value: string};

interface TestChannelSelectProps {
    onChange: (channelId: string) => void;
    disabled?: boolean;
}

// Inline single-channel picker for testing a resource.attributes.* rule when
// the editor has no channel of its own (the system-console parent-policy
// editor). Searches private channels only — that's all access policies apply
// to for now — via the same admin all-channels search the assignment modal
// uses. Reports the chosen id through onChange; the editor feeds it into the
// test/simulate call.
export function TestChannelSelect({onChange, disabled}: TestChannelSelectProps): JSX.Element {
    const {formatMessage} = useIntl();
    const dispatch = useDispatch();
    const [selected, setSelected] = useState<ChannelOption | null>(null);

    const placeholder = formatMessage({id: 'admin.access_control.test.channel_select.placeholder', defaultMessage: 'Select a channel to test against'});

    const loadOptions = useCallback(async (term: string) => {
        const action = await dispatch(searchAllChannels(term, {
            private: true,
            exclude_group_constrained: true,
            exclude_remote: true,
            exclude_default_channels: true,
        }));
        const channels = (action as ActionResult<ChannelWithTeamData[]>).data ?? [];
        return channels.map((c): ChannelOption => ({
            value: c.id,
            label: c.team_display_name ? `${c.display_name} (${c.team_display_name})` : c.display_name,
        }));
    }, [dispatch]);

    return (
        <AsyncSelect<ChannelOption, false>
            classNamePrefix='access-control-test-channel'
            className='access-control-test-channel-select'
            value={selected}
            isDisabled={disabled}
            isClearable={false}
            defaultOptions={true}
            cacheOptions={true}
            loadOptions={loadOptions}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(option) => {
                setSelected(option);
                onChange(option ? option.value : '');
            }}
        />
    );
}

interface TestResultsProps {
    expression: string;

    /** Channel to resolve resource.attributes.* against: the editor's own
     *  scope (channel settings) or the one picked via TestChannelSelect. */
    channelId?: string;
    teamId?: string;
    isStacked?: boolean;
    onExited: () => void;
}

// The built-in expression test/simulate results modal.
export function TestResults({expression, channelId, teamId, isStacked, onExited}: TestResultsProps): JSX.Element {
    return (
        <TestResultsModal
            onExited={onExited}
            isStacked={isStacked}
            actions={{
                openModal: () => {},
                searchUsers: (term: string, after: string, limit: number) =>
                    searchUsersForExpression(expression, term, after, limit, channelId, teamId),
            }}
        />
    );
}

export function AddAttributeButton({onClick, disabled}: AddAttributeButtonProps): JSX.Element {
    return (
        <Button
            emphasis='tertiary'
            size='sm'
            onClick={onClick}
            disabled={disabled}
        >
            <i className='icon icon-plus'/>
            <FormattedMessage
                id='admin.access_control.table_editor.add_attribute'
                defaultMessage='Add attribute'
            />
        </Button>
    );
}

export function HelpText({message, onLearnMoreClick}: HelpTextProps): JSX.Element {
    return (
        <div className='editor__help-text'>
            <Markdown
                message={message}
                options={{mentionHighlight: false}}
            />
            {onLearnMoreClick && (
                <a
                    href='#'
                    className='editor__learn-more'
                    onClick={onLearnMoreClick}
                >
                    <FormattedMessage
                        id='admin.access_control.table_editor.learnMore'
                        defaultMessage='Learn more about creating access expressions with examples.'
                    />
                </a>
            )}
        </div>
    );
}
