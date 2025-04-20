<script lang="ts">
  import contact, { Employee } from '@hanzo/contact'
  import { Ref } from '@hanzo/core'

  import { Component } from '@hanzo/ui'
  import board from '../plugin'

  export let value: Ref<Employee>[]
  export let readonly = false
</script>

<Component
  is={contact.component.UserBoxList}
  props={{ items: value, label: board.string.Members, readonly }}
  on:update
/>
