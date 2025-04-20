import { type Person } from '@hanzo/contact'
import { type Ref } from '@hanzo/core'
import { type IntlString } from '@hanzo/platform'

/**
 * @public
 */
export interface AssigneeCategory {
  label: IntlString
  func: (val: Array<Ref<Person>>) => Promise<Array<Ref<Person>>>
}
