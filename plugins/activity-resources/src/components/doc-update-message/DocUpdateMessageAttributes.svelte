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
  import { Component } from '@hanzo/ui'
  import { AttributeModel } from '@hanzo/view'
  import { getClient } from '@hanzo/presentation'
  import { DocAttributeUpdates, DocUpdateMessage, DocUpdateMessageViewlet } from '@hanzo/activity'
  import { Doc, Ref, Space } from '@hanzo/core'

  import activity from '../../plugin'

  import AddedAttributesPresenter from './attributes/AddedAttributesPresenter.svelte'
  import RemovedAttributesPresenter from './attributes/RemovedAttributesPresenter.svelte'
  import SetAttributesPresenter from './attributes/SetAttributesPresenter.svelte'

  export let viewlet: DocUpdateMessageViewlet | undefined
  export let attributeUpdates: DocAttributeUpdates
  export let attributeModel: AttributeModel
  export let preview = false
  export let space: Ref<Space> | undefined = undefined
  export let object: Doc | undefined
  export let message: DocUpdateMessage

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: presenter =
    viewlet?.config?.[attributeModel.key]?.presenter ??
    hierarchy.classHierarchyMixin(attributeUpdates.attrClass, activity.mixin.ActivityAttributeUpdatesPresenter)
      ?.presenter
</script>

{#if presenter}
  <Component is={presenter} props={{ value: attributeUpdates, space, object, message }} />
{:else}
  {#if attributeUpdates.added.length}
    <AddedAttributesPresenter {viewlet} {attributeModel} values={attributeUpdates.added} {preview} />
  {/if}
  {#if attributeUpdates.removed.length}
    <RemovedAttributesPresenter {viewlet} {attributeModel} values={attributeUpdates.removed} {preview} />
  {/if}
  {#if attributeUpdates.set.length}
    <SetAttributesPresenter
      {viewlet}
      {attributeModel}
      values={attributeUpdates.set}
      {space}
      prevValue={attributeUpdates.prevValue}
      {preview}
    />
  {/if}
{/if}
