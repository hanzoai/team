// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import classNames from 'classnames';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {useDispatch} from 'react-redux';
import type {MultiValue, MultiValueProps, OptionProps} from 'react-select';
import AsyncSelect from 'react-select/async';

import type {Channel, ChannelWithTeamData} from '@mattermost/types/channels';

import {searchAllChannels} from 'mattermost-redux/actions/channels';
import {debounce} from 'mattermost-redux/actions/helpers';
import {Client4} from 'mattermost-redux/client';

import ChannelIcon from 'components/channel_type_icon/channel_icon';
import CloseCircleSolidIcon from 'components/widgets/icons/close_circle_solid_icon';

import './channel_multiselector.scss';

type ChannelOption = {
    label: string;
    value: string;
    raw?: Channel;
};

type Props = {
    id: string;
    channelIds: string[];
    onChange: (channelIds: string[]) => void;
    disabled?: boolean;
    hasError?: boolean;
};

// channelLabel renders "Channel Name (Team Name)" so both the dropdown option and
// the selected pill show the channel together with the team it belongs to.
function channelLabel(channel: ChannelWithTeamData | Channel): string {
    const teamName = (channel as ChannelWithTeamData).team_display_name;
    return teamName ? `${channel.display_name} (${teamName})` : channel.display_name;
}

function Remove(props: React.ComponentProps<'div'>) {
    return (
        <div
            className='Remove'
            {...props}
        >
            <CloseCircleSolidIcon/>
        </div>
    );
}

function ChannelSelectorPill(props: MultiValueProps<ChannelOption, true>) {
    const {data, innerProps, removeProps} = props;

    return (
        <div
            className='ChannelSelectorPill'
            {...innerProps}
        >
            <ChannelIcon
                channel={data.raw}
                size={16}
            />
            {data.label}
            <Remove {...removeProps}/>
        </div>
    );
}

function ChannelSelectorOption(props: OptionProps<ChannelOption, true>) {
    const {data, innerProps} = props;

    return (
        <div
            className='ChannelSelectorOption'
            {...innerProps}
        >
            <ChannelIcon
                channel={data.raw}
                size={16}
            />
            {data.label}
        </div>
    );
}

export default function ChannelMultiSelector({id, channelIds, onChange, disabled = false, hasError = false}: Props) {
    const dispatch = useDispatch();
    const {formatMessage} = useIntl();
    const [selected, setSelected] = useState<ChannelOption[]>([]);
    const resolvedInitial = useRef(false);

    // Resolve the initially-saved channel ids (the config API only stores ids) into
    // labelled options so the pills show channel + team names on first render.
    useEffect(() => {
        if (resolvedInitial.current || channelIds.length === 0) {
            if (channelIds.length === 0) {
                resolvedInitial.current = true;
            }
            return undefined;
        }

        let cancelled = false;
        const resolve = async () => {
            const channelResults = await Promise.allSettled(channelIds.map((channelId) => Client4.getChannel(channelId)));
            const channels: Channel[] = [];
            channelResults.forEach((r) => {
                if (r.status === 'fulfilled') {
                    channels.push(r.value);
                }
            });

            const teamIds = [...new Set(channels.map((c) => c.team_id).filter(Boolean))];
            const teamResults = await Promise.allSettled(teamIds.map((teamId) => Client4.getTeam(teamId)));
            const teamDisplayNames: Record<string, string> = {};
            teamResults.forEach((r) => {
                if (r.status === 'fulfilled') {
                    teamDisplayNames[r.value.id] = r.value.display_name;
                }
            });

            if (cancelled) {
                return;
            }
            resolvedInitial.current = true;
            setSelected(channels.map((c) => ({
                value: c.id,
                label: channelLabel({...c, team_display_name: teamDisplayNames[c.team_id] || ''} as ChannelWithTeamData),
                raw: c,
            })));
        };
        resolve();

        return () => {
            cancelled = true;
        };
    }, [channelIds]);

    const loadOptions = useMemo(() => debounce(async (term: string, callback: (options: ChannelOption[]) => void) => {
        try {
            // Omitting page/per_page makes searchAllChannels resolve to a flat
            // ChannelWithTeamData[] (team_display_name included) rather than a paged result.
            const result = await dispatch(searchAllChannels(term, {exclude_default_channels: false}));
            const channels = (result?.data || []) as ChannelWithTeamData[];
            callback(channels.map((c) => ({value: c.id, label: channelLabel(c), raw: c})));
        } catch {
            callback([]);
        }
    }, 200), [dispatch]);

    const handleChange = useCallback((value: MultiValue<ChannelOption>) => {
        const options = value as ChannelOption[];
        setSelected(options);
        onChange(options.map((o) => o.value));
    }, [onChange]);

    const noChannelsMessage = useCallback(({inputValue}: {inputValue: string}) => {
        if (!inputValue || inputValue.trim() === '') {
            return null;
        }
        return formatMessage({id: 'admin.deliveryTracking.channelSelector.noChannels', defaultMessage: 'No channels found'});
    }, [formatMessage]);

    const placeholder = formatMessage({id: 'admin.deliveryTracking.channelSelector.placeholder', defaultMessage: 'Add channels...'});

    return (
        <div className={classNames('DeliveryTrackingChannelSelector', {error: hasError})}>
            <AsyncSelect<ChannelOption, true>
                id={id}
                inputId={`${id}_input`}
                classNamePrefix='DeliveryTrackingChannelSelector'
                className='Input Input__focus'
                isMulti={true}
                isClearable={false}
                hideSelectedOptions={true}
                cacheOptions={true}
                value={selected}
                loadOptions={loadOptions}
                onChange={handleChange}
                placeholder={placeholder}
                noOptionsMessage={noChannelsMessage}
                isDisabled={disabled}
                menuPlacement='top'
                menuPortalTarget={document.body}
                components={{
                    DropdownIndicator: () => null,
                    IndicatorSeparator: () => null,
                    Option: ChannelSelectorOption,
                    MultiValue: ChannelSelectorPill,
                }}
            />
        </div>
    );
}
