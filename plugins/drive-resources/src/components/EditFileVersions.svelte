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
  import { FindOptions, SortingOrder } from '@hanzo/core'
  import { type File, type FileVersion } from '@hanzo/drive'
  import { Scroller, Section } from '@hanzo/ui'
  import { Table } from '@hanzo/view-resources'

  import drive from '../plugin'

  export let object: File
  export let readonly: boolean = false

  const options: FindOptions<FileVersion> = {
    lookup: {
      attachedTo: drive.class.File
    },
    sort: { version: SortingOrder.Descending }
  }
</script>

{#if object.versions > 1}
  <Section label={drive.string.FileVersions}>
    <svelte:fragment slot="content">
      <Scroller horizontal>
        <Table
          _class={drive.class.FileVersion}
          config={['', 'size', 'modifiedOn', 'createdBy']}
          query={{ attachedTo: object._id }}
          {readonly}
          {options}
        />
      </Scroller>
    </svelte:fragment>
  </Section>
{/if}
