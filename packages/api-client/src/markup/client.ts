//
// Copyright © 2024 Hardcore Engineering Inc.
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

import {
  type Class,
  type Doc,
  type Markup,
  type Ref,
  WorkspaceUuid,
  concatLink,
  makeCollabId
} from '@hanzo/core'
import { type CollaboratorClient, getClient } from '@hanzo/collaborator-client'
import { htmlToJSON, jsonToHTML, jsonToMarkup, markupToJSON } from '@hanzo/text'
import { markdownToMarkup, markupToMarkdown } from '@hanzo/text-markdown'

import { type ServerConfig } from '../config'
import { type MarkupOperations, type MarkupFormat, type MarkupRef } from './types'

export function createMarkupOperations (
  url: string,
  workspace: WorkspaceUuid,
  token: string,
  config: ServerConfig
): MarkupOperations {
  return new MarkupOperationsImpl(url, workspace, token, config)
}

class MarkupOperationsImpl implements MarkupOperations {
  private readonly collaborator: CollaboratorClient
  private readonly imageUrl: string
  private readonly refUrl: string

  constructor (
    private readonly url: string,
    private readonly workspace: WorkspaceUuid,
    private readonly token: string,
    private readonly config: ServerConfig
  ) {
    this.refUrl = concatLink(this.url, `/browse?workspace=${workspace}`)
    this.imageUrl = concatLink(this.url, `/files?workspace=${workspace}&file=`)
    this.collaborator = getClient(workspace, token, config.COLLABORATOR_URL)
  }

  async fetchMarkup (
    objectClass: Ref<Class<Doc>>,
    objectId: Ref<Doc>,
    objectAttr: string,
    doc: MarkupRef,
    format: MarkupFormat
  ): Promise<string> {
    const collabId = makeCollabId(objectClass, objectId, objectAttr)
    const markup = await this.collaborator.getMarkup(collabId, doc)
    const json = markupToJSON(markup)

    switch (format) {
      case 'markup':
        return markup
      case 'html':
        return jsonToHTML(json)
      case 'markdown':
        return markupToMarkdown(json, { refUrl: this.refUrl, imageUrl: this.imageUrl })
      default:
        throw new Error('Unknown content format')
    }
  }

  async uploadMarkup (
    objectClass: Ref<Class<Doc>>,
    objectId: Ref<Doc>,
    objectAttr: string,
    value: string,
    format: MarkupFormat
  ): Promise<MarkupRef> {
    let markup: Markup = ''

    switch (format) {
      case 'markup':
        markup = value
        break
      case 'html':
        markup = jsonToMarkup(htmlToJSON(value))
        break
      case 'markdown':
        markup = jsonToMarkup(markdownToMarkup(value, { refUrl: this.refUrl, imageUrl: this.imageUrl }))
        break
      default:
        throw new Error('Unknown content format')
    }

    const collabId = makeCollabId(objectClass, objectId, objectAttr)
    return await this.collaborator.createMarkup(collabId, markup)
  }
}
