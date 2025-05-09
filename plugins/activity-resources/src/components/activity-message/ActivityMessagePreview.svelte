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
  import { DisplayActivityMessage, ActivityMessagePreviewType } from '@hanzo/activity'
  import { getClient } from '@hanzo/presentation'
  import { Action, Component } from '@hanzo/ui'
  import { Class, Doc, Ref, Space } from '@hanzo/core'

  import activity from '../../plugin'

  export let doc: Doc | undefined
  export let value: DisplayActivityMessage
  export let readonly = false
  export let type: ActivityMessagePreviewType = 'full'
  export let actions: Action[] = []
  export let space: Ref<Space> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: previewMixin = hierarchy.classHierarchyMixin(
    value._class as Ref<Class<Doc>>,
    activity.mixin.ActivityMessagePreview
  )
</script>

{#if previewMixin}
  <Component
    is={previewMixin.presenter}
    props={{
      value,
      type,
      readonly,
      actions,
      space,
      doc
    }}
    on:click
  />
{/if}
