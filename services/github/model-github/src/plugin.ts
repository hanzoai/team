//
// Copyright © 2023 Hanzo AI Inc.
//

import { mergeIds, type IntlString, type Resource } from '@hanzoteam/platform'
import { githubId } from '@hanzoteam/github'
import github from '@hanzoteam/github-resources/src/plugin'

import { type ChatMessageViewlet } from '@hanzoteam/chunter'
import { type Doc, type Ref, type Space } from '@hanzoteam/core'
import {
  type DocCreateFunction,
  type ObjectSearchCategory,
  type DocCreateAnalyticsPropsFunction
} from '@hanzoteam/model-presentation'
import { type NotificationGroup } from '@hanzoteam/notification'
import type { AnyComponent } from '@hanzoteam/ui/src/types'
import { type ActionCategory, type Viewlet } from '@hanzoteam/view'

export default mergeIds(githubId, github, {
  component: {
    Connect: '' as AnyComponent,
    Configure: '' as AnyComponent,
    PullRequestPresenter: '' as AnyComponent,
    TitlePresenter: '' as AnyComponent,
    PullRequestNotificationPresenter: '' as AnyComponent,
    AuthenticationCheck: '' as AnyComponent,
    GithubIssueHeader: '' as AnyComponent,
    GithubReviewPresenter: '' as AnyComponent,
    GithubReviewThreadPresenter: '' as AnyComponent,

    MergeableValuePresenter: '' as AnyComponent,
    PullRequestStateValuePresenter: '' as AnyComponent,
    PullRequestReviewDecisionValuePresenter: '' as AnyComponent,
    PullRequestMergeState: '' as AnyComponent
  },
  completion: {
    PullRequestCategory: '' as Ref<ObjectSearchCategory>
  },
  string: {
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,
    PRFile: '' as IntlString,
    PRReview: '' as IntlString,
    PRCommit: '' as IntlString,
    PRDraft: '' as IntlString,
    PRMergedAt: '' as IntlString,
    PRClosedAt: '' as IntlString,
    MergeCommitSHA: '' as IntlString,
    GithubIssue: '' as IntlString,
    GithubMilestone: '' as IntlString,
    Mergeable: '' as IntlString,
    GithubUser: '' as IntlString,

    PullRequestMergeState: '' as IntlString,
    PullRequestReviewDecision: '' as IntlString
  },
  viewlet: {
    PullRequests: '' as Ref<Viewlet>
  },
  functions: {
    ShowForRepositoryOnly: '' as Resource<(spaces: Space[]) => Promise<boolean>>,
    UpdateIssue: '' as Resource<DocCreateFunction>,
    GetCreateIssueAnalyticsProps: '' as Resource<DocCreateAnalyticsPropsFunction>
  },
  ids: {
    AssigneeNotification: '' as Ref<Doc>,
    GithubNotificationGroup: '' as Ref<NotificationGroup>,
    GitHubPullRequestChatMessageViewlet: '' as Ref<ChatMessageViewlet>
  },
  category: {
    Github: '' as Ref<ActionCategory>
  }
})
