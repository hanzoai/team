<script lang="ts">
  import { PersonId } from '@hanzo/core'
  import { ObjectPresenter } from '@hanzo/view-resources'
  import contact from '@hanzo/contact'
  import { personRefByPersonIdStore } from '@hanzo/contact-resources'

  export let reactionAccounts: PersonId[]

  $: persons = reactionAccounts.map((user) => $personRefByPersonIdStore.get(user))
</script>

<div class="m-2 flex-col flex-gap-2">
  {#each persons as person}
    <ObjectPresenter objectId={person} _class={contact.class.Person} disabled />
  {/each}
</div>
