<!--
//
// Copyright @ 2022 Hardcore Engineering Inc
//
-->
<script lang="ts">
  import { Document } from '@hanzo/controlled-documents'
  import { Class, DocumentQuery, Ref, Space, WithLookup } from '@hanzo/core'
  import { Component } from '@hanzo/ui'
  import { Viewlet, ViewletPreference, ViewOptions } from '@hanzo/view'

  export let _class: Ref<Class<Document>>
  export let viewlet: WithLookup<Viewlet>
  export let viewOptions: ViewOptions
  export let query: DocumentQuery<Document> = {}
  export let space: Ref<Space> | undefined
  export let preference: ViewletPreference | undefined = undefined
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class,
      config: preference?.config || viewlet.config,
      options: viewlet.options,
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      space,
      query,
      enableChecking: true
    }}
  />
{/if}
