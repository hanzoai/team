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
  import { Button, resizeObserver, deviceOptionsStore, EditWithIcon, IconSearch } from '@hanzo/ui'
  import { Filter } from '@hanzo/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'

  export let filter: Filter
  export let onChange: (e: Filter) => void

  const dispatch = createEventDispatcher()

  let search = filter.value[0] ?? ''

  filter.modes = [view.filter.FilterContains]
  filter.mode ??= filter.modes[0]

  export function onKeyDown (event: KeyboardEvent): boolean {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()

      save()

      return true
    }
    return false
  }

  function save () {
    if (search == null || search === '') {
      return
    }
    filter.value = [search]

    onChange(filter)
    dispatch('close')
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')} on:keydown={onKeyDown}>
  <div class="header no-border">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      placeholder={filter.key.label}
      on:change
    />
  </div>
  <Button shape="filter" label={view.string.Apply} disabled={search === ''} on:click={save} />
</div>
