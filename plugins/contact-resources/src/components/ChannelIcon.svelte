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
  import { Channel, ChannelProvider } from '@hanzo/contact'
  import { Icon, IconSize } from '@hanzo/ui'
  import { getClient } from '@hanzo/presentation'
  import { classIcon } from '@hanzo/view-resources'

  import contact from '../plugin'

  export let value: Channel | undefined
  export let size: IconSize = 'small'

  const client = getClient()

  let provider: ChannelProvider | undefined = undefined

  $: value &&
    client.findOne(contact.class.ChannelProvider, { _id: value.provider }).then((res) => {
      provider = res
    })

  $: icon = provider?.icon ?? classIcon(client, contact.class.Channel)
</script>

{#if icon}
  <Icon {size} {icon} />
{/if}
