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
  import ui, { Icon, Label, IconEdit } from '@hanzo/ui'
  import { AttributeModel } from '@hanzo/view'
  import activity, { DocAttributeUpdates, DocUpdateMessageViewlet } from '@hanzo/activity'

  import ChangeAttributesTemplate from './ChangeAttributesTemplate.svelte'
  import { getIsTextType } from '../../../utils'
  import { Ref, Space } from '@hanzo/core'

  export let viewlet: DocUpdateMessageViewlet | undefined
  export let attributeModel: AttributeModel
  export let values: DocAttributeUpdates['set']
  export let prevValue: any
  export let preview = false
  export let space: Ref<Space> | undefined = undefined

  $: attrViewletConfig = viewlet?.config?.[attributeModel.key]
  $: attributeIcon = attrViewletConfig?.icon ?? attributeModel.icon ?? IconEdit
  $: isUnset = values.length > 0 && !values.some((value) => value != null && value !== '')

  $: isTextType = getIsTextType(attributeModel)

  let isDiffShown = false

  function toggleShowMore (): void {
    isDiffShown = !isDiffShown
  }
</script>

{#if isUnset}
  <div class="unset row overflow-label">
    <span class="mr-1"><Icon icon={attributeIcon} size="small" /></span>
    <Label label={activity.string.Unset} />
    <span class="lower"><Label label={attributeModel.label} /></span>
  </div>
{:else if isTextType}
  {#if preview}
    <div class="row overflow-label">
      <span class="mr-1"><Icon icon={attributeIcon} size="small" /></span>
      <Label label={activity.string.Changed} />
      <span class="lower fs-bold overflow-label">
        <Label label={attributeModel.label} />
      </span>
    </div>
  {:else}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="showMore" on:click={toggleShowMore}>
      <div class="triangle" class:left={!isDiffShown} class:down={isDiffShown} />
      <Label label={isDiffShown ? ui.string.ShowLess : ui.string.ShowMore} />
    </div>
    {#if isDiffShown}
      <svelte:component
        this={attributeModel.presenter}
        attribute={attributeModel.attribute}
        value={values[0]}
        {prevValue}
        withShowMore={false}
        showOnlyDiff
      />
    {/if}
  {/if}
{:else}
  <ChangeAttributesTemplate {viewlet} {attributeModel} {values} {preview} {space}>
    <svelte:fragment slot="text">
      <Label label={attributeModel.label} />
      <span class="lower"><Label label={activity.string.Set} /></span>
      <span class="lower"><Label label={activity.string.To} /></span>
    </svelte:fragment>
  </ChangeAttributesTemplate>
{/if}

<style lang="scss">
  .row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--global-primary-TextColor);
  }

  .showMore {
    color: var(--global-primary-LinkColor);
    cursor: pointer;
    display: flex;
    align-items: center;
    font-weight: 500;
    gap: 0.5rem;

    .triangle {
      width: 0;
      height: 0;

      &.left {
        border-top: 0.25rem solid transparent;
        border-bottom: 0.25rem solid transparent;
        border-left: 0.25rem solid var(--global-primary-LinkColor);
        border-right: none;
      }

      &.down {
        border-left: 0.25rem solid transparent;
        border-right: 0.25rem solid transparent;
        border-top: 0.25rem solid var(--global-primary-LinkColor);
        border-bottom: none;
      }
    }

    &:hover {
      color: var(--global-focus-BorderColor);

      .triangle {
        &.left {
          border-left-color: var(--global-focus-BorderColor);
        }

        &.down {
          border-top-color: var(--global-focus-BorderColor);
        }
      }
    }
  }
</style>
