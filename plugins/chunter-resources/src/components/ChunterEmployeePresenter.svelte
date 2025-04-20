<script lang="ts">
  import contact, { Person, Employee } from '@hanzo/contact'
  import { EmployeePresenter } from '@hanzo/contact-resources'
  import { getClient } from '@hanzo/presentation'
  import { getCurrentLocation, location, Location } from '@hanzo/ui'
  import { decodeObjectURI } from '@hanzo/view'
  import { Ref } from '@hanzo/core'
  import { chunterId } from '@hanzo/chunter'
  import { notificationId } from '@hanzo/notification'

  import { createDirect } from '../utils'
  import { openChannel } from '../navigation'
  import chunter from '../plugin'

  export let person: Person | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function canNavigateToDirect (location: Location, person: Person | undefined): boolean {
    const app = location.path[2]
    if (app !== chunterId && app !== notificationId) {
      return false
    }

    if (person === undefined) {
      return false
    }

    return hierarchy.hasMixin(person, contact.mixin.Employee) && (person as Employee).active
  }

  async function openEmployeeDirect (): Promise<void> {
    if (person === undefined) return

    const dm = await createDirect([person._id as Ref<Employee>])
    if (dm === undefined) {
      return
    }

    const loc = getCurrentLocation()
    const [_id] = decodeObjectURI(loc.path[3]) ?? []

    if (_id === dm) {
      return
    }

    openChannel(dm, chunter.class.DirectMessage, undefined, true)
  }
</script>

<EmployeePresenter
  value={person}
  shouldShowAvatar={false}
  compact
  onEmployeeEdit={canNavigateToDirect($location, person) ? openEmployeeDirect : undefined}
/>
