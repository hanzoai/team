<!--
//
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
//
-->
<script lang="ts">
  import card, { Card } from '@hanzo/card'
  import contact from '@hanzo/contact'
  import { getResource } from '@hanzo/platform'
  import { getClient } from '@hanzo/presentation'
  import { CollaboratorEditor, HeadingsExtension, ImageUploadOptions } from '@hanzo/text-editor-resources'
  import { AnySvelteComponent } from '@hanzo/ui'
  import { getCollaborationUser } from '@hanzo/view-resources'
  import { Extensions, FocusPosition } from '@tiptap/core'
  import { createEventDispatcher } from 'svelte'

  export let object: Card
  export let readonly = false
  export let boundary: HTMLElement | undefined = undefined
  export let attachFile: ImageUploadOptions['attachFile'] | undefined = undefined
  export let focusIndex = -1
  export let overflow: 'auto' | 'none' = 'none'
  export let editorAttributes: Record<string, string> = {}
  export let requestSideSpace: ((width: number) => void) | undefined = undefined

  const client = getClient()

  const user = getCollaborationUser()
  let userComponent: AnySvelteComponent | undefined
  void getResource(contact.component.CollaborationUserAvatar).then((component) => {
    userComponent = component
  })

  let collabEditor: CollaboratorEditor

  export function focus (position?: FocusPosition): void {
    collabEditor.focus(position)
  }

  const dispatch = createEventDispatcher()

  const handleExtensions = (): Extensions => [
    HeadingsExtension.configure({
      onChange: (headings) => {
        dispatch('headings', headings)
      }
    })
  ]

  $: attribute = {
    key: 'content',
    attr: client.getHierarchy().getAttribute(card.class.Card, 'content')
  }
</script>

<CollaboratorEditor
  {object}
  {attribute}
  {user}
  {userComponent}
  {focusIndex}
  {readonly}
  {attachFile}
  {boundary}
  {overflow}
  {editorAttributes}
  {requestSideSpace}
  onExtensions={handleExtensions}
  on:update
  on:open-document
  on:loaded
  bind:this={collabEditor}
/>
