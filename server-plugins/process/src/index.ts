import { Doc, Mixin, Ref } from '@hanzo/core'
import type { Plugin, Resource } from '@hanzo/platform'
import { plugin } from '@hanzo/platform'
import { Method, ProcessFunction } from '@hanzo/process'
import { TriggerFunc } from '@hanzo/server-core'
import { ExecuteFunc, TransformFunc } from './types'

export * from './types'

/**
 * @public
 */
export const serverProcessId = 'server-process' as Plugin

export interface MethodImpl<T extends Doc> extends Method<T> {
  func: Resource<ExecuteFunc>
}

export interface FuncImpl extends ProcessFunction {
  func: Resource<TransformFunc>
}

/**
 * @public
 */
export default plugin(serverProcessId, {
  mixin: {
    MethodImpl: '' as Ref<Mixin<MethodImpl<Doc>>>,
    FuncImpl: '' as Ref<Mixin<FuncImpl>>
  },
  func: {
    RunSubProcess: '' as Resource<ExecuteFunc>,
    CreateToDo: '' as Resource<ExecuteFunc>,
    UpdateCard: '' as Resource<ExecuteFunc>,
    WaitSubProcess: '' as Resource<ExecuteFunc>
  },
  transform: {
    FirstValue: '' as Resource<TransformFunc>,
    LastValue: '' as Resource<TransformFunc>,
    Random: '' as Resource<TransformFunc>,
    UpperCase: '' as Resource<TransformFunc>,
    LowerCase: '' as Resource<TransformFunc>,
    Trim: '' as Resource<TransformFunc>,
    Add: '' as Resource<TransformFunc>,
    Subtract: '' as Resource<TransformFunc>,
    Offset: '' as Resource<TransformFunc>,
    FirstWorkingDayAfter: '' as Resource<TransformFunc>
  },
  trigger: {
    OnExecutionCreate: '' as Resource<TriggerFunc>,
    OnStateRemove: '' as Resource<TriggerFunc>,
    OnProcessRemove: '' as Resource<TriggerFunc>,
    OnProcessToDoClose: '' as Resource<TriggerFunc>,
    OnProcessToDoRemove: '' as Resource<TriggerFunc>,
    OnExecutionContinue: '' as Resource<TriggerFunc>
  }
})
