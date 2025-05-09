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
  import { MasterTag } from '@hanzo/card'
  import { Class, ClassifierKind, Doc, Ref } from '@hanzo/core'
  import { createQuery, getClient } from '@hanzo/presentation'
  import { ClassHierarchy } from '@hanzo/setting-resources'
  import { ButtonIcon, getCurrentLocation, Icon, IconAdd, Label, navigate, showPopup } from '@hanzo/ui'
  import card from '../../plugin'
  import CreateTag from '../CreateTag.svelte'
  import TagsHierarchy from './TagsHierarchy.svelte'

  export let masterTag: MasterTag

  const client = getClient()
  const hierarchy = client.getHierarchy()
  let descendants: Ref<Class<Doc>>[] = []
  $: getDescendants(masterTag._id)

  const query = createQuery()

  query.query(card.class.Tag, {}, () => {
    getDescendants(masterTag._id)
  })

  function getDescendants (id: Ref<Class<Doc>>): void {
    const desc = hierarchy.getDescendants(id)
    const filtered: Ref<Class<Doc>>[] = []
    for (const _id of desc) {
      const _class = hierarchy.getClass(_id)
      if (_class.extends === id && _class._class === card.class.Tag) {
        filtered.push(_id)
        continue
      }
    }
    descendants = filtered
  }

  function open (_class: Ref<Class<Doc>>): void {
    const loc = getCurrentLocation()
    loc.path[4] = _class
    navigate(loc)
  }
</script>

<div class="hanzoaiTableAttr-header font-medium-12">
  <Icon icon={card.icon.Tag} size="small" />
  <span><Label label={card.string.Tags} /></span>
  <ButtonIcon
    kind="primary"
    icon={IconAdd}
    size="small"
    dataId={'btnAdd'}
    on:click={() => {
      showPopup(CreateTag, {
        parent: masterTag,
        _class: card.class.Tag
      })
    }}
  />
</div>
{#if descendants.length}
  <div class="hanzoaiTableAttr-content task">
    <TagsHierarchy
      kind={ClassifierKind.MIXIN}
      classes={descendants}
      _class={undefined}
      on:select={(e) => {
        open(e.detail)
      }}
    />
  </div>
{/if}
