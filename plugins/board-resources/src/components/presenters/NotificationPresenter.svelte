<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Doc } from '@hanzo/core'
  import notification from '@hanzo/notification'
  import { InboxNotificationsClientImpl } from '@hanzo/notification-resources'
  import { Icon, IconSize } from '@hanzo/ui'

  export let object: Doc
  export let size: IconSize = 'small'

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = inboxClient.contextByDoc
  $: subscribed = $contextByDocStore.get(object._id) !== undefined
</script>

{#if subscribed}
  <div class="sm-tool-icon ml-1 mr-1 flex-center">
    <span class="icon"><Icon icon={notification.icon.Notifications} {size} /></span>
  </div>
{/if}
