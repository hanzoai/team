<script lang="ts">
  import { Asset, getResource } from '@hanzo/platform'
  import { getClient } from '@hanzo/presentation'
  import { Menu, Action, showPopup, closePopup } from '@hanzo/ui'
  import view from '@hanzo/view'
  import contact from '../plugin'

  const client = getClient()

  const actions: Action[] = []
  const hierarchy = client.getHierarchy()

  client
    .getHierarchy()
    .getDescendants(contact.class.Contact)
    .map(async (v) => {
      const cl = hierarchy.getClass(v)
      if (hierarchy.hasMixin(cl, view.mixin.ObjectFactory)) {
        const { component, create } = hierarchy.as(cl, view.mixin.ObjectFactory)
        let action: (() => Promise<void>) | undefined

        if (component) {
          action = async () => {
            closePopup()
            showPopup(component, { shouldSaveDraft: true }, 'top')
          }
        } else if (create) {
          action = await getResource(create)
        }

        if (action) {
          actions.push({
            icon: cl.icon as Asset,
            label: cl.label,
            action
          })
        }
      }
    })
</script>

<Menu {actions} on:changeContent />
