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
  import type { Channel, ChannelProvider } from '@hanzo/contact'
  import contact from '@hanzo/contact'
  import { AttachedData, Doc, Ref, toIdMap } from '@hanzo/core'
  import notification, { DocNotifyContext, InboxNotification } from '@hanzo/notification'
  import { Asset, IntlString, getResource } from '@hanzo/platform'
  import presentation, { getClient } from '@hanzo/presentation'
  import {
    Action,
    AnyComponent,
    Button,
    ButtonKind,
    ButtonSize,
    Menu,
    closeTooltip,
    eventToHTMLElement,
    getEventPopupPositionElement,
    getFocusManager,
    getPopupPositionElement,
    showPopup
  } from '@hanzo/ui'
  import view, { Action as ViewAction } from '@hanzo/view'
  import { ContextMenu, invokeAction } from '@hanzo/view-resources'
  import { createEventDispatcher, tick } from 'svelte'
  import { readable, Readable, Writable, writable } from 'svelte/store'
  import { channelProviders } from '../utils'
  import ChannelEditor from './ChannelEditor.svelte'

  export let value: AttachedData<Channel>[] | Channel | null
  export let highlighted: Ref<ChannelProvider>[] = []
  export let editable: boolean | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let length: 'tiny' | 'short' | 'full' = 'full'
  export let shape: 'circle' | undefined = undefined
  export let integrations: Set<Ref<Doc>> = new Set<Ref<Doc>>()
  export let focusIndex = -1
  export let restricted: Ref<ChannelProvider>[] = []

  let contextByDocStore: Writable<Map<Ref<Doc>, DocNotifyContext>> = writable(new Map())
  let inboxNotificationsByContextStore: Readable<Map<Ref<DocNotifyContext>, InboxNotification[]>> = readable(new Map())

  getResource(notification.function.GetInboxNotificationsClient).then((res) => {
    const inboxClient = res()
    contextByDocStore = inboxClient.contextByDoc
    inboxNotificationsByContextStore = inboxClient.inboxNotificationsByContext
  })

  const dispatch = createEventDispatcher()

  interface Item {
    label: IntlString
    icon: Asset
    value: string
    presenter?: AnyComponent
    action?: Ref<ViewAction>
    placeholder: IntlString
    channel: AttachedData<Channel> | Channel
    provider: Ref<ChannelProvider>
    integration: boolean
    notification: boolean
  }

  function getProvider (
    item: AttachedData<Channel>,
    map: Map<Ref<ChannelProvider>, ChannelProvider>,
    notifyContextByDoc: Map<Ref<Doc>, DocNotifyContext>,
    inboxNotificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>
  ): Item | undefined {
    const provider = map.get(item.provider)
    if (provider) {
      const notification =
        (item as Channel)._id !== undefined
          ? isNew(item as Channel, notifyContextByDoc, inboxNotificationsByContext)
          : false
      return {
        label: provider.label,
        icon: provider.icon as Asset,
        value: item.value,
        presenter: provider.presenter,
        action: provider.action,
        placeholder: provider.placeholder,
        provider: provider._id,
        channel: item,
        notification,
        integration: provider.integrationType !== undefined ? integrations.has(provider.integrationType) : false
      }
    }
  }

  function isNew (
    item: Channel,
    notifyContextByDoc: Map<Ref<Doc>, DocNotifyContext>,
    inboxNotificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>
  ): boolean {
    const notifyContext = notifyContextByDoc.get(item._id)

    if (notifyContext === undefined) {
      return (item.items ?? 0) > 0
    }

    const inboxNotifications = inboxNotificationsByContext.get(notifyContext._id) ?? []

    return inboxNotifications.some(({ isViewed }) => !isViewed)
  }

  async function update (
    value: AttachedData<Channel>[] | Channel | null,
    notifyContextByDoc: Map<Ref<Doc>, DocNotifyContext>,
    inboxNotificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>,
    channelProviders: ChannelProvider[]
  ) {
    if (value == null) {
      displayItems = []
      return
    }

    const result: Item[] = []
    const map = toIdMap(channelProviders)
    if (Array.isArray(value)) {
      for (const item of value) {
        const provider = getProvider(item, map, notifyContextByDoc, inboxNotificationsByContext)
        if (provider !== undefined) {
          result.push(provider)
        }
      }
    } else {
      const provider = getProvider(value, map, notifyContextByDoc, inboxNotificationsByContext)
      if (provider !== undefined) {
        result.push(provider)
      }
    }
    displayItems = result
    updateMenu(displayItems, channelProviders)
  }

  $: if (value) update(value, $contextByDocStore, $inboxNotificationsByContextStore, $channelProviders)

  let displayItems: Item[] = []
  let actions: Action[] = []
  let addBtn: HTMLButtonElement
  const btns: HTMLButtonElement[] = []
  let opened: number | undefined = undefined

  function filterUndefined (channels: AttachedData<Channel>[]): AttachedData<Channel>[] {
    return channels.filter((channel) => channel.value !== undefined)
  }
  const focusManager = getFocusManager()

  const updateMenu = (_displayItems: Item[], providers: ChannelProvider[]): void => {
    actions = providers.map((pr) => {
      return {
        icon: pr.icon ?? contact.icon.SocialEdit,
        label: pr.label,
        action: async () => {
          const provider = getProvider(
            { provider: pr._id, value: '' },
            toIdMap(providers),
            $contextByDocStore,
            $inboxNotificationsByContextStore
          )
          if (provider !== undefined) {
            displayItems = [..._displayItems, provider]
            if (focusIndex !== -1) {
              await tick()
              focusManager?.setFocusPos(focusIndex + displayItems.length)
              await tick()
              editChannel(btns[displayItems.length - 1], displayItems.length - 1, provider)
            }
          }
        }
      }
    })
  }
  $: updateMenu(displayItems, $channelProviders)

  const dropItem = (n: number): Item[] => {
    return displayItems.filter((it, i) => i !== n)
  }
  const saveItems = (): void => {
    value = filterUndefined(displayItems)
    updateMenu(displayItems, $channelProviders)
  }

  const showMenu = (ev: MouseEvent): void => {
    showPopup(Menu, { actions }, ev.target as HTMLElement, (result) => {
      if (result == null) {
        focusManager?.setFocusPos(focusIndex + 2 + displayItems.length)
      }
    })
  }

  function remove (n: number) {
    const removed = displayItems[n]
    displayItems = dropItem(n)
    dispatch('remove', removed.channel)
  }

  const client = getClient()

  const editChannel = (el: HTMLElement, n: number, item: Item): void => {
    if (opened !== n) {
      opened = n
      showPopup(
        ChannelEditor,
        {
          value: item.value,
          placeholder: item.placeholder,
          editable,
          openable: item.presenter ?? item.action ?? false,
          channel: item.channel
        },
        el,
        (result) => {
          if (result === undefined && item.value.trim() === '') {
            remove(n)
          }
          if (result === 'open') {
            if (item.action) {
              const doc = item.channel as Channel
              const action = client.getModel().findAllSync(view.class.Action, { _id: item.action })[0]
              invokeAction(doc, result, action)
            } else {
              dispatch('open', item)
            }
          } else if (result != null) {
            if (result === '') {
              remove(n)
            } else {
              item.value = result.trim()
              if (displayItems[n] === undefined) {
                displayItems = [...displayItems, item]
              }
              item.channel.value = item.value
              dispatch('save', item.channel)
            }
            saveItems()
            focusManager?.setFocusPos(focusIndex + 1 + n)
          }
          opened = undefined
        },
        (result) => {
          if (result != null) {
            if (result.trim() === '') {
              remove(n)
            } else if (item.value.trim() !== result.trim()) {
              item.value = result
              saveItems()
              dispatch('save', item.channel)
            }
          }
        }
      )
    }
  }

  const updateTooltip = (result: CustomEvent, item: Item, i: number): void => {
    if (result.detail === 'open') {
      closeTooltip()
      if (item.action) {
        const doc = item.channel as Channel
        const action = client.getModel().findAllSync(view.class.Action, { _id: item.action })[0]
        invokeAction(doc, result, action)
      } else {
        dispatch('open', item)
      }
    } else if (result.detail === 'edit') {
      closeTooltip()
      editChannel(btns[i], i, item)
    }
  }
