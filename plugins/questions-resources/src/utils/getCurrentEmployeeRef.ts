//
// Copyright © 2023 Hanzo AI Inc.
//

import { type Ref } from '@hanzoteam/core'
import { getCurrentEmployee, type Employee } from '@hanzoteam/contact'

export function getCurrentEmployeeRef (): Ref<Employee> {
  return getCurrentEmployee()
}
