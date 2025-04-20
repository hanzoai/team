//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Employee } from '@hanzo/contact'
import type { Attribute, Class, Doc, Markup, Ref, Status, Timestamp, Type } from '@hanzo/core'
import type { Asset, IntlString, Plugin } from '@hanzo/platform'
import { plugin } from '@hanzo/platform'
import type { Preference } from '@hanzo/preference'
import { TagCategory } from '@hanzo/tags'
import type { Project, ProjectTypeDescriptor, Task, TaskType } from '@hanzo/task'
import type { AnyComponent } from '@hanzo/ui'
import { Action, ActionCategory } from '@hanzo/view'

/**
 * @public
 */
export interface Board extends Project {
  color?: number
  background?: string
}

/**
 * @public
 */
export interface CardCover {
  color: number
  size: 'large' | 'small'
}

/**
 * @public
 */
export interface Card extends Task {
  title: string
  description: Markup

  isArchived?: boolean

  members?: Ref<Employee>[]

  location?: string

  cover?: CardCover | null
  startDate: Timestamp | null
}

/**
 * @public
 */
export interface MenuPage extends Doc {
  component: AnyComponent
  pageId: string
  label: IntlString
}

/**
 * @public
 */
export interface CommonBoardPreference extends Preference {}
/**
 * @public
 */
export const boardId = 'board' as Plugin

/**
 * @public
 */
const boards = plugin(boardId, {
  app: {
    Board: '' as Ref<Doc>
  },
  class: {
    Board: '' as Ref<Class<Board>>,
    Card: '' as Ref<Class<Card>>,
    MenuPage: '' as Ref<Class<MenuPage>>,
    CommonBoardPreference: '' as Ref<Class<CommonBoardPreference>>,
    CardCover: '' as Ref<Class<Type<CardCover>>>
  },
  category: {
    Card: '' as Ref<ActionCategory>,
    Other: '' as Ref<TagCategory>
  },
  descriptors: {
    BoardType: '' as Ref<ProjectTypeDescriptor>
  },
  taskType: {
    Card: '' as Ref<TaskType>
  },
  attribute: {
    State: '' as Ref<Attribute<Status>>
  },
  action: {
    Open: '' as Ref<Action>,
    Cover: '' as Ref<Action<Doc, any>>,
    Dates: '' as Ref<Action<Doc, any>>,
    Labels: '' as Ref<Action<Doc, any>>,
    Move: '' as Ref<Action<Doc, any>>,
    Copy: '' as Ref<Action<Doc, any>>,
    Archive: '' as Ref<Action<Doc, any>>,
    SendToBoard: '' as Ref<Action<Doc, any>>,
    Delete: '' as Ref<Action>
  },
  string: {
    ConfigLabel: '' as IntlString
  },
  icon: {
    Board: '' as Asset,
    Card: '' as Asset
  },
  menuPageId: {
    Main: 'main',
    Archive: 'archive'
  }
})

/**
 * @public
 */
export default boards
