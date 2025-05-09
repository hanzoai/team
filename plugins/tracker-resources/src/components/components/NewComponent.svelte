<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { EmployeeBox } from '@hanzo/contact-resources'
  import { Data, Ref } from '@hanzo/core'
  import { IntlString } from '@hanzo/platform'
  import { Card, SpaceSelector, getClient } from '@hanzo/presentation'
  import { StyledTextArea } from '@hanzo/text-editor-resources'
  import { Component, Project } from '@hanzo/tracker'
  import { EditBox } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import ProjectPresenter from '../projects/ProjectPresenter.svelte'

  export let space: Ref<Project>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<Component> = {
    label: '' as IntlString,
    description: '',
    lead: null,
    comments: 0,
    attachments: 0
  }

  let _space = space

  async function onSave () {
    await client.createDoc(tracker.class.Component, _space, object)
  }
</script>

<Card
  label={tracker.string.NewComponent}
  okAction={onSave}
  canSave={object.label !== ''}
  okLabel={tracker.string.CreateComponent}
  gap={'gapV-4'}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={tracker.class.Project}
      label={tracker.string.Project}
      bind:space={_space}
      kind={'regular'}
      size={'large'}
      component={ProjectPresenter}
      defaultIcon={tracker.icon.Home}
    />
  </svelte:fragment>
  <EditBox
    bind:value={object.label}
    placeholder={tracker.string.ComponentNamePlaceholder}
    kind={'large-style'}
    autoFocus
  />
  <StyledTextArea
    bind:content={object.description}
    placeholder={tracker.string.ComponentDescriptionPlaceholder}
    kind={'emphasized'}
    showButtons={false}
  />
  <svelte:fragment slot="pool">
    <EmployeeBox
      label={tracker.string.ComponentLead}
      placeholder={tracker.string.AssignTo}
      bind:value={object.lead}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
      showNavigate={false}
      kind={'regular'}
      size={'large'}
    />
  </svelte:fragment>
</Card>
