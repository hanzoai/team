<script lang="ts">
  import { getClient } from '@hanzoteam/presentation'
  import { RelationSetting } from '@hanzoteam/setting-resources'
  import contact from '@hanzoteam/contact'
  import card from '../../plugin'
  import { Analytics } from '@hanzoteam/analytics'
  import { CardEvents, MasterTag } from '@hanzoteam/card'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const _classes = [...hierarchy.getDescendants(card.class.Card), contact.class.Contact].filter((c) => {
    if (c === card.class.Card) return false
    const cl = hierarchy.getClass(c)
    if (cl._class !== card.class.MasterTag) return true
    if ((cl as MasterTag).removed === true) return false
    return true
  })

  function createHandler (): void {
    Analytics.handleEvent(CardEvents.RelationCreated)
  }
</script>

<RelationSetting {_classes} exclude={[]} on:create={createHandler} />
