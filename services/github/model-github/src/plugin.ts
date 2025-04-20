//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { mergeIds, type IntlString, type Resource } from '@hanzo/platform'
import { githubId } from '@hanzo/github'
import github from '@hanzo/github-resources/src/plugin'

import { type ChatMessageViewlet } from '@hanzo/chunter'
import { type Doc, type Ref, type Space } from '@hanzo/core'
import {
  type DocCreateFunction,
  type ObjectSearchCategory,
  type DocCreateAnalyticsPropsFunction
} from '@hanzo/model-presentation'
import { type NotificationGroup } from '@hanzo/notification'
import type { AnyComponent } from '@hanzo/ui/src/types'
import { type ActionCategory, type Viewlet } from '@hanzo/view'

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
