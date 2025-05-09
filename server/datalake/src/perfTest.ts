import { MeasureMetricsContext, type WorkspaceDataId, type WorkspaceUuid, generateId } from '@hanzo/core'
import type { StorageConfiguration } from '@hanzo/server-core'
import { DatalakeService, processConfigFromEnv, type DatalakeConfig } from '.'

const MB = 1024 * 1024

const config: StorageConfiguration = { default: 'minio', storages: [] }
const minioConfigVar = processConfigFromEnv(config)
if (minioConfigVar !== undefined || config.storages[0] === undefined) {
  console.error('No Datalake config env is configured:' + minioConfigVar)
  it.skip('No Datalake config env is configured', async () => {})
  process.exit(1)
}
const toolCtx = new MeasureMetricsContext('test', {})
const storageService = new DatalakeService({ ...(config.storages[0] as DatalakeConfig) })

async function doTest (): Promise<void> {
  const genWorkspaceId1 = generateId() as unknown as WorkspaceDataId

  const wsIds1 = {
    uuid: genWorkspaceId1 as unknown as WorkspaceUuid,
    dataId: genWorkspaceId1,
    url: ''
  }
  await storageService.make(toolCtx, wsIds1)

  /// /////// Uploads
  console.log('upload 1mb test')
  let st1 = Date.now()
  const sz = 10
  const stream = Buffer.alloc(sz * 1024 * 1024)
  for (let i = 0; i < 10; i++) {
    // We need 1Mb random file to check upload speed.
    const st = Date.now()
    await storageService.put(toolCtx, wsIds1, `testObject.${i}`, stream, 'application/octet-stream', stream.length)
    console.log('upload time', Date.now() - st)
  }
  let now = Date.now()
  console.log(`upload performance: ${Math.round((sz * 10 * 1000 * 100) / (now - st1)) / 100} mb per second`)

  /// // Downloads 1
  console.log('download 1mb test')
  st1 = Date.now()
  for (let i = 0; i < 10; i++) {
    // We need 1Mb random file to check upload speed.
    const st = Date.now()
    await storageService.read(toolCtx, wsIds1, `testObject.${i}`)
    console.log('download time', Date.now() - st)
  }

  now = Date.now()
  console.log(`download performance: ${Math.round((sz * 10 * 1000 * 100) / (now - st1)) / 100} mb per second`)

  /// Downloads 2
  st1 = Date.now()
  for (let i = 0; i < 10; i++) {
    // We need 1Mb random file to check upload speed.
    const st = Date.now()
    const readable = await storageService.get(toolCtx, wsIds1, `testObject.${i}`)
    const chunks: Buffer[] = []
    readable.on('data', (chunk) => {
      chunks.push(chunk)
    })
    await new Promise<void>((resolve) => {
      readable.on('end', () => {
        resolve()
        readable.destroy()
      })
    })
    console.log('download time 2', Date.now() - st)
  }

  now = Date.now()
  console.log(`download performance: ${Math.round((sz * 10 * 1000 * 100) / (now - st1)) / 100} mb per second`)

  /// Downloads 3
  console.log('download partial test')
  st1 = Date.now()
  for (let i = 0; i < 10; i++) {
    // We need 1Mb random file to check upload speed.
    const st = Date.now()
    for (let i = 0; i < sz; i++) {
      const readable = await storageService.partial(toolCtx, wsIds1, `testObject.${i}`, i * MB, MB)
      const chunks: Buffer[] = []
      readable.on('data', (chunk) => {
        chunks.push(chunk)
      })
      await new Promise<void>((resolve) => {
        readable.on('end', () => {
          resolve()
          readable.destroy()
        })
      })
    }
    console.log('download time 2', Date.now() - st)
  }

  now = Date.now()
  console.log(`download performance: ${Math.round((sz * 10 * 1000 * 100) / (now - st1)) / 100} mb per second`)
}

void doTest().catch((err) => {
  console.error(err)
})

console.log('done')
