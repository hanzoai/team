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
  import { type Ref } from '@hanzo/core'
  import drive, { Drive, type Folder } from '@hanzo/drive'
  import { createQuery } from '@hanzo/presentation'
  import { showMenu } from '@hanzo/view-resources'

  import FolderBrowser from './FolderBrowser.svelte'

  export let _id: Ref<Folder>
  export let readonly: boolean = false
  export let embedded: boolean = false

  export function canClose (): boolean {
    return false
  }

  let object: Folder | undefined = undefined

  const query = createQuery()
  $: query.query(drive.class.Folder, { _id }, (res) => {
    ;[object] = res
  })

  $: space = object?.space as Ref<Drive>
</script>

{#if object}
  <FolderBrowser
    {space}
    parent={object._id}
    {object}
    {embedded}
    {readonly}
    type={'folder'}
    on:contextmenu={(evt) => {
      showMenu(evt, { object })
    }}
  />
{/if}
