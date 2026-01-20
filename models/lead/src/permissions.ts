import type { Builder } from '@hanzo/model'
import core from '@hanzo/core'
import lead from '@hanzo/lead'

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
