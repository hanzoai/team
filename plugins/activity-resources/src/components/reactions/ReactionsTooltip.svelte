<script lang="ts">
  import { PersonId } from '@hanzoteam/core'
  import { ObjectPresenter } from '@hanzoteam/view-resources'
  import contact from '@hanzoteam/contact'
  import { getPersonRefByPersonIdStore } from '@hanzoteam/contact-resources'

  export let socialIds: PersonId[] = []

  $: personRefByPersonIdStore = getPersonRefByPersonIdStore(socialIds)
  $: persons = socialIds.map((si) => $personRefByPersonIdStore.get(si))
</script>

<div class="m-2 flex-col flex-gap-2">
  {#each persons as person}
    <ObjectPresenter objectId={person} _class={contact.class.Person} disabled />
  {/each}
</div>