</script>

{#if kind === 'list'}
  {#each displayItems as item, i}
    <div class="label-wrapper">
      <Button
        focusIndex={focusIndex === -1 ? focusIndex : focusIndex + 1 + i}
        id={item.label}
        bind:input={btns[i]}
        icon={item.icon}
        kind={'link-bordered'}
        {size}
        {shape}
        highlight={item.integration || item.notification}
        on:click={(ev) => {
          if (editable && !restricted.includes(item.provider)) {
            closeTooltip()
            editChannel(eventToHTMLElement(ev), i, item)
          } else {
            dispatch('open', item)
          }
        }}
        showTooltip={{
          component: opened !== i ? ChannelEditor : undefined,
          props: {
            value: item.value,
            placeholder: item.placeholder,
            editable: editable !== undefined ? false : undefined,
            openable: item.presenter ?? item.action ?? false
          },
          onUpdate: (result) => {
            updateTooltip(result, item, i)
          }
        }}
      />
    </div>
  {/each}
{:else}
  <div
    class="{displayItems.length === 0 ? 'clear-mins' : 'buttons-group'} {kind === 'no-border'
      ? 'xsmall-gap'
      : 'xxsmall-gap'}"
    class:short={displayItems.length > 4 && length === 'short'}
    class:tiny={displayItems.length > 2 && length === 'tiny'}
  >
    {#each displayItems as item, i}
      <Button
        focusIndex={focusIndex === -1 ? focusIndex : focusIndex + 1 + i}
        id={item.label}
        bind:input={btns[i]}
        icon={item.icon}
        kind={highlighted.includes(item.provider) ? 'dangerous' : kind}
        {size}
        {shape}
        highlight={item.integration || item.notification}
        on:click={(ev) => {
          if (editable && !restricted.includes(item.provider)) {
            closeTooltip()
            editChannel(eventToHTMLElement(ev), i, item)
          } else {
            dispatch('open', item)
          }
        }}
        showTooltip={{
          component: opened !== i ? ChannelEditor : undefined,
          props: {
            value: item.value,
            placeholder: item.placeholder,
            editable: editable !== undefined ? false : undefined,
            openable: item.presenter ?? item.action ?? false
          },
          onUpdate: (result) => {
            updateTooltip(result, item, i)
          }
        }}
      />
    {/each}
    {#if actions.length > 0 && editable}
      <Button
        focusIndex={focusIndex === -1 ? focusIndex : focusIndex + 2 + displayItems.length}
        id={presentation.string.AddSocialLinks}
        bind:input={addBtn}
        icon={contact.icon.SocialEdit}
        label={displayItems.length === 0 ? presentation.string.AddSocialLinks : undefined}
        notSelected={displayItems.length === 0}
        {kind}
        {size}
        {shape}
        showTooltip={{ label: presentation.string.AddSocialLinks }}
        on:click={showMenu}
      />
    {/if}
  </div>
{/if}
