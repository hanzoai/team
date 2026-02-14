<!--
// Copyright © 2025 Hanzo AI Inc.
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
  import { MasterTag } from '@hanzo/card'
  import { Class, Doc, Ref, Space } from '@hanzo/core'
  import { IntlString } from '@hanzo/platform'
  import { createQuery, IconWithEmoji } from '@hanzo/presentation'
  import { location } from '@hanzo/ui'
  import view from '@hanzo/view'
  import { SpecialView } from '@hanzo/workbench-resources'
  import { onDestroy } from 'svelte'
  import card from '../plugin'

  let _class: Ref<Class<Doc>> | undefined
  let space: Ref<Space> | undefined

  onDestroy(
    location.subscribe((loc) => {
      space = loc.path[3] === 'type' ? undefined : loc.path[3]
      _class = loc.path[4]
    })
  )

  let allClasses: MasterTag[] = []

  const query = createQuery()
  query.query(card.class.MasterTag, {}, (res) => {
    allClasses = res.filter((it) => it.removed !== true)
  })

  $: clazz = allClasses.find((it) => it._id === _class) ?? allClasses.find((it) => it._id === card.class.Card)

  $: label = getLabel(clazz)

  function getLabel (clazz: MasterTag | undefined): IntlString | undefined {
    return clazz?.label
  }
</script>

{#if clazz !== undefined && label !== undefined}
  <SpecialView
    _class={clazz._id}
    baseQuery={space !== undefined ? { space } : {}}
    {space}
    {label}
    icon={clazz.icon === view.ids.IconWithEmoji ? IconWithEmoji : clazz.icon}
    iconProps={clazz.icon === view.ids.IconWithEmoji ? { icon: clazz.color } : {}}
  />
{/if}
