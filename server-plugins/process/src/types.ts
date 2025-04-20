import { Doc, Tx } from '@hanzo/core'
import { Execution, ExecutionError, MethodParams } from '@hanzo/process'
import { TriggerControl } from '@hanzo/server-core'

export type ExecuteFunc = (
  params: MethodParams<Doc>,
  execution: Execution,
  control: TriggerControl
) => Promise<ExecuteResult>

export type ExecuteResult = SuccessExecutionResult | ExecutionError

export interface SuccessExecutionResult {
  txes: Tx[]
  rollback: Tx[] | undefined
}

export type TransformFunc = (
  value: any,
  props: Record<string, any>,
  control: TriggerControl,
  execution: Execution
) => Promise<any>
