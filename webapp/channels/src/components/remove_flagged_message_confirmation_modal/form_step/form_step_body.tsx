// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {useSelector} from 'react-redux';

import {DeliveryTrackingStatus} from '@mattermost/types/content_flagging';
import type {ContentFlaggingConfig} from '@mattermost/types/content_flagging';
import type {Post} from '@mattermost/types/posts';
import type {GlobalState} from '@mattermost/types/store';
import type {UserProfile} from '@mattermost/types/users';

import {contentFlaggingFields, postContentFlaggingValues} from 'mattermost-redux/selectors/entities/content_flagging';

import SectionNotice from 'components/section_notice';
import type {TextboxElement} from 'components/textbox';
import AdvancedTextbox from 'components/widgets/advanced_textbox/advanced_textbox';

import {DataSpillagePropertyNames} from 'utils/constants';

import FlaggedMessageBody from '../flagged_message_body';

import './form_step_body.scss';

type BodyProps = {
    action: 'keep' | 'remove';
    flaggedPost: Post;
    reportingUser: UserProfile;
    contentFlaggingConfig: ContentFlaggingConfig | undefined;
    comment: string;
    commentError: string;
    showCommentPreview: boolean;
    onCommentChange: (e: React.ChangeEvent<TextboxElement>) => void;
    onToggleCommentPreview: () => void;
};

export function FormStepBody({
    action,
    flaggedPost,
    reportingUser,
    contentFlaggingConfig,
    comment,
    commentError,
    showCommentPreview,
    onCommentChange,
    onToggleCommentPreview,
}: BodyProps) {
    const {formatMessage} = useIntl();

    const requiredTitle = formatMessage({id: 'remove_flag_post_confirm_modal.required_comment.title', defaultMessage: 'Comment (required)'});
    const optionalTitle = formatMessage({id: 'remove_flag_post_confirm_modal.optional_comment.title', defaultMessage: 'Comment (optional)'});
    const sectionTitle = contentFlaggingConfig?.reviewer_comment_required ? requiredTitle : optionalTitle;

    const commentPlaceholder = formatMessage({id: 'keep_remove_quarantined_content_modal.comment.placeholder', defaultMessage: 'Add your comment here'});

    const deliveryStatusFieldId = useSelector((state: GlobalState) => contentFlaggingFields(state)?.[DataSpillagePropertyNames.DeliveryTrackingStatus]?.id);
    const deliveryValues = useSelector((state: GlobalState) => postContentFlaggingValues(state, flaggedPost.id));
    const deliveryStatus = deliveryStatusFieldId ? (deliveryValues?.find((value) => value.field_id === deliveryStatusFieldId)?.value as string | undefined) : undefined;
    const showDeliveryTrackingWarning = action === 'remove' && Boolean(contentFlaggingConfig?.delivery_tracking_enabled) && deliveryStatus !== DeliveryTrackingStatus.Completed;

    return (
        <>
            <FlaggedMessageBody
                action={action}
                flaggedPost={flaggedPost}
                reportingUser={reportingUser}
                contentFlaggingConfig={contentFlaggingConfig}
            />

            {showDeliveryTrackingWarning && (
                <div
                    className='section delivery_tracking_warning_section'
                    data-testid='delivery-tracking-delete-warning'
                >
                    <SectionNotice
                        type='warning'
                        title={formatMessage({id: 'data_spillage_report.delivered_to.delete_warning.title', defaultMessage: 'The “Delivered to” list hasn’t been generated'})}
                        text={formatMessage({id: 'data_spillage_report.delivered_to.delete_warning.body', defaultMessage: 'It can’t be generated once the message is removed since all information related to the message will be permanently deleted from Mattermost.'})}
                    />
                </div>
            )}

            <div className='section comment_section'>
                <div
                    className='section_title'
                    data-testid='keep-remove-flagged-message-comment-title'
                >
                    {sectionTitle}
                </div>

                <AdvancedTextbox
                    id='RemoveFlaggedMessageConfirmationModal__comment'
                    channelId={flaggedPost.channel_id}
                    value={comment}
                    onChange={onCommentChange}
                    createMessage={commentPlaceholder}
                    preview={showCommentPreview}
                    togglePreview={onToggleCommentPreview}
                    useChannelMentions={false}
                    onKeyPress={() => {}}
                    hasError={false}
                    errorMessage={commentError}
                    maxLength={1000}
                />
            </div>
        </>
    );
}
