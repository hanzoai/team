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
  import { Button, eventToHTMLElement, IconFilter, showPopup } from '@hanzo/ui'
  import { Ref } from '@hanzo/core'
  import activity, { ActivityMessagesFilter } from '@hanzo/activity'
  import view from '@hanzo/view-resources/src/plugin'
  import { getClient } from '@hanzo/presentation'
  import { ActivityMessagesFilterPopup } from '@hanzo/activity-resources'

  export let selectedFilters: Ref<ActivityMessagesFilter>[] = []

  const client = getClient()
  const filters = client.getModel().findAllSync(activity.class.ActivityMessagesFilter, {})

  const handleClick = (ev: MouseEvent): void => {
    showPopup(
      ActivityMessagesFilterPopup,
      { filters, showToggle: false },
      eventToHTMLElement(ev),
      () => {},
      (res) => {
        if (res === undefined) return
        if (res.action === 'toggle') {
          return
        }
        selectedFilters = (Array.isArray(res.value) ? res.value : [res.value]) as Ref<ActivityMessagesFilter>[]
      }
    )
  }
</script>

<Button
  icon={IconFilter}
  kind={'regular'}
  size={'medium'}
  pressed={selectedFilters[0] !== activity.ids.AllFilter}
  showTooltip={{ label: view.string.Filter }}
  on:click={handleClick}
/>
