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
  import { Class, Ref } from '@hanzo/core'
  import { createQuery } from '@hanzo/presentation'
  import { TestSuite } from '@hanzo/test-management'

  import testManagement from '../../plugin'
  import TestSuitePresenter from './TestSuitePresenter.svelte'

  export let value: Ref<TestSuite> | undefined
  export let _class: Ref<Class<TestSuite>> = testManagement.class.TestSuite
  export let inline: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let disabled: boolean = false

  let project: TestSuite | undefined

  const query = createQuery()
  $: value !== undefined &&
    query.query(_class, { _id: value }, (res) => {
      ;[project] = res
    })
</script>

{#if value}
  <TestSuitePresenter value={project} {inline} {accent} {noUnderline} {disabled} />
{/if}
