import type { Builder } from '@hanzoteam/model'
import core from '@hanzoteam/core'
import document from '@hanzoteam/document'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: document.string.ForbidCreateTeamspacePermission,
      scope: 'workspace',
      txClass: core.class.TxCreateDoc,
      objectClass: document.class.Teamspace,
      forbid: true,
      description: document.string.ForbidCreateTeamspacePermissionDescription
    },
    document.permission.ForbidCreateTeamspace
  )
}
