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
  import { Ref, SpaceType, WithLookup } from '@hanzo/core'
  import { Icon, Label, IconOpenedArrow } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../../plugin'

  export let selectedTypeId: Ref<SpaceType> | undefined
  export let types: WithLookup<SpaceType>[] = []

  const dispatch = createEventDispatcher()

  function handleSelected (type: SpaceType): void {
    selectedTypeId = type._id

    dispatch('change', selectedTypeId)
  }
</script>

{#each types as type}
  {@const descriptor = type.$lookup?.descriptor}
  {@const dIcon = descriptor?.icon === '' || descriptor?.icon == null ? setting.icon.Setting : descriptor.icon}
  <button
    class="hanzoaiTaskNavLink-container font-regular-14"
    class:selected={type._id === selectedTypeId}
    on:click={() => {
      handleSelected(type)
    }}
  >
    <div class="hanzoaiTaskNavLink-avatar">
      <div class="hanzoaiTaskNavLink-icon">
        {#if dIcon}
          <Icon icon={dIcon} size="small" fill="currentColor" />
        {/if}
      </div>
    </div>
    {#if descriptor}
      <div class="hanzoaiTaskNavLink-content">
        <span class="hanzoaiTaskNavLink-content__title">{type.name}</span>
        <span class="hanzoaiTaskNavLink-content__descriptor">
          <Label label={descriptor.name} />
        </span>
      </div>
    {/if}
    {#if type._id === selectedTypeId}
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

      &__title,
      &__descriptor {
        white-space: nowrap;
        word-break: break-all;
        text-overflow: ellipsis;
        overflow: hidden;
        text-align: left;
        min-width: 0;
      }
      &__title {
        color: var(--global-primary-TextColor);
      }
      &__descriptor {
        color: var(--global-secondary-TextColor);
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
      .hanzoaiTaskNavLink-content .hanzoaiTaskNavLink-content__descriptor {
        color: var(--global-primary-TextColor);
      }
    }
  }
</style>
