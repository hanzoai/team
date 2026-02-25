import core, { MeasureMetricsContext, type Ref, type WorkspaceUuid } from '@hanzo/core'
import { getPlatformQueue } from '@hanzo/kafka'
import process, { type Execution } from '@hanzo/process'
import { QueueTopic } from '@hanzo/server-core'
import type { ProcessMessage } from '@hanzo/server-process'

export async function SendTimeEvent (ws: WorkspaceUuid, _execution: Ref<Execution>): Promise<void> {
  const SERVICE_NAME = 'worker'
  const queue = getPlatformQueue(SERVICE_NAME)
  const ctx = new MeasureMetricsContext(SERVICE_NAME, {})

  const producer = queue.getProducer<ProcessMessage>(ctx, QueueTopic.Process)

  await producer.send(ctx, ws, [
    {
      account: core.account.System,
      event: [process.trigger.OnTime],
      createdOn: Date.now(),
      context: {},
      execution: _execution
    }
  ])
}

export default {
  SendTimeEvent
}
