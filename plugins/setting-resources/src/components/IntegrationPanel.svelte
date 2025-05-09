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
  import { Ref } from '@hanzo/core'
  import { Panel } from '@hanzo/panel'
  import { createQuery } from '@hanzo/presentation'
  import { Integration, IntegrationType } from '@hanzo/setting'
  import setting from '../plugin'
  import PluginCard from './PluginCard.svelte'
  import { translate } from '@hanzo/platform'
  import { themeStore } from '@hanzo/ui'

  export let _id: Ref<Integration>
  // export let _class: Ref<Class<Integration>>
  export let embedded: boolean = false

  let integration: Integration | undefined = undefined
  const query = createQuery()

  $: query.query(
    setting.class.Integration,
    {
      _id
    },
    (res) => {
      ;[integration] = res
    }
  )

  let type: IntegrationType | undefined = undefined
  const typeQuery = createQuery()

  $: integration &&
    typeQuery.query(
      setting.class.IntegrationType,
      {
        _id: integration.type
      },
      (res) => {
        ;[type] = res
      }
    )

  let title: string = ''
  translate(setting.string.Integrations, {}, $themeStore.language).then((res) => (title = res))
</script>

{#if integration}
  <Panel {title} object={integration} isHeader={false} isAside={false} {embedded} withoutActivity withoutInput>
    <div class="max-w-80 min-w-80">
      {#if type}
        <PluginCard {integration} integrationType={type} />
      {/if}
    </div>
  </Panel>
{/if}
