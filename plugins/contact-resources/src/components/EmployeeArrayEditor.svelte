<script lang="ts">
  import { Employee } from '@hanzo/contact'
  import { Ref } from '@hanzo/core'
  import type { ButtonKind, ButtonSize } from '@hanzo/ui'
  import { IntlString } from '@hanzo/platform'
  import UserBoxList from './UserBoxList.svelte'

  export let label: IntlString
  export let value: Ref<Employee>[]
  export let onChange: (refs: Ref<Employee>[]) => void
  export let readonly = false

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'medium'
  export let width: string | undefined = '100%'
  export let justify: 'left' | 'center' = 'left'

  let timer: any

  function onUpdate (evt: CustomEvent<Ref<Employee>[]>): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      onChange(evt.detail)
    }, 500)
  }
</script>

<UserBoxList
  items={value}
  {label}
  on:update={onUpdate}
  {kind}
  {size}
  {justify}
  width={kind === 'list' ? undefined : width}
  {readonly}
/>
