<!--
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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
  import { DateRangeMode } from '@hanzo/core'
  import type { IntlString } from '@hanzo/platform'
  import ui from '../../plugin'
  import DateRangePresenter from './DateRangePresenter.svelte'

  export let value: number | null | undefined
  export let editable: boolean = false
  export let iconModifier: 'normal' | 'warning' | 'overdue' = 'normal'
  export let labelNull: IntlString = ui.string.NoDate
  export let noShift: boolean = false
</script>

<DateRangePresenter bind:value mode={DateRangeMode.DATETIME} {editable} {iconModifier} {labelNull} {noShift} />
