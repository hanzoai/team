<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import { BasePreview } from '@hanzo/activity-resources'
  import { Doc, Markup } from '@hanzo/core'
  import { CommonInboxNotification } from '@hanzo/notification'
  import { IntlString, translateCB } from '@hanzo/platform'
  import { getClient } from '@hanzo/presentation'
  import { themeStore } from '@hanzo/ui'

  export let value: CommonInboxNotification

  const client = getClient()

  let content: Markup = ''

  $: void updateContent(value.message, value.messageHtml)

  async function updateContent (message?: IntlString, messageHtml?: Markup): Promise<void> {
    if (messageHtml !== undefined) {
      content = messageHtml
    } else if (message !== undefined) {
      translateCB(message, value.props, $themeStore.language, (res) => {
        content = res
      })
    }
  }

  let headerObject: Doc | undefined = undefined

  $: value.headerObjectId &&
    value.headerObjectClass &&
    client.findOne(value.headerObjectClass, { _id: value.headerObjectId }).then((doc) => {
      headerObject = doc
    })
</script>

<BasePreview
  headerIcon={value.headerIcon}
  header={value.header}
  headerParams={value.intlParams}
  {headerObject}
  text={content}
  account={value.createdBy ?? value.modifiedBy}
  timestamp={value.createdOn ?? value.modifiedOn}
  on:click
/>
