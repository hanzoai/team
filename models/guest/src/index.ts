import { type Class, type IndexingConfiguration, type Doc, type Domain, type Ref } from '@hanzo/core'
import { type PublicLink, type Restrictions } from '@hanzo/guest'
import { type Builder, Model } from '@hanzo/model'
import core, { TDoc } from '@hanzo/model-core'
import { type Location } from '@hanzo/ui/src/types'
import guest from './plugin'

export const GUEST_DOMAIN = 'guest' as Domain

@Model(guest.class.PublicLink, core.class.Doc, GUEST_DOMAIN)
export class TPublicLink extends TDoc implements PublicLink {
  url!: string
  location!: Location
  restrictions!: Restrictions
  revokable!: boolean
  attachedTo!: Ref<Doc>
}

export function createModel (builder: Builder): void {
  builder.createModel(TPublicLink)

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: GUEST_DOMAIN,
    disabled: [
      { createdOn: -1 },
      { space: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { attachedToClass: 1 },
      { createdOn: -1 }
    ]
  })
  builder.mixin<Class<PublicLink>, IndexingConfiguration<PublicLink>>(
    guest.class.PublicLink,
    core.class.Class,
    core.mixin.IndexConfiguration,
    {
      searchDisabled: true,
      indexes: []
    }
  )
}

export { guestId } from '@hanzo/guest'
export * from './migration'
export * from './utils'
