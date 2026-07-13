// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Channel} from './channels';
import type {Post} from './posts';
import type {
    NameMappedPropertyFields,
    PropertyValue,
} from './properties';
import type {Team} from './teams';

export type ContentFlaggingEvent = 'flagged' | 'assigned' | 'removed' | 'dismissed';

export type NotificationTarget = 'reviewers' | 'author' | 'reporter';

export type ContentFlaggingConfig = {
    reasons: string[];
    reporter_comment_required: boolean;
    reviewer_comment_required: boolean;
    notify_reporter_on_dismissal?: boolean;
    notify_reporter_on_removal?: boolean;

    // Reviewer-only: whether the post delivery tracking ("Delivered to"
    // recipient list) feature is enabled. Present only when the config is
    // fetched as a content reviewer.
    delivery_tracking_enabled?: boolean;
};

export type ContentFlaggingState = {
    settings?: ContentFlaggingConfig;
    fields?: NameMappedPropertyFields;
    postValues?: {[key: Post['id']]: Array<PropertyValue<unknown>>};
    flaggedPosts?: {[key: Post['id']]: Post};
    channels?: {[key: Channel['id']]: Channel};
    teams?: {[key: Team['id']]: Team};
};

export enum ContentFlaggingStatus {
    Pending = 'Pending',
    Assigned = 'Assigned',
    Removed = 'Removed',
    Retained = 'Retained',
}

// DeliveryTrackingStatus mirrors the server's delivery_tracking_status property
// value (model.DeliveryTrackingStatus*), tracking the "Delivered to" recipient
// list copy-job state for a flagged post.
export enum DeliveryTrackingStatus {
    NotStarted = 'not_started',
    InProgress = 'in_progress',
    Completed = 'completed',
    Failed = 'failed',
}
