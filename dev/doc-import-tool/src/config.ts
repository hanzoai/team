import { type Employee } from '@hanzoteam/contact'
import { type Ref, type WorkspaceDataId, type WorkspaceUuid } from '@hanzoteam/core'
import { type DocumentSpace } from '@hanzoteam/controlled-documents'
import { type StorageAdapter } from '@hanzoteam/server-core'

import { type HtmlConversionBackend } from './convert/convert'

export interface Config {
  doc: string
  token: string
  collaborator?: string
  collaboratorURL: string
  uploadURL: string
  workspaceId: WorkspaceUuid
  workspaceDataId?: WorkspaceDataId
  owner: Ref<Employee>
  backend: HtmlConversionBackend
  space: Ref<DocumentSpace>
  storageAdapter: StorageAdapter
  specFile?: string
}
