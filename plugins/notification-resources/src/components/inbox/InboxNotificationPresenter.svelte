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
  import view from '@hanzo/view'
  import { getClient } from '@hanzo/presentation'
  import { Component } from '@hanzo/ui'
  import { Class, Doc, type Ref, type Space } from '@hanzo/core'
  import { ActivityNotificationViewlet, DisplayInboxNotification } from '@hanzo/notification'

  export let value: DisplayInboxNotification
  export let object: Doc | undefined
  export let viewlets: ActivityNotificationViewlet[] = []
  export let space: Ref<Space> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: objectPresenter = hierarchy.classHierarchyMixin(value._class as Ref<Class<Doc>>, view.mixin.ObjectPresenter)
</script>

{#if objectPresenter}
  <Component is={objectPresenter.presenter} props={{ value, viewlets, space, object }} on:click />
{/if}
