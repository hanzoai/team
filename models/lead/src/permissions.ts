import type { Builder } from '@hanzoteam/model'
import core from '@hanzoteam/core'
import lead from '@hanzoteam/lead'

export function definePermissions (builder: Builder): void {
  builder.createDoc(
    core.class.Permission,
    core.space.Model,
    {
      label: lead.string.ForbidCreateFunnelPermission,
      scope: 'workspace',
      txClass: core.class.TxCreateDoc,
      objectClass: lead.class.Funnel,
      forbid: true,
      description: lead.string.ForbidCreateFunnelPermissionDescription
    },
    lead.permission.ForbidCreateFunnel
  )
}
