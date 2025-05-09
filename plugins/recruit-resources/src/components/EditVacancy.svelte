<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { AttachmentStyleBoxCollabEditor } from '@hanzo/attachment-resources'
  import core, {
    ClassifierKind,
    type CollaborativeDoc,
    Data,
    Doc,
    type MarkupBlobRef,
    Mixin,
    Ref
  } from '@hanzo/core'
  import notification from '@hanzo/notification'
  import { Panel } from '@hanzo/panel'
  import { getResource } from '@hanzo/platform'
  import presentation, { createQuery, getClient } from '@hanzo/presentation'
  import { Vacancy } from '@hanzo/recruit'
  import survey from '@hanzo/survey'
  import tracker from '@hanzo/tracker'
  import { Button, Component, EditBox, IconMixin, IconMoreH, Label } from '@hanzo/ui'
  import view from '@hanzo/view'
  import { DocAttributeBar, DocNavLink, showMenu } from '@hanzo/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import recruit from '../plugin'
  import VacancyApplications from './VacancyApplications.svelte'

  export let _id: Ref<Vacancy>
  export let embedded: boolean = false
  export let readonly = false

  let object: Required<Vacancy>
  let rawName: string = ''
  let rawDesc: string = ''
  let rawFullDesc: MarkupBlobRef | null = null
  let lastId: Ref<Vacancy> | undefined = undefined

  let showAllMixins = false

  const dispatch = createEventDispatcher()
  const inboxClient = getResource(notification.function.GetInboxNotificationsClient).then((res) => res())

  onDestroy(async () => {
    void inboxClient.then((client) => client.readDoc(_id))
  })

  const client = getClient()

  const query = createQuery()
  // const clazz = client.getHierarchy().getClass(recruit.class.Vacancy)

  function updateObject (_id: Ref<Vacancy>): void {
    if (lastId !== _id) {
      const prev = lastId
      lastId = _id
      if (prev !== undefined) {
        void inboxClient.then((client) => client.readDoc(prev))
      }
      query.query(recruit.class.Vacancy, { _id }, (result) => {
        object = result[0] as Required<Vacancy>
        rawName = object.name
        rawDesc = object.description
        rawFullDesc = object.fullDescription
      })
    }
  }

  $: updateObject(_id)

  const ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()
  const hierarchy = client.getHierarchy()
  let mixins: Mixin<Doc>[] = []

  function getMixins (object: Doc, showAllMixins: boolean): void {
    if (object === undefined) return
    const descendants = hierarchy.getDescendants(core.class.Doc).map((p) => hierarchy.getClass(p))

    mixins = descendants.filter(
      (m) =>
        m.kind === ClassifierKind.MIXIN &&
        !ignoreMixins.has(m._id) &&
        (hierarchy.hasMixin(object, m._id) ||
          (showAllMixins && hierarchy.isDerived(object._class, hierarchy.getBaseClass(m._id))))
    )
  }

  $: getMixins(object, showAllMixins)

  let descriptionBox: AttachmentStyleBoxCollabEditor
  $: descriptionKey = client.getHierarchy().getAttribute(recruit.class.Vacancy, 'fullDescription')
  let saved = false
  async function save (): Promise<void> {
    if (object === undefined) {
      return
    }

    const updates: Partial<Data<Vacancy>> = {}
    const trimmedName = rawName.trim()
    const trimmedNameOld = object.name?.trim()

    if (trimmedName.length > 0 && (trimmedName !== trimmedNameOld || trimmedNameOld !== object.name)) {
      updates.name = trimmedName
      rawName = trimmedName
    } else {
      rawName = object.name
    }

    if (rawDesc !== object.description) {
      updates.description = rawDesc
    }
    if (rawFullDesc !== object.fullDescription) {
      updates.fullDescription = rawFullDesc
    }

    if (Object.keys(updates).length > 0) {
      await client.update(object, updates)
    }
  }
</script>

{#if object}
  <Panel
    isHeader={false}
    isSub={false}
    isAside={true}
    {embedded}
    {object}
    on:open
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="title">
      <DocNavLink noUnderline {object}>
        <div class="title">{object.name}</div>
      </DocNavLink>
    </svelte:fragment>

    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if dir === 'column'}
        <DocAttributeBar
          {object}
          {mixins}
          {readonly}
          ignoreKeys={['name', 'fullDescription', 'private', 'archived', 'type', 'owners']}
        />
      {/if}
    </svelte:fragment>

    <EditBox
      bind:value={rawName}
      placeholder={recruit.string.VacancyPlaceholder}
      kind={'large-style'}
      focusable
      autoFocus={!embedded}
      disabled={readonly}
      on:blur={save}
    />

    <svelte:fragment slot="pre-utils">
      {#if saved}
        <Label label={presentation.string.Saved} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="utils">
      {#if !readonly}
        <Button
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          on:click={(e) => {
            showMenu(e, { object, excludedActions: [view.action.Open] })
          }}
        />
      {/if}
      <Button
        icon={IconMixin}
        kind={'icon'}
        iconProps={{ size: 'medium' }}
        selected={showAllMixins}
        on:click={() => {
          showAllMixins = !showAllMixins
        }}
      />
    </svelte:fragment>

    <!-- <EditBox bind:value={object.description} placeholder={recruit.string.VacancyDescription} focusable on:blur={save} /> -->
    <div class="w-full mt-6">
      <AttachmentStyleBoxCollabEditor
        focusIndex={30}
        {object}
        key={{ key: 'fullDescription', attr: descriptionKey }}
        bind:this={descriptionBox}
        placeholder={recruit.string.FullDescription}
        {readonly}
        on:saved={(evt) => {
          saved = evt.detail
        }}
      />
    </div>

    <div class="w-full mt-6">
      <VacancyApplications objectId={object._id} {readonly} />
    </div>
    <div class="w-full mt-6">
      <Component
        is={survey.component.PollCollection}
        props={{
          objectId: object._id,
          _class: object._class,
          space: object.space,
          polls: object.polls
        }}
      />
    </div>
    <div class="w-full mt-6">
      <Component is={tracker.component.RelatedIssuesSection} props={{ object, label: tracker.string.RelatedIssues }} />
    </div>
  </Panel>
{/if}
