//
// Copyright © 2023 Hardcore Engineering Inc
//

// Add this to the VERY top of the first file loaded in your app
import { Analytics } from '@hanzo/analytics'
import { configureAnalytics, SplitLogger } from '@hanzo/analytics-service'
import contactPlugin from '@hanzo/contact'
import { MeasureMetricsContext, newMetrics, setOperationLogProfiling } from '@hanzo/core'
import { getPlatformQueue } from '@hanzo/kafka'
import { setMetadata } from '@hanzo/platform'
import { setDBExtraOptions } from '@hanzo/postgres'
import { serverConfigFromEnv } from '@hanzo/server'
import serverAiBot from '@hanzo/server-ai-bot'
import serverCalendar from '@hanzo/server-calendar'
import serverCore, {
  initStatisticsContext,
  loadBrandingMap,
  type ConnectionSocket,
  type Session,
  type StorageConfiguration,
  type UserStatistics,
  type Workspace,
  type WorkspaceStatistics
} from '@hanzo/server-core'
import serverNotification from '@hanzo/server-notification'
import { storageConfigFromEnv } from '@hanzo/server-storage'
import serverToken from '@hanzo/server-token'
import { join } from 'path'
import { start } from '.'
import { profileStart, profileStop } from './inspector'

configureAnalytics(process.env.SENTRY_DSN, {})
Analytics.setTag('application', 'transactor')

let getUsers: () => WorkspaceStatistics[] = () => {
  return []
}

const queueConfig = process.env.QUEUE_CONFIG
if (queueConfig === undefined) {
  throw new Error('Please provide queue config')
}

const queue = getPlatformQueue('transactor')

void queue.createTopics(10).catch((err) => {
  console.error('Failed to create required topics', err)
})

// Force create server metrics context with proper logging
const metricsContext = initStatisticsContext('transactor', {
  getUsers: (): WorkspaceStatistics[] => {
    return getUsers()
  },
  factory: () =>
    new MeasureMetricsContext(
      'server',
      {},
      {},
      newMetrics(),
      new SplitLogger('server', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

setOperationLogProfiling(process.env.OPERATION_PROFILING === 'true')

const config = serverConfigFromEnv()
const storageConfig: StorageConfiguration = storageConfigFromEnv()

const usePrepare = (process.env.DB_PREPARE ?? 'true') === 'true'

setDBExtraOptions({
  prepare: usePrepare // We override defaults
})

const lastNameFirst = process.env.LAST_NAME_FIRST === 'true'
setMetadata(contactPlugin.metadata.LastNameFirst, lastNameFirst)
setMetadata(serverCore.metadata.FrontUrl, config.frontUrl)
setMetadata(serverCore.metadata.FilesUrl, config.filesUrl)
setMetadata(serverToken.metadata.Secret, config.serverSecret)
setMetadata(serverNotification.metadata.MailUrl, config.mailUrl ?? '')
setMetadata(serverNotification.metadata.MailAuthToken, config.mailAuthToken)
setMetadata(serverNotification.metadata.WebPushUrl, config.webPushUrl)
setMetadata(serverAiBot.metadata.EndpointURL, process.env.AI_BOT_URL)
setMetadata(serverCalendar.metadata.EndpointURL, process.env.CALENDAR_URL)

const { shutdown, sessionManager } = start(metricsContext, config.dbUrl, {
  fulltextUrl: config.fulltextUrl,
  storageConfig,
  port: config.serverPort,
  brandingMap: loadBrandingMap(config.brandingPath),
  accountsUrl: config.accountsUrl,
  enableCompression: config.enableCompression,
  profiling: {
    start: profileStart,
    stop: profileStop
  },
  mongoUrl: config.mongoUrl,
  queue
})

const entryToUserStats = (session: Session, socket: ConnectionSocket): UserStatistics => {
  return {
    current: session.current,
    mins5: session.mins5,
    userId: session.getUser(),
    sessionId: socket.id,
    total: session.total,
    data: socket.data
  }
}

const workspaceToWorkspaceStats = (ws: Workspace): WorkspaceStatistics => {
  return {
    clientsTotal: new Set(Array.from(ws.sessions.values()).map((it) => it.session.getUser())).size,
    sessionsTotal: ws.sessions.size,
    workspaceName: ws.workspaceName,
    wsId: ws.workspaceUuid,
    sessions: Array.from(ws.sessions.values()).map((it) => entryToUserStats(it.session, it.socket))
  }
}

getUsers = () => {
  return Array.from(sessionManager.workspaces.values()).map((it) => workspaceToWorkspaceStats(it))
}

const close = (): void => {
  console.trace('Exiting from server')
  console.log('Shutdown request accepted')
  void queue.shutdown()
  void shutdown().then(() => {
    process.exit(0)
  })
}

process.on('unhandledRejection', (reason, promise) => {
  metricsContext.error('Unhandled Rejection at:', { reason, promise })
})

global.process.on('uncaughtException', (error, origin) => {
  metricsContext.error('Uncaught Exception at:', { origin, error })
})

process.on('SIGINT', close)
process.on('SIGTERM', close)
