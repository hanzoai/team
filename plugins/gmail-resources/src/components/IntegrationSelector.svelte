<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { AccountBox } from '@hanzo/contact-resources'
  import { notEmpty, type PersonId } from '@hanzo/core'
  import { Integration } from '@hanzo/setting'
  import { ButtonKind, ButtonSize } from '@hanzo/ui'

  export let integrations: Integration[]
  export let selected: Integration | undefined
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'small'

  $: ids = Array.from(new Set(integrations.map((p) => p.createdBy))).filter(notEmpty)

  function change (e: CustomEvent<PersonId | null>) {
    if (e.detail === null) {
      selected = undefined
    } else {
      selected = integrations.find((p) => p.createdBy === e.detail)
    }
  }
</script>

<AccountBox value={selected?.modifiedBy} {kind} {size} include={ids} on:change={change} />
