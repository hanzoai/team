<!--
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
-->

<script lang="ts">
  import card, { MasterTag } from '@hanzo/card'
  import { Ref, SortingOrder } from '@hanzo/core'
  import { SpecialView } from '@hanzo/workbench-resources'
  import { getClient } from '@hanzo/presentation'
  import view, { BuildModelKey, type ViewOptions } from '@hanzo/view'

  export let type: Ref<MasterTag>

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: clazz = hierarchy.hasClass(type) ? hierarchy.getClass(type) : undefined

  const defaultOptions: ViewOptions = {
    groupBy: ['parent'],
    orderBy: ['modifiedBy', SortingOrder.Descending]
  }

  const defaultConfig: (BuildModelKey | string)[] = [
    {
      displayProps: {
        fixed: 'left',
        key: 'createdBy'
      },
      key: 'createdBy'
    },
    {
      displayProps: {
        fixed: 'left',
        key: 'card'
      },
      key: '',
      props: {
        showParent: false
      }
    },
    {
      displayProps: {
        grow: true
      },
      key: ''
    },
    {
      displayProps: {
        fixed: 'left',
        key: 'tags'
      },
      key: '',
      label: card.string.Tags,
      presenter: view.component.RolePresenter,
      props: {
        fullSize: true
      }
    },
    {
      displayProps: {
        fixed: 'right',
        key: 'parent'
      },
      key: 'parent'
    },
    {
      displayProps: {
        fixed: 'right',
        key: 'createdOn'
      },
      key: 'createdOn'
    }
  ]
</script>

{#if clazz}
  <SpecialView
    _class={type}
    icon={clazz.icon ?? card.icon.Card}
    label={clazz.label}
    defaultViewletDescriptor={view.viewlet.List}
    actionVisible={true}
    defaultViewOptions={defaultOptions}
    {defaultConfig}
  />
{/if}
