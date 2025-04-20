import { Employee } from '@hanzo/contact'
import { Ref, WorkspaceDataId, WorkspaceUuid } from '@hanzo/core'
import { DocumentSpace } from '@hanzo/controlled-documents'
import { StorageAdapter } from '@hanzo/server-core'

import { HtmlConversionBackend } from './convert/convert'

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
