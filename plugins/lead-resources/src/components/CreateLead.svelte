<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import contact, { Contact } from '@hanzo/contact'
  import { UserBox } from '@hanzo/contact-resources'
  import core, {
    AccountRole,
    AttachedData,
    AttachedDoc,
    generateId,
    getCurrentAccount,
    hasAccountRole,
    Ref,
    SortingOrder,
    Status as TaskStatus
  } from '@hanzo/core'
  import { Customer, Funnel, Lead, LeadEvents } from '@hanzo/lead'
  import { OK, Status } from '@hanzo/platform'
  import { Card, createQuery, getClient, InlineAttributeBar, SpaceSelector } from '@hanzo/presentation'
  import task, { getStates, makeRank, TaskType } from '@hanzo/task'
  import { TaskKindSelector, typeStore } from '@hanzo/task-resources'
  import { Button, createFocusManager, EditBox, FocusHandler, Label, Status as StatusControl } from '@hanzo/ui'
  import { statusStore } from '@hanzo/view-resources'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'
  import { Analytics } from '@hanzo/analytics'

  export let space: Ref<Funnel>
  export let customer: Ref<Contact> | null = null
  export let preserveCustomer = false

  let _space = space
  const status: Status = OK

  let title: string = ''
  const object: Partial<Lead> = {}

  const dispatch = createEventDispatcher()
  const client = getClient()
  const leadId: Ref<AttachedDoc> = generateId()

  export function canClose (): boolean {
    return (preserveCustomer || customer === undefined) && title === ''
  }

  let funnels: Funnel[] = []
  const funnelQuery = createQuery()
  funnelQuery.query(lead.class.Funnel, {}, (res) => {
    funnels = res
  })
  $: rawStates = getStates(funnel, $typeStore, $statusStore.byId)

  let state: Ref<TaskStatus>

  $: setStatus(rawStates, object.status)

  function setStatus (rawStates: TaskStatus[], status: Ref<TaskStatus> | undefined) {
    if (status === undefined || rawStates.findIndex((it) => it._id === status) === -1) {
      state = rawStates[0]?._id
      object.status = state
    }
  }

  $: if (_space === undefined) {
    if (funnels.find((it) => it._id === _space) === undefined) {
      _space = funnels[0]?._id
    }
  }

  $: funnel = funnels.find((it) => it._id === _space)

  let kind: Ref<TaskType> | undefined = undefined

  async function createLead () {
    const sequence = await client.findOne(core.class.Sequence, { attachedTo: lead.class.Lead })
    if (sequence === undefined || customer == null) {
      throw new Error('Lead  creation failed')
    }
    if (kind === undefined) {
      throw new Error('kind is not specified')
    }

    const lastOne = await client.findOne(lead.class.Lead, {}, { sort: { rank: SortingOrder.Descending } })
    const incResult = await client.update(sequence, { $inc: { sequence: 1 } }, true)
    const number = (incResult as any).object.sequence

    const value: AttachedData<Lead> = {
      status: state,
      number,
      identifier: `LEAD-${number}`,
      title,
      kind,
      rank: makeRank(lastOne?.rank, undefined),
      assignee: null,
      startDate: null,
      dueDate: null,
      ...object
    }

    const customerInstance = await client.findOne(contact.class.Contact, { _id: customer })
    if (customerInstance === undefined) {
      throw new Error('contact not found')
    }
    if (!client.getHierarchy().hasMixin(customerInstance, lead.mixin.Customer)) {
      await client.createMixin<Contact, Customer>(
        customerInstance._id,
        customerInstance._class,
        customerInstance.space,
        lead.mixin.Customer,
        { customerDescription: null }
      )
    }

    await client.addCollection(lead.class.Lead, _space, customer, lead.mixin.Customer, 'leads', value, leadId)
    Analytics.handleEvent(LeadEvents.LeadCreated, { id: `LEAD-${number}`, customer })
    dispatch('close')
  }

  const manager = createFocusManager()

  $: object.space = _space
</script>

<FocusHandler {manager} />

<Card
  label={lead.string.CreateLead}
  okAction={createLead}
  canSave={title.trim().length > 0 && customer !== null}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={lead.class.Funnel}
      label={lead.string.FunnelName}
      kind={'regular'}
      size={'large'}
      bind:space={_space}
      create={hasAccountRole(getCurrentAccount(), AccountRole.User)
        ? {
            component: lead.component.CreateFunnel,
            label: lead.string.CreateFunnel
          }
        : undefined}
    />
    <TaskKindSelector projectType={funnel?.type} bind:value={kind} baseClass={lead.class.Lead} />
  </svelte:fragment>
  <svelte:fragment slot="title">
    <div class="flex-row-center gap-2">
      {#if preserveCustomer}
        <UserBox
          readonly
          _class={contact.class.Contact}
          options={{ sort: { modifiedOn: -1 } }}
          excluded={[]}
          label={lead.string.Leads}
          placeholder={lead.string.Leads}
          bind:value={customer}
          kind={'regular'}
          size={'large'}
        />
      {/if}
      <Label label={lead.string.CreateLead} />
    </div>
  </svelte:fragment>

  <StatusControl slot="error" {status} />
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={lead.icon.Lead} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <EditBox
      focusIndex={1}
      bind:value={title}
      placeholder={lead.string.LeadPlaceholder}
      kind={'large-style'}
      autoFocus
    />
  </div>

  <svelte:fragment slot="pool">
    {#if !preserveCustomer}
      <UserBox
        focusIndex={2}
        _class={contact.class.Contact}
        label={lead.string.Customer}
        placeholder={lead.string.SelectCustomer}
        bind:value={customer}
        kind={'regular'}
        size={'large'}
        create={{ component: lead.component.CreateCustomer, label: lead.string.CreateCustomer }}
      />
    {/if}
    <InlineAttributeBar
      _class={lead.class.Lead}
      {object}
      toClass={task.class.Task}
      on:update
      extraProps={{ showNavigate: false }}
    />
  </svelte:fragment>
</Card>
