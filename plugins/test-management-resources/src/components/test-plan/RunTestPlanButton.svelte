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
  import { onDestroy } from 'svelte'
  import { Ref } from '@hanzo/core'
  import { Button, location } from '@hanzo/ui'
  import type { TestPlan } from '@hanzo/test-management'
  import testManagement from '@hanzo/test-management'

  import { showCreateTestRunPanel } from '../../utils'
  import { getTestPlanIdFromLocation } from '../../navigation'

  let testPlanId: Ref<TestPlan> = getTestPlanIdFromLocation()

  const unsubscribe = location.subscribe(() => {
    testPlanId = getTestPlanIdFromLocation()
  })

  onDestroy(() => {
    unsubscribe()
  })

  const handleRun = async (): Promise<void> => {
    await showCreateTestRunPanel({
      testPlanId
    })
  }
</script>

<Button
  icon={testManagement.icon.Run}
  justify={'left'}
  kind={'primary'}
  label={testManagement.string.RunTestCases}
  disabled={testPlanId === testManagement.ids.NoTestPlan}
  on:click={handleRun}
/>
