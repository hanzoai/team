import type { Builder } from '@hanzoteam/model'
import core from '@hanzoteam/core'
import recruit from '@hanzoteam/recruit'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: recruit.string.ForbidCreateVacancyPermission,
      scope: 'workspace',
      txClass: core.class.TxCreateDoc,
      objectClass: recruit.class.Vacancy,
      forbid: true,
      description: recruit.string.ForbidCreateVacancyPermissionDescription
    },
    recruit.permission.ForbidCreateVacancy
  )
}
