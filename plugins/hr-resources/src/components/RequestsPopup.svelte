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
  import { Ref, SortingOrder } from '@hanzo/core'
  import hr, { Request } from '@hanzo/hr'
  import { Table } from '@hanzo/view-resources'

  export let requests: Ref<Request>[]
</script>

<Table
  _class={hr.class.Request}
  query={{
    _id: { $in: requests }
  }}
  config={['$lookup.type.label', 'tzDate', 'tzDueDate']}
  options={{ sort: { date: SortingOrder.Ascending } }}
/>
