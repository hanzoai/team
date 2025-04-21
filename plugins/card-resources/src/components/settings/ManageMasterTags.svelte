<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { MasterTag } from '@hanzo/card'
  import { Ref } from '@hanzo/core'
  import { createQuery } from '@hanzo/presentation'
  import { clearSettingsStore } from '@hanzo/setting-resources'
  import {
    Icon,
    IconOpenedArrow,
    IconWithEmoji,
    Label,
    Location,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore
  } from '@hanzo/ui'
  import { onDestroy } from 'svelte'
  import card from '../../plugin'
  import view from '@hanzo/view'

  export let categoryName: string

  let selectedTagId: Ref<MasterTag> | undefined

  onDestroy(resolvedLocationStore.subscribe(handleLocationChanged))

  function handleLocationChanged (loc: Location): void {
    selectedTagId = loc.path[4] as Ref<MasterTag>
  }

  let tags: MasterTag[] = []
  const tagsQuery = createQuery()
  $: tagsQuery.query(card.class.MasterTag, {}, (result) => {
    tags = result.filter((p) => p.removed !== true).sort((a, b) => a.label.localeCompare(b.label))
  })

  function selectProjectType (id: string): void {
    clearSettingsStore()
    const loc = getCurrentResolvedLocation()
    loc.path[3] = categoryName
    loc.path[4] = id
    loc.path.length = 5
    navigate(loc)
  }
</script>

{#each tags as tag}
  <button
    class="hanzoaiTaskNavLink-container font-regular-14"
    class:selected={tag._id === selectedTagId}
    on:click={() => {
      selectProjectType(tag._id)
    }}
  >
    <div class="hanzoaiTaskNavLink-avatar">
      {#if tag.icon}
        <div class="hanzoaiTaskNavLink-icon">
          <Icon
            icon={tag.icon === view.ids.IconWithEmoji ? IconWithEmoji : tag.icon ?? card.icon.MasterTag}
            iconProps={tag.icon === view.ids.IconWithEmoji ? { icon: tag.color } : {}}
            size="small"
            fill="currentColor"
          />
        </div>
      {/if}
    </div>
    <div class="hanzoaiTaskNavLink-content">
      <span class="hanzoaiTaskNavLink-content__title"><Label label={tag.label} /></span>
    </div>
    {#if tag._id === selectedTagId}
      <div class="hanzoaiTaskNavLink-icon right">
        <IconOpenedArrow size={'small'} />
      </div>
    {/if}
  </button>
{/each}

<style lang="scss">
  .hanzoaiTaskNavLink-container {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 0.75rem;
    padding: 0 0.75rem 0 0.5rem;
    height: 3.5rem;
    min-width: 0;
    border: none;
    border-radius: 0.375rem;
    outline: none;

    &.selected {
      cursor: auto;
    }
    .hanzoaiTaskNavLink-avatar {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: 2.5rem;
      height: 2.5rem;
      min-width: 0;
      background-color: var(--global-ui-BackgroundColor);
      border-radius: 0.375rem;
    }
    .hanzoaiTaskNavLink-icon {
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: var(--global-secondary-TextColor);

      &.right {
        visibility: hidden;
      }
    }
    .hanzoaiTaskNavLink-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      flex-grow: 1;
      min-width: 0;
      min-height: 0;

      &__title {
        white-space: nowrap;
        word-break: break-all;
        text-overflow: ellipsis;
        overflow: hidden;
        text-align: left;
        min-width: 0;
        color: var(--global-primary-TextColor);
      }
    }

    &:hover {
      background-color: var(--global-ui-hover-highlight-BackgroundColor);
    }
    &.selected {
      background-color: var(--global-ui-highlight-BackgroundColor);

      .hanzoaiTaskNavLink-icon {
        color: var(--global-accent-TextColor);

        &.right {
          visibility: visible;
        }
      }
      .hanzoaiTaskNavLink-content .hanzoaiTaskNavLink-content__title {
        font-weight: 700;
        color: var(--global-accent-TextColor);
      }
    }
  }
</style>
