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
  import { Ref } from '@hanzo/core'
  import { Department } from '@hanzo/hr'
  import { Scroller, Separator, deviceOptionsStore as deviceInfo } from '@hanzo/ui'
  import { TreeNode } from '@hanzo/view-resources'
  import { NavFooter, NavHeader } from '@hanzo/workbench-resources'

  import hr from '../../plugin'

  import DepartmentsHierarchy from './DepartmentsHierarchy.svelte'

  export let department: Ref<Department>
  export let descendants: Map<Ref<Department>, Department[]>
  export let departmentById: Map<Ref<Department>, Department>

  const departments = [hr.ids.Head]
</script>

<div
  class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
  class:fly={$deviceInfo.navigator.float}
>
  <div class="antiPanel-wrap__content hanzoaiNavPanel-container">
    <NavHeader label={hr.string.HRApplication} />

    <Scroller shrink>
      <DepartmentsHierarchy {departments} {descendants} {departmentById} selected={department} on:selected />
    </Scroller>

    <NavFooter />
  </div>
  {#if !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
    <Separator
      name={'schedule'}
      float={$deviceInfo.navigator.float ? 'navigator' : true}
      index={0}
      color={'var(--theme-navpanel-border)'}
    />
  {/if}
</div>
