<!--
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
-->
<script lang="ts">
  import { Class, Ref } from '@hanzo/core'
  import { createQuery } from '@hanzo/presentation'
  import { ChunterSpace } from '@hanzo/chunter'
  import { InboxNotificationsClientImpl } from '@hanzo/notification-resources'

  import ChannelView from './ChannelView.svelte'

  export let _id: Ref<ChunterSpace>
  export let _class: Ref<Class<ChunterSpace>>
  export let autofocus = true

  const objectQuery = createQuery()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = inboxClient.contextByDoc

  let object: ChunterSpace | undefined = undefined

  $: context = $contextByDocStore.get(_id)

  $: objectQuery.query(_class, { _id }, (res) => {
    object = res[0]
  })
</script>

{#if object}
  <ChannelView {object} {context} {autofocus} on:close />
{/if}
