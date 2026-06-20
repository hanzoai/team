//
// Copyright © 2026 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { Doc, Hierarchy } from '@hanzoteam/core'
import { concatLink } from '@hanzoteam/core'
import { getMetadata } from '@hanzoteam/platform'
import presentation from '@hanzoteam/presentation'
import { getObjectLinkFragment } from '@hanzoteam/view-resources'
import { locationToUrl } from '@hanzoteam/ui'
import view from '@hanzoteam/view'
import { escapeMarkdownLinkText, escapeMarkdownLinkUrl } from './escape'

/**
 * Create a markdown link for a document
 */
export async function createMarkdownLink (hierarchy: Hierarchy, card: Doc, value: string): Promise<string> {
  try {
    const loc = await getObjectLinkFragment(hierarchy, card, {}, view.component.EditDoc)
    const relativeUrl = locationToUrl(loc)
    const frontUrl =
      getMetadata(presentation.metadata.FrontUrl) ?? (typeof window !== 'undefined' ? window.location.origin : '')
    const fullUrl = concatLink(frontUrl, relativeUrl)
    const escapedText = escapeMarkdownLinkText(value)
    const escapedUrl = escapeMarkdownLinkUrl(fullUrl)
    return `[${escapedText}](${escapedUrl})`
  } catch (error) {
    console.warn('Error creating markdown link', error)
    return escapeMarkdownLinkText(value)
  }
}
