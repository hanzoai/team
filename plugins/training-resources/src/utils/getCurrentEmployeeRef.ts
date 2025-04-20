//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { type Ref } from '@hanzo/core'
import { getCurrentEmployee, type Employee } from '@hanzo/contact'

export function getCurrentEmployeeRef (): Ref<Employee> {
  return getCurrentEmployee()
}
