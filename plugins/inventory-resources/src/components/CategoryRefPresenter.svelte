<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { Ref } from '@hanzo/core'
  import inventory, { Category } from '@hanzo/inventory'
  import { createQuery } from '@hanzo/presentation'
  import CategoryPresenter from './CategoryPresenter.svelte'

  export let value: Ref<Category>
  export let inline: boolean = false

  let category: Category | undefined

  const query = createQuery()
  $: query.query(
    inventory.class.Category,
    { _id: value },
    (res) => {
      ;[category] = res
    },
    { limit: 1 }
  )
</script>

{#if category}
  <CategoryPresenter {inline} value={category} />
{/if}
