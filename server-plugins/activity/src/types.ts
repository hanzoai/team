import { Doc, Hierarchy, ModelDb, Ref, TxCUD, TxFactory, WorkspaceIds, type MeasureContext } from '@hanzoteam/core'
import { StorageAdapter, type SessionFindAll } from '@hanzoteam/server-core'

export interface DocObjectCache {
  docs: Map<Ref<Doc>, Doc | null>
  transactions: Map<Ref<Doc>, TxCUD<Doc>[]>
}

export interface ActivityControl {
  ctx: MeasureContext
  findAll: SessionFindAll
  hierarchy: Hierarchy
  txFactory: TxFactory
  modelDb: ModelDb
  storageAdapter: StorageAdapter
  workspace: WorkspaceIds
}
