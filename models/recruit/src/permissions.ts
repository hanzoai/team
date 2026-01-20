import type { Builder } from '@hanzo/model'
import core from '@hanzo/core'
import recruit from '@hanzo/recruit'

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
