<script lang="ts">
  import { Class } from '@hanzoteam/core'
  import { getClient } from '@hanzoteam/presentation'
  import { Project } from '@hanzoteam/task'
  import { typeStore } from '../..'
  import task from '../../plugin'

  export let value: Class<Project>
  const client = getClient()

  $: asValue = client.getHierarchy().hasMixin(value, task.mixin.ProjectTypeClass)
    ? client.getHierarchy().as(value, task.mixin.ProjectTypeClass)
    : undefined

  $: typeName = asValue !== undefined ? $typeStore.get(asValue.projectType) : undefined
</script>

{#if typeName}
  ({typeName.name})
{/if}
