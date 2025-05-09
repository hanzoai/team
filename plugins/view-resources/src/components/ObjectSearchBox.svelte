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
  import { Class, Doc, DocumentQuery, FindOptions, Hierarchy, Ref } from '@hanzo/core'
  import { Asset, IntlString } from '@hanzo/platform'
  import presentation, {
    getClient,
    ObjectCreate,
    ObjectSearchCategory,
    ObjectSearchPopup,
    ObjectSearchResult
  } from '@hanzo/presentation'
  import {
    ActionIcon,
    AnySvelteComponent,
    Button,
    ButtonKind,
    ButtonSize,
    getEventPositionElement,
    getFocusManager,
    Icon,
    Label,
    LabelAndProps,
    showPanel,
    showPopup
  } from '@hanzo/ui'
  import view from '@hanzo/view'
  import { createEventDispatcher } from 'svelte'
  import ObjectPresenter from './ObjectPresenter.svelte'

  export let _class: Ref<Class<Doc>>
  export let excluded: Array<Ref<Doc>> | undefined = undefined
  export let options: FindOptions<Doc> | undefined = undefined
  export let docQuery: DocumentQuery<Doc> | undefined = undefined
  export let label: IntlString
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let value: Ref<Doc> | null | undefined
  export let allowDeselect = false
  export let titleDeselect: IntlString | undefined = undefined
  export let readonly = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let focusIndex = -1
  export let showTooltip: LabelAndProps | undefined = undefined
  export let showNavigate = true
  export let id: string | undefined = undefined
  export let searchField: string = 'name'
  export let docProps: Record<string, any> = {}
  export let allowCategory: Array<Ref<ObjectSearchCategory>> | undefined

  export let create: ObjectCreate | undefined = undefined

  const dispatch = createEventDispatcher()

  let selected: Doc | undefined
  let container: HTMLElement

  const client = getClient()

  async function updateSelected (value: Ref<Doc> | null | undefined) {
    selected = value ? await client.findOne(_class, { _id: value }) : undefined
  }

  $: updateSelected(value)

  const mgr = getFocusManager()

  const _click = (ev: MouseEvent): void => {
    if (!readonly) {
      showPopup(
        ObjectSearchPopup,
        {
          _class,
          options,
          docQuery,
          ignoreObjects: excluded ?? [],
          icon,
          allowDeselect,
          selected: value,
          titleDeselect,
          placeholder,
          create,
          searchField,
          docProps,
          allowCategory
        },
        !$$slots.content ? container : getEventPositionElement(ev),
        (result: ObjectSearchResult) => {
          if (result === null) {
            value = null
            selected = undefined
            dispatch('change', null)
          } else if (result !== undefined && result.doc._id !== value) {
            value = result.doc._id
            dispatch('change', value)
          }
          mgr?.setFocusPos(focusIndex)
        }
      )
    }
  }
</script>

<div {id} bind:this={container} class="min-w-0" class:w-full={width === '100%'} class:h-full={$$slots.content}>
  {#if $$slots.content}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="w-full h-full flex-streatch" on:click={_click}>
      <slot name="content" />
    </div>
  {:else}
    <Button {focusIndex} width={width ?? 'min-content'} {size} {kind} {justify} {showTooltip} on:click={_click}>
      <span slot="content" class="overflow-label flex-grow" class:flex-between={showNavigate && selected}>
        <div
          class="disabled flex-row-center"
          style:width={showNavigate && selected
            ? `calc(${width ?? 'min-content'} - 1.5rem)`
            : `${width ?? 'min-content'}`}
        >
          {#if selected}
            <ObjectPresenter
              objectId={selected._id}
              _class={selected._class}
              value={selected}
              props={{ ...docProps, disabled: true, inline: true, size: 'x-small' }}
            />
          {:else}
            <div class="flex-row-center">
              {#if icon}
                <Icon {icon} size={kind === 'link' || kind === 'stepper' ? 'small' : size} />
              {/if}
              <div class="ml-2">
                <Label {label} />
              </div>
            </div>
          {/if}
        </div>
        {#if selected && showNavigate}
          <ActionIcon
            icon={view.icon.Open}
            size={'small'}
            action={() => {
              if (selected) {
                showPanel(view.component.EditDoc, selected._id, Hierarchy.mixinOrClass(selected), 'content')
              }
            }}
          />
        {/if}
      </span>
    </Button>
  {/if}
</div>
