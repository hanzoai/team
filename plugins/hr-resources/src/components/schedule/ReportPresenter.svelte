<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Staff } from '@hanzo/hr'
  import { floorFractionDigits } from '@hanzo/ui'

  export let value: Staff
  export let display: (staff: Staff) => number | string

  $: _value = floorFractionDigits(display(value), 3)
</script>

<span class="select-text flex lines-limit-2">{_value}</span>
