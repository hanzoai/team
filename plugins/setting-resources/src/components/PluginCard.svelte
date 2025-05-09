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
  import core, { getCurrentAccount } from '@hanzo/core'
  import { getResource, translate } from '@hanzo/platform'
  import { getClient } from '@hanzo/presentation'
  import type { Integration, IntegrationType } from '@hanzo/setting'
  import { AnyComponent, Button, Component, Label, eventToHTMLElement, showPopup } from '@hanzo/ui'
  import setting from '../plugin'
  import { Analytics } from '@hanzo/analytics'

  export let integrationType: IntegrationType
  export let integration: Integration | undefined
  const client = getClient()

  async function close (res: any): Promise<void> {
    if (res?.value && integration !== undefined) {
      await client.update(integration, {
        value: res.value,
        disabled: false
      })
    }
  }

  async function reconnect (res: any): Promise<void> {
    if (res?.value) {
      const current = await client.findOne(setting.class.Integration, {
        createdBy: { $in: getCurrentAccount().socialIds },
        type: integrationType._id
      })
      if (current === undefined) return
      Analytics.handleEvent(`Reconnect integration: ${await translate(integrationType.label, {}, 'en')}`)
      await client.update(current, {
        disabled: false,
        value: res.value
      })
    }
  }

  async function disconnect (): Promise<void> {
    if (integration !== undefined && integrationType.onDisconnect !== undefined) {
      Analytics.handleEvent(`Disconnect integration: ${await translate(integrationType.label, {}, 'en')}`)
      const disconnect = await getResource(integrationType.onDisconnect)
      await disconnect(integration.value)
    }
  }
  const handleConfigure = async (component?: AnyComponent): Promise<void> => {
    if (component === undefined) {
      return
    }
    if (integration === undefined) {
      const id = await client.createDoc(setting.class.Integration, core.space.Workspace, {
        type: integrationType._id,
        value: '',
        disabled: false
      })
      integration = await client.findOne(setting.class.Integration, { _id: id })
    }
    Analytics.handleEvent(`Configure/create integration: ${await translate(integrationType.label, {}, 'en')}`)
    showPopup(component, { integration }, 'top', close)
  }
  const handleReconnect = (e: any) => {
    if (integrationType.reconnectComponent) {
      showPopup(integrationType.reconnectComponent, { integration }, eventToHTMLElement(e), reconnect)
    }
  }
</script>

<div class="flex-col plugin-container">
  <div class="flex-row-center header">
    <div class="icon mr-4"><Component is={integrationType.icon} /></div>
    <div class="flex-grow flex-col">
      <div class="fs-title overflow-label"><Label label={integrationType.label} /></div>
    </div>
  </div>
  <div class="content scroll-divider-color">
    {#if integration && integration.value !== ''}
      {integration.value}
    {:else if integrationType.descriptionComponent}
      <Component is={integrationType.descriptionComponent} />
    {:else}
      <Label label={integrationType.description} />
    {/if}
    {#if integration?.disabled === true || integration?.error != null}
      <div class="error">
        <Label label={integration.error ?? setting.string.IntegrationDisabledSetting} />
      </div>
    {/if}
  </div>
  <div class="footer">
    {#if (integration?.value ?? '') === ''}
      {#if integrationType.createComponent}
        <Button
          minWidth={'5rem'}
          label={setting.string.Add}
          kind={'primary'}
          on:click={(ev) => handleConfigure(integrationType.createComponent)}
        />
      {/if}
    {:else if (integration?.disabled ?? false) && integrationType.reconnectComponent}
      <Button label={setting.string.Reconnect} minWidth={'5rem'} kind={'primary'} on:click={handleReconnect} />
    {:else if integration?.value !== ''}
      {#if integrationType.onDisconnect}
        <Button label={setting.string.Disconnect} minWidth={'5rem'} on:click={disconnect} />
      {/if}
      {#if integrationType.configureComponent !== undefined}
        <Button
          label={setting.string.Configure}
          minWidth={'5rem'}
          kind={'primary'}
          on:click={(ev) => handleConfigure(integrationType.configureComponent)}
        />
      {/if}
    {/if}
  </div>
</div>

<style lang="scss">
  .plugin-container {
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.75rem;
  }
  .header {
    padding: 1rem;
    min-height: fit-content;
  }
  .icon {
    flex-shrink: 0;
    min-width: 2.25rem;
    min-height: 2.25rem;
  }
  .content {
    overflow-y: auto;
    flex-grow: 1;
    margin: 0 1.5rem 0.25rem;
    color: var(--theme-caption-color);

    .error {
      color: var(--theme-error-color);
    }
  }
  .footer {
    flex-shrink: 0;
    display: grid;
    grid-auto-flow: column;
    direction: rtl;
    justify-content: start;
    align-items: center;
    column-gap: 1rem;
    padding: 0.5rem 1rem 1rem;
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 1.25rem, rgba(0, 0, 0, 1) 2.5rem);
    overflow: hidden;
    border-radius: 0 0 1.25rem 1.25rem;
  }
</style>
