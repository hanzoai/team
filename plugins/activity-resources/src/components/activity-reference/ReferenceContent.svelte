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
  import { MessageViewer } from '@hanzo/presentation'
  import { ActivityReference } from '@hanzo/activity'

  export let value: ActivityReference | undefined = undefined
</script>

{#if value}
  <div class="root">
    <MessageViewer message={value.message} />
  </div>
{/if}

<style lang="scss">
  .root {
    display: inline-block;
    color: var(--global-primary-TextColor);
  }
</style>
