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
  import activity, {
    ActivityMessagePreviewType,
    DisplayDocUpdateMessage,
    DocUpdateMessageViewlet
  } from '@hanzo/activity'
  import { Action, Component, Icon } from '@hanzo/ui'
  import { createQuery, getClient } from '@hanzo/presentation'
  import { IntlString } from '@hanzo/platform'
  import { AttachedDoc, Class, Collection, Doc, Ref, Space } from '@hanzo/core'
  import { AttributeModel } from '@hanzo/view'
  import { createEventDispatcher } from 'svelte'
  import { buildRemovedDoc, checkIsObjectRemoved } from '@hanzo/view-resources'

  import { getAttributeModel, getCollectionAttribute } from '../../activityMessagesUtils'
  import BaseMessagePreview from '../activity-message/BaseMessagePreview.svelte'
  import DocUpdateMessageContent from './DocUpdateMessageContent.svelte'
  import DocUpdateMessageAttributes from './DocUpdateMessageAttributes.svelte'

  export let doc: Doc | undefined
  export let value: DisplayDocUpdateMessage
  export let readonly = false
  export let type: ActivityMessagePreviewType = 'full'
  export let actions: Action[] = []
  export let space: Ref<Space> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  const objectQuery = createQuery()

  let viewlet: DocUpdateMessageViewlet | undefined
  let objectName: IntlString | undefined = undefined
  let collectionName: IntlString | undefined = undefined

  let attributeModel: AttributeModel | undefined = undefined
  let object: Doc | undefined

  $: [viewlet] = client
    .getModel()
    .findAllSync(activity.class.DocUpdateMessageViewlet, { action: value.action, objectClass: value.objectClass })

  $: collectionAttribute = getCollectionAttribute(hierarchy, value.attachedToClass, value.updateCollection)
  $: clazz = hierarchy.getClass(value.objectClass)

  $: objectName = (collectionAttribute?.type as Collection<AttachedDoc>)?.itemLabel ?? clazz.label
  $: collectionName = collectionAttribute?.label

  $: void getAttributeModel(client, value.attributeUpdates, value.objectClass).then((model) => {
    attributeModel = model
  })

  $: viewlet?.component && loadObject(value.objectId, value.objectClass, value.space, doc)

  async function loadObject (_id: Ref<Doc>, _class: Ref<Class<Doc>>, space: Ref<Space>, doc?: Doc): Promise<void> {
    if (doc?._id === _id) {
      object = doc
      return
    }

    const isObjectRemoved = await checkIsObjectRemoved(client, _id, _class)

    if (isObjectRemoved) {
      object = await buildRemovedDoc(client, _id, _class)
    } else {
      objectQuery.query(_class, { _id, space }, (res) => {
        object = res[0]
      })
    }
  }
  function onClick (event: MouseEvent): void {
    event.stopPropagation()
    event.preventDefault()
    dispatch('click')
  }
</script>

<BaseMessagePreview message={value} {type} {readonly} {actions} on:click>
  <span class="textContent overflow-label flex-presenter" class:contentOnly={type === 'content-only'}>
    {#if viewlet?.component && object}
      <span class="customContent flex-presenter">
        <Icon size="small" icon={viewlet.icon ?? activity.icon.Activity} />
        <span class="ml-2" />
        {#each value?.previousMessages ?? [] as msg}
          <Component
            is={viewlet.component}
            props={{ message: msg, _id: msg.objectId, _class: msg.objectClass, preview: true, onClick }}
          />
        {/each}
        <Component
          is={viewlet.component}
          props={{
            message: value,
            _id: value.objectId,
            _class: value.objectClass,
            preview: true,
            value: object,
            onClick
          }}
        />
      </span>
    {:else if value.action === 'create' || value.action === 'remove'}
      <DocUpdateMessageContent
        message={value}
        {viewlet}
        {objectName}
        {collectionName}
        objectIcon={collectionAttribute?.icon ?? clazz.icon}
        preview
      />
    {:else if value.attributeUpdates && attributeModel}
      <DocUpdateMessageAttributes
        attributeUpdates={value.attributeUpdates}
        {attributeModel}
        {space}
        {viewlet}
        {object}
        message={value}
        preview
      />
    {/if}
  </span>
</BaseMessagePreview>

<style lang="scss">
  .textContent {
    display: inline;
    overflow: hidden;
    max-height: 1.25rem;
    color: var(--global-primary-TextColor);
    margin-left: var(--spacing-0_5);

    &.contentOnly {
      margin-left: 0;
    }
  }
</style>
