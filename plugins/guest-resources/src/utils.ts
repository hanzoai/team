import {
  type AccountClient,
  type WorkspaceLoginInfo,
  getClient as getAccountClientRaw
} from '@hanzoteam/account-client'
import client from '@hanzoteam/client'
import { type Doc, AccountRole } from '@hanzoteam/core'
import login from '@hanzoteam/login'
import { getMetadata, getResource, setMetadata } from '@hanzoteam/platform'
import presentation from '@hanzoteam/presentation'
import { getCurrentLocation, navigate } from '@hanzoteam/ui'
import view from '@hanzoteam/view'
import { getObjectLinkFragment } from '@hanzoteam/view-resources'
import { workbenchId } from '@hanzoteam/workbench'

function getAccountClient (token: string | undefined | null): AccountClient {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  return getAccountClientRaw(accountsUrl, token !== null ? token : undefined)
}

export async function checkAccess (doc: Doc): Promise<void> {
  const loc = getCurrentLocation()
  const ws = loc.path[1]

  let wsLoginInfo: WorkspaceLoginInfo | undefined

  try {
    wsLoginInfo = await getAccountClient(null).selectWorkspace(ws)
    if (wsLoginInfo === undefined || wsLoginInfo.role === AccountRole.DocGuest) return
  } catch (err: any) {
    return
  }

  const token = wsLoginInfo?.token
  const endpoint = getMetadata(presentation.metadata.Endpoint)
  if (token === undefined || endpoint === undefined) return

  const clientFactory = await getResource(client.function.GetClient)
  const _client = await clientFactory(token, endpoint)

  const res = await _client.findOne(doc._class, { _id: doc._id })
  const hierarchy = _client.getHierarchy()
  await _client.close()
  if (res !== undefined) {
    const panelComponent = hierarchy.classHierarchyMixin(doc._class, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? view.component.EditDoc
    const loc = await getObjectLinkFragment(hierarchy, doc, {}, comp)
    loc.path[0] = workbenchId
    loc.path[1] = ws
    // We have access, let's set correct tokens and redirect)
    setMetadata(presentation.metadata.Token, token)
    navigate(loc)
  }
}
