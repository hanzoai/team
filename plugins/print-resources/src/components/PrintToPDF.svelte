<!--
// Copyright © 2024 Hanzo AI Inc.
//
-->

<script lang="ts">
  import { Analytics } from '@hanzoteam/analytics'
  import { Doc, type Blob, type Ref } from '@hanzoteam/core'
  import presentation, { PDFViewer, createQuery, getClient } from '@hanzoteam/presentation'
  import guest, { PublicLink, createPublicLink } from '@hanzoteam/guest'
  import view from '@hanzoteam/view'
  import { Location } from '@hanzoteam/ui'
  import { getDocTitle, getObjectLinkFragment } from '@hanzoteam/view-resources'
  import { printToPDF } from '@hanzoteam/print'
  import { signPDF } from '@hanzoteam/sign'
  import { getMetadata } from '@hanzoteam/platform'

  export let object: Doc
  export let signed: boolean = false

  const client = getClient()

  let isLoading = true
  let isLinkLoading = true
  let link: PublicLink | undefined = undefined
  let file: Ref<Blob> | undefined = undefined
  let title = ''

  $: objId = object?._id

  const linkQuery = createQuery()
  $: {
    link = undefined
    file = undefined
    isLoading = true
    isLinkLoading = true
    linkQuery.query(
      guest.class.PublicLink,
      { attachedTo: objId },
      (res) => {
        link = res[0]
        isLinkLoading = false
      },
      { limit: 1 }
    )
  }

  $: if (link?.url !== undefined && link.url !== '' && file === undefined) {
    const token = getMetadata(presentation.metadata.Token) ?? ''

    printToPDF(link.url, token).then(
      (res) => {
        if (signed) {
          signPDF(res, token).then(
            (signedRes) => {
              file = signedRes as Ref<Blob>
              isLoading = false
            },
            (err) => {
              Analytics.handleError(err)
              isLoading = false
            }
          )
        } else {
          file = res as Ref<Blob>
          isLoading = false
        }
      },
      (err) => {
        Analytics.handleError(err)
        isLoading = false
      }
    )
  }

  $: if (object !== undefined && !isLinkLoading) {
    void createLinkIfMissing(object)
  }

  async function getObjectLocation (obj: Doc): Promise<Location> {
    const panelComponent = client.getHierarchy().classHierarchyMixin(obj._class, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? view.component.EditDoc

    return await getObjectLinkFragment(client.getHierarchy(), obj, {}, comp)
  }

  async function createLinkIfMissing (obj: Doc): Promise<void> {
    if (link?.attachedTo === obj._id) {
      return
    }

    if (link === undefined) {
      const location = await getObjectLocation(obj)

      await createPublicLink(client, obj, location)
    }
  }

  async function updateDocTitle (obj: Doc): Promise<void> {
    const value = (await getDocTitle(client, obj._id, obj._class, obj)) ?? ''
    title = value !== '' ? value + '.pdf' : ''
  }

  $: void updateDocTitle(object)
</script>

<PDFViewer {file} name={title} contentType="application/pdf" showIcon={false} {isLoading} on:close on:fullsize />
