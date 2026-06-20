<script lang="ts">
  import contact, { Employee } from '@hanzoteam/contact'
  import { Ref } from '@hanzoteam/core'

  import { Component } from '@hanzoteam/ui'
  import board from '../plugin'

  export let value: Ref<Employee>[]
  export let readonly = false
</script>

<Component
  is={contact.component.UserBoxList}
  props={{ items: value, label: board.string.Members, readonly }}
  on:update
/>
