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
  import { getClient } from '@hanzo/presentation'
  import {
    ButtonIcon,
    Component,
    IconDescription,
    NavItem,
    Scroller,
    Separator,
    defineSeparators,
    secondNavSeparators
  } from '@hanzo/ui'
  import card from '../../plugin'

  export let masterTag: MasterTag
  export let visibleSecondNav: boolean = true
  export let readonly: boolean = true

  const client = getClient()

  $: isMasterTag = masterTag._class === card.class.MasterTag
  $: sections = client
    .getModel()
    .findAllSync(card.class.MasterTagEditorSection, !isMasterTag ? { masterOnly: { $ne: true } } : {})

  const sectionRefs: Record<string, HTMLElement | undefined> = {}

  defineSeparators('spaceTypeEditor', secondNavSeparators)
</script>

<div class="hanzoaiComponent-content__container columns">
  {#if visibleSecondNav}
    <div class="hanzoaiComponent-content__column">
      <div class="hanzoaiComponent-content__navHeader">
        <div class="hanzoaiComponent-content__navHeader-menu">
          <ButtonIcon kind="tertiary" icon={IconDescription} size="small" inheritColor />
        </div>
      </div>
      {#each sections as navItem (navItem.id)}
        <NavItem
          type="type-anchor-link"
          label={navItem.label}
          on:click={() => {
            sectionRefs[navItem.id]?.scrollIntoView()
          }}
        />
      {/each}
    </div>
    <Separator name="spaceTypeEditor" index={0} color="transparent" />
  {/if}
  <div class="hanzoaiComponent-content__column content">
    <Scroller align="center" padding="var(--spacing-3)" bottomPadding="var(--spacing-3)">
      <div class="hanzoaiComponent-content gap">
        {#each sections as section, i}
          <div bind:this={sectionRefs[section.id]} class:hanzoaiTableAttr-container={i}>
            <Component
              is={section.component}
              disabled={readonly}
              props={{
                masterTag
              }}
            />
          </div>
        {/each}
      </div>
    </Scroller>
  </div>
</div>
