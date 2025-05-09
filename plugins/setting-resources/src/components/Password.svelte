<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
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
  import { Analytics } from '@hanzo/analytics'
  import login from '@hanzo/login'
  import { getResource } from '@hanzo/platform'
  import presentation from '@hanzo/presentation'
  import setting from '@hanzo/setting'
  import { Breadcrumb, Button, EditBox, Header, Icon, Label } from '@hanzo/ui'
  import plugin from '../plugin'
  import Error from './icons/Error.svelte'

  let oldPassword: string = ''
  let password: string = ''
  let password2: string = ''
  let label = presentation.string.Save
  let saved = false
  let error = false

  $: disabled =
    password.length === 0 || oldPassword.length === 0 || oldPassword === password || password !== password2 || saved

  async function save (): Promise<void> {
    label = setting.string.Saving
    saved = true
    try {
      const changePassword = await getResource(login.function.ChangePassword)
      await changePassword(oldPassword, password)
      label = setting.string.Saved
    } catch (e: any) {
      Analytics.handleError(e)
      console.error(e)
      label = presentation.string.Save
      saved = false
      error = true
    }
  }

  function updateSaved (p1: string, p2: string, p3: string): void {
    saved = false
    label = presentation.string.Save
    error = false
  }
  $: updateSaved(oldPassword, password, password2)
</script>

<div class="hanzoaiComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Password} label={setting.string.ChangePassword} size={'large'} isCurrent />
  </Header>
  <div class="flex-row-stretch flex-grow p-10">
    <div class="flex-grow flex-col">
      {#if error}
        <div class="flex-row-center gap-2">
          <Icon icon={Error} size={'medium'} />
          <Label label={plugin.string.FailedToSave} />
        </div>
      {/if}
      <div class="flex-grow flex-col">
        <div>
          <EditBox
            format="password"
            placeholder={setting.string.EnterCurrentPassword}
            label={setting.string.CurrentPassword}
            bind:value={oldPassword}
          />
        </div>
        <div class="mt-6">
          <EditBox
            format="password"
            placeholder={setting.string.EnterNewPassword}
            label={setting.string.NewPassword}
            bind:value={password}
          />
        </div>
        <div class="mt-6">
          <EditBox
            format="password"
            placeholder={setting.string.RepeatNewPassword}
            label={setting.string.NewPassword}
            bind:value={password2}
          />
        </div>
      </div>

      <div class="flex-row-reverse">
        <Button
          {label}
          {disabled}
          kind={'primary'}
          on:click={() => {
            void save()
          }}
        />
      </div>
    </div>
  </div>
</div>
