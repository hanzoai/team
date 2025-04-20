<script lang="ts">
  import contact, { getName } from '@hanzo/contact'
  import core, { Space } from '@hanzo/core'
  import { createQuery, getClient } from '@hanzo/presentation'
  import recruit, { Applicant, Candidate } from '@hanzo/recruit'
  import { Icon, Label } from '@hanzo/ui'

  export let value: Applicant
  export let withoutSpace: boolean
  let space: Space | undefined = undefined

  const query = createQuery()
  const contactQ = createQuery()

  const client = getClient()

  $: query.query(core.class.Space, { _id: value.space }, (res) => {
    space = res[0]
  })

  let candidate: Candidate | undefined = undefined

  $: contactQ.query(contact.class.Contact, { _id: value.attachedTo }, (res) => {
    candidate = res[0]
  })
</script>

{#if !withoutSpace}
  <div>
    <Label label={recruit.string.ConfigLabel} />
    /
    {space?.name}
  </div>
{/if}
<div class="flex-row-center flex-gap-1">
  <div class="icon">
    <Icon icon={recruit.icon.Application} size={'small'} />
  </div>
  {#if candidate}
    {getName(client.getHierarchy(), candidate)}
  {/if}
</div>
