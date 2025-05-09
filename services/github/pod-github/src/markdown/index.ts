//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
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

import { MarkupNode, jsonToMarkup, markupToJSON, htmlToJSON } from '@hanzo/text'
import { MarkdownParser, storeNodes, storeMarks, MarkdownState } from '@hanzo/text-markdown'
import { GithubKit } from './extensions'
import { hashanzoaiLink, hashanzoaiLinkText } from '../sync/guest'

/**
 * @public
 */
export function parseMessageMarkdown (
  message: string | undefined,
  refUrl: string,
  imageUrl: string,
  guestUrl: string
): MarkupNode {
  const extensions = [
    GithubKit.configure({
      sub: {
        hashanzoaiText: hashanzoaiLinkText,
        hashanzoaiLink: (href) => hashanzoaiLink(href, guestUrl)
      }
    })
  ]
  const htmlParser = (html: string): MarkupNode => {
    return htmlToJSON(html, extensions)
  }
  const parser = new MarkdownParser({ refUrl, imageUrl, htmlParser })
  const json = parser.parse(message ?? '')
  return json
}

/**
 * @public
 */
export function serializeMessage (node: MarkupNode, refUrl: string, imageUrl: string): string {
  const state = new MarkdownState(storeNodes, storeMarks, { tightLists: true, refUrl, imageUrl })
  state.renderContent(node)
  return state.out
}

/**
 * @public
 */
export async function markupToMarkdown (
  markup: string,
  refUrl: string = 'ref://',
  imageUrl: string = 'http://localhost',
  preprocessor?: (nodes: MarkupNode) => Promise<void>
): Promise<string> {
  const json = markupToJSON(markup)
  await preprocessor?.(json)
  return serializeMessage(json, refUrl, imageUrl)
}

/**
 * @public
 */
export function markdownToMarkup (
  message: string,
  refUrl: string = 'ref://',
  imageUrl: string = 'http://localhost',
  guestUrl: string = 'http://localhost/guest'
): string {
  const json = parseMessageMarkdown(message, refUrl, imageUrl, guestUrl)
  return jsonToMarkup(json)
}
