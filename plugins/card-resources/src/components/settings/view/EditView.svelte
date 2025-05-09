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
  import presentation, { getClient, MessageBox } from '@hanzo/presentation'
  import { Button, IconDelete, Label, Modal, ModernEditbox, showPopup } from '@hanzo/ui'
  import view, { Viewlet } from '@hanzo/view'
  import { clearSettingsStore } from '@hanzo/setting-resources'
  import setting from '@hanzo/setting'

  import DescriptorBox from './DescriptorBox.svelte'
  import ViewSettingButton from './ViewSettingButton.svelte'
  import card from '../../../plugin'
  import { updateViewletConfig } from './utils'

  export let viewlet: Viewlet

  let title = viewlet.title
  let type = viewlet.descriptor

  const client = getClient()

  async function save (): Promise<void> {
    await client.diffUpdate(viewlet, {
      title,
      descriptor: type,
      config: viewlet.config
    })
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    showPopup(MessageBox, {
      label: view.string.DeleteObject,
      message: view.string.DeleteObjectConfirm,
      params: { count: 1 },
      dangerous: true,
      action: async () => {
        await client.remove(viewlet)
        clearSettingsStore()
      }
    })
  }
  function onSave (items: any[]): void {
    updateViewletConfig(viewlet, items)
  }
</script>

<Modal
  label={card.string.EditView}
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={true}
  onCancel={clearSettingsStore}
>
  <svelte:fragment slot="actions">
    <Button icon={IconDelete} kind={'dangerous'} on:click={remove} />
  </svelte:fragment>
  <div class="hanzoaiModal-content__titleGroup">
    <ModernEditbox bind:value={title} label={view.string.Title} size={'large'} kind={'ghost'} />
  </div>
  <div class="hanzoaiModal-content__settingsSet">
    <div class="hanzoaiModal-content__settingsSet-line">
      <span class="label">
        <Label label={view.string.Type} />
      </span>
      <div class="pl-2">
        <DescriptorBox label={card.string.SelectViewType} bind:value={type} />
      </div>
    </div>
    <div class="hanzoaiModal-content__settingsSet-line">
      <span class="label">
        <Label label={setting.string.Settings} />
      </span>
      <div class="pl-2">
        <ViewSettingButton
          {viewlet}
          on:save={(event) => {
            onSave(event.detail ?? [])
          }}
        />
      </div>
    </div>
  </div>
</Modal>
