// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {FormattedMessage} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';

import {Button} from '@mattermost/shared/components/button';
import {GenericModal} from '@mattermost/components';
import type {UserProfile} from '@mattermost/types/users';

import {addChannelMembers} from 'mattermost-redux/actions/channels';
import {getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import {suppressOutOfChannelEphemeralPost} from 'actions/views/out_of_channel_mention';

import Constants from 'utils/constants';

import type {GlobalState} from 'types/store';

import './out_of_channel_mention_confirm_modal.scss';

type Props = {
    addable: UserProfile[];
    notAddable: UserProfile[];
    outOfTeam: UserProfile[];
    channelId: string;
    channelType: string;
    rootId: string;
    isPolicyEnforced: boolean;
    onSend: () => void;
    onExited: () => void;
};

function formatUsersList(users: UserProfile[], teammateNameDisplay: string): string {
    const names = users.map((user) => displayUsername(user, teammateNameDisplay));
    if (names.length === 1) {
        return names[0];
    }
    if (names.length === 2) {
        return `${names[0]} and ${names[1]}`;
    }
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function OutOfChannelMentionConfirmModal({
    addable,
    notAddable,
    outOfTeam,
    channelId,
    channelType,
    rootId,
    isPolicyEnforced,
    onSend,
    onExited,
}: Props) {
    const dispatch = useDispatch();
    const teammateNameDisplay = useSelector((state: GlobalState) => getTeammateNameDisplaySetting(state));
    const [show, setShow] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const handleClose = useCallback(() => {
        setShow(false);
    }, []);

    const handleConfirmSend = useCallback(() => {
        dispatch(suppressOutOfChannelEphemeralPost(channelId, rootId));
        onSend();
    }, [dispatch, channelId, rootId, onSend]);

    const handleSend = useCallback(() => {
        setShow(false);
        handleConfirmSend();
    }, [handleConfirmSend]);

    const handleAddAndSend = useCallback(async () => {
        if (addable.length === 0 || saving) {
            return;
        }

        setSaving(true);
        setSubmitError('');

        const result = await dispatch(addChannelMembers(channelId, addable.map((u) => u.id), rootId));
        if (result.error) {
            setSubmitError(result.error.message || '');
            setSaving(false);
            return;
        }

        setShow(false);
        handleConfirmSend();
    }, [addable, saving, dispatch, channelId, rootId, handleConfirmSend]);

    const isPrivate = channelType === Constants.PRIVATE_CHANNEL;
    const addableCount = addable.length;

    const modalTitle = addableCount > 0 ? (
        isPrivate ? (
            <FormattedMessage
                id='out_of_channel_mention_confirm_modal.title.private'
                defaultMessage='{count, plural, one {Add mentioned person to this private channel?} other {Add mentioned people to this private channel?}}'
                values={{count: addableCount}}
            />
        ) : (
            <FormattedMessage
                id='out_of_channel_mention_confirm_modal.title.public'
                defaultMessage='{count, plural, one {Add mentioned person to this channel?} other {Add mentioned people to this channel?}}'
                values={{count: addableCount}}
            />
        )
    ) : (
        <FormattedMessage
            id='out_of_channel_mention_confirm_modal.title.fallback'
            defaultMessage={"People you mentioned aren't in this channel"}
        />
    );

    const footerContent = (
        <>
            <Button
                type='button'
                emphasis='tertiary'
                onClick={handleSend}
                disabled={saving}
            >
                <FormattedMessage
                    id='out_of_channel_mention_confirm_modal.send_without_adding'
                    defaultMessage='Send without adding'
                />
            </Button>
            <Button
                type='button'
                emphasis='primary'
                onClick={handleAddAndSend}
                disabled={saving || addable.length === 0}
            >
                <FormattedMessage
                    id='out_of_channel_mention_confirm_modal.add_and_send'
                    defaultMessage='Add to channel and send'
                />
            </Button>
        </>
    );

    return (
        <GenericModal
            id='outOfChannelMentionConfirmModal'
            className='OutOfChannelMentionConfirmModal a11y__modal'
            show={show}
            onHide={handleClose}
            onExited={onExited}
            compassDesign={true}
            modalHeaderText={modalTitle}
            footerContent={footerContent}
        >
            <div className='OutOfChannelMentionConfirmModal__body'>
                {addable.length > 0 && (
                    <p>
                        <span className='OutOfChannelMentionConfirmModal__mentions'>
                            {formatUsersList(addable, teammateNameDisplay)}
                        </span>
                        {' '}
                        {isPrivate ? (
                            <FormattedMessage
                                id='out_of_channel_mention_confirm_modal.body.private'
                                defaultMessage="{count, plural, one {isn't in this private channel. Add them so they'll be notified. They'll also be able to read all past messages in the channel.} other {aren't in this private channel. Add them so they'll be notified. They'll also be able to read all past messages in the channel.}}"
                                values={{count: addableCount}}
                            />
                        ) : (
                            <FormattedMessage
                                id='out_of_channel_mention_confirm_modal.body.public'
                                defaultMessage="{count, plural, one {isn't in this channel. Add them so they'll be notified.} other {aren't in this channel. Add them so they'll be notified.}}"
                                values={{count: addableCount}}
                            />
                        )}
                    </p>
                )}
                {notAddable.length > 0 && (
                    <p>
                        <span className='OutOfChannelMentionConfirmModal__mentions'>
                            {formatUsersList(notAddable, teammateNameDisplay)}
                        </span>
                        {' '}
                        {isPolicyEnforced ? (
                            <FormattedMessage
                                id='out_of_channel_mention_confirm_modal.not_addable_policy'
                                defaultMessage="{count, plural, one {isn't} other {aren't}} in this channel and won't be notified."
                                values={{count: notAddable.length}}
                            />
                        ) : (
                            <FormattedMessage
                                id='post_body.check_for_out_of_channel_groups_mentions.message'
                                defaultMessage='did not get notified by this mention because they are not in the channel. They cannot be added to the channel because they are not a member of the linked groups. To add them to this channel, they must be added to the linked groups.'
                            />
                        )}
                    </p>
                )}
                {outOfTeam.length > 0 && (
                    <p>
                        <span className='OutOfChannelMentionConfirmModal__mentions'>
                            {formatUsersList(outOfTeam, teammateNameDisplay)}
                        </span>
                        {' '}
                        <FormattedMessage
                            id='out_of_channel_mention_confirm_modal.out_of_team'
                            defaultMessage="{count, plural, one {isn't} other {aren't}} in this channel and won't be notified."
                            values={{count: outOfTeam.length}}
                        />
                        {' '}
                        <FormattedMessage
                            id='out_of_channel_mention_confirm_modal.out_of_team_note'
                            defaultMessage="They are on this server but not on this team, so they can't be added to the channel."
                        />
                    </p>
                )}
                {submitError && (
                    <span
                        id='out-of-channel-mention-modal__invite-error'
                        className='modal__error has-error control-label'
                    >
                        {submitError}
                    </span>
                )}
            </div>
        </GenericModal>
    );
}

export default OutOfChannelMentionConfirmModal;
