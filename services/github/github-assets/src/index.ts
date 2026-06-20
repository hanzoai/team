//
// Copyright © 2023 Hanzo AI Inc.
//

import { loadMetadata } from '@hanzoteam/platform'
import github from '@hanzoteam/github'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(github.icon, {
  Github: `${icons}#github`,
  GithubRepository: `${icons}#repository`,
  PullRequest: `${icons}#pullRequest`,
  PullRequestMerged: `${icons}#pullRequestMerged`,
  PullRequestClosed: `${icons}#pullRequestClosed`,
  Forks: `${icons}#forks`
})
