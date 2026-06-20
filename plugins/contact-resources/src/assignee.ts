import { type Person } from '@hanzoteam/contact'
import { type Ref } from '@hanzoteam/core'
import { type IntlString } from '@hanzoteam/platform'

/**
 * @public
 */
export interface AssigneeCategory {
  label: IntlString
  func: (val: Array<Ref<Person>>) => Promise<Array<Ref<Person>>>
}
