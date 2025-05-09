<!--
// Copyright © 2021 Hanzo <dev@hanzo.ai>.
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
  import type { Class, Doc, Ref, RelatedDocument } from '@hanzo/core'
  import { createQuery, getClient } from '@hanzo/presentation'
  import { AttributeModel } from '@hanzo/view'
  import { getObjectPresenter } from '../utils'
  import { Analytics } from '@hanzo/analytics'

  export let objectId: Ref<Doc> | undefined = undefined
  export let _class: Ref<Class<Doc>> | undefined = undefined
  export let value: Doc | RelatedDocument | undefined = undefined
  export let props: Record<string, any> = {}
  export let inline: boolean = false
  export let accent: boolean = false
  export let colorInherit: boolean = false
  export let shouldShowAvatar: boolean = true
  export let noUnderline: boolean = true
  export let disabled: boolean = false
  export let shouldShowName: boolean = true
  export let shrink: number = 1
  export let exact = false

  const client = getClient()
  let presenter: AttributeModel | undefined

  const docQuery = createQuery()
  let doc: Doc | undefined

  $: if (value === undefined && _class != null && objectId != null) {
    docQuery.query(_class, { _id: objectId }, (r) => {
      doc = r.shift()
    })
  } else if (
    value?._id !== undefined &&
    value?._class !== undefined &&
    objectId === undefined &&
    _class === undefined &&
    (value as Doc)?.space === undefined
  ) {
    docQuery.query(value._class, { _id: value._id }, (r) => {
      ;[doc] = r
    })
  } else if (value?._id !== undefined && value?._class !== undefined && (value as Doc).space !== undefined) {
    docQuery.unsubscribe()
    doc = value as Doc
  }

  $: if (doc !== undefined) {
    getObjectPresenter(client, exact && _class ? _class : doc._class, { key: '' })
      .then((p) => {
        presenter = p
      })
      .catch((p: any) => {
        Analytics.handleError(p)
        throw p
      })
  }
</script>

{#if presenter}
  <svelte:component
    this={presenter.presenter}
    value={doc}
    {inline}
    {accent}
    {colorInherit}
    {shouldShowAvatar}
    {shouldShowName}
    {noUnderline}
    {disabled}
    {shrink}
    {...props}
    on:accent-color
    on:close
    on:click
  />
{/if}
