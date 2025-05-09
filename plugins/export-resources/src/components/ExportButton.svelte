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
  import { Class, Doc, Ref } from '@hanzo/core'
  import { Button, showPopup } from '@hanzo/ui'
  import { getMetadata } from '@hanzo/platform'
  import presentation, { MessageBox } from '@hanzo/presentation'
  import { type TransformConfig } from '@hanzo/export'
  import plugin from '../plugin'

  export let _class: Ref<Class<Doc>>
  export let query: string = ''
  export let visible: boolean = false
  export let config: TransformConfig = {}

  async function handleExport (): Promise<void> {
    try {
      const baseUrl = getMetadata(plugin.metadata.ExportUrl)
      const token = getMetadata(presentation.metadata.Token)
      if (token == null) {
        throw new Error('No token available')
      }

      const res = await fetch(`${baseUrl}/exportSync?format=csv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          _class,
          query,
          attributesOnly: true,
          config
        })
      })

      if (!res.ok) {
        showPopup(MessageBox, {
          label: plugin.string.ExportRequestFailed,
          kind: 'error',
          message: plugin.string.ExportRequestFailedMessage
        })
        return
      }

      const contentDisposition = res.headers.get('Content-Disposition')
      const filename = contentDisposition?.match(/filename="([^"]*)"/)?.[1] ?? 'export.csv'

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()

      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log('Export downloaded successfully')
    } catch (err) {
      showPopup(MessageBox, {
        label: plugin.string.ExportRequestFailed,
        kind: 'error',
        message: plugin.string.ExportRequestFailedMessage
      })
    }
  }
</script>

{#if visible}
  <Button
    icon={plugin.icon.Export}
    label={plugin.string.Export}
    kind={'regular'}
    size={'medium'}
    showTooltip={{ label: plugin.string.Export }}
    on:click={handleExport}
  />
{/if}
