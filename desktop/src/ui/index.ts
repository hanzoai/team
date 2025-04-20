import { loginId } from '@hanzo/login'
import { getEmbeddedLabel, getMetadata } from '@hanzo/platform'
import presentation, { MessageBox, setDownloadProgress } from '@hanzo/presentation'
import settings, { settingId } from '@hanzo/setting'
import {
  closePanel,
  closePopup,
  createApp,
  getCurrentResolvedLocation,
  navigate,
  parseLocation,
  pushRootBarProgressComponent,
  removeRootBarComponent,
  showPopup
} from '@hanzo/ui'

import { notificationId } from '@hanzo/notification'
import { workbenchId, logOut } from '@hanzo/workbench'

import { isOwnerOrMaintainer } from '@hanzo/core'
import { configurePlatform } from './platform'
import { defineScreenShare, defineScreenRecorder } from './screenShare'
import { IPCMainExposed } from './types'

defineScreenShare()
defineScreenRecorder()

void configurePlatform().then(() => {
  createApp(document.body)
})

window.addEventListener('DOMContentLoaded', () => {
  const ipcMain = (window as any).electron as IPCMainExposed

  ipcMain.on('open-settings', () => {
    closePopup()
    closePanel()
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    loc.query = undefined
    loc.path[2] = settingId
    loc.path.length = 3
    navigate(loc)
  })

  ipcMain.on('select-workspace', () => {
    closePopup()
    closePanel()
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    loc.query = undefined
    loc.path[0] = loginId
    loc.path[1] = 'selectWorkspace'
    loc.path.length = 2
    navigate(loc)
  })

  ipcMain.on('logout', () => {
    void logOut().then(() => {
      navigate({ path: [loginId] })
    })
  })

  ipcMain.handleDeepLink((urlString) => {
    const urlObject = new URL(urlString)
    navigate(parseLocation(urlObject))
  })

  ipcMain.handleNotificationNavigation(() => {
    // For now navigate only to Inbox
    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    const location = getCurrentResolvedLocation()
    const urlString = `${frontUrl}/${workbenchId}/${location.path[1]}/${notificationId}`
    const urlObject = new URL(urlString)
    navigate(parseLocation(urlObject))
  })

  ipcMain.handleUpdateDownloadProgress((progress) => {
    setDownloadProgress(progress)
  })

  ipcMain.handleAuth((token) => {
    const authLoc = {
      path: ['login', 'auth'],
      query: { token }
    }

    navigate(authLoc)
  })

  ipcMain.on('start-backup', () => {
    // We need to obtain current token and endpoint and trigger backup
    const token = getMetadata(presentation.metadata.Token)
    const endpoint = getMetadata(presentation.metadata.Endpoint)
    const workspaceUuid = getMetadata(presentation.metadata.WorkspaceUuid)
    // const workspaceDataId = getMetadata(presentation.metadata.WorkspaceDataId)
    // const workspaceUrl = getMetadata(presentation.metadata.WorkspaceUrl)
    // const wsIds = {
    //   uuid: workspaceUuid,
    //   dataId: workspaceDataId,
    //   url: workspaceUrl
    // }
    if (isOwnerOrMaintainer()) {
      if (token != null && endpoint != null && workspaceUuid != null) {
        // ipcMain.startBackup(token, endpoint, wsIds)
        closePopup()
        closePanel()
        const loc = getCurrentResolvedLocation()
        loc.fragment = undefined
        loc.query = undefined
        loc.path[2] = settingId
        loc.path[3] = 'setting'
        loc.path[4] = 'backup'
        loc.path.length = 5
        navigate(loc)
      }
    } else {
      showPopup(MessageBox, {
        label: settings.string.OwnerOrMaintainerRequired
      })
    }
  })

  ipcMain.on('backup', (evt: any, ...args: any) => {
    pushRootBarProgressComponent('backup',
      getEmbeddedLabel('Backup'),
      () => { return args[0] },
      () => {
        ipcMain.cancelBackup()
      },
      undefined,
      undefined,
      50
    )
  })
  ipcMain.on('backup-cancel', () => {
    removeRootBarComponent('backup')
  })
})
