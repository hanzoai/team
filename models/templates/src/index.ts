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

import { type Domain, DOMAIN_MODEL, IndexKind, type Ref, type Markup, AccountRole } from '@hanzo/core'
import { type Builder, Index, Model, Prop, TypeString, UX, TypeMarkup } from '@hanzo/model'
import core, { TDoc, TSpace } from '@hanzo/model-core'
import textEditor from '@hanzo/model-text-editor'
import tracker from '@hanzo/model-tracker'
import view, { createAction } from '@hanzo/model-view'
import { type IntlString, type Resource } from '@hanzo/platform'
import setting from '@hanzo/setting'
import type {
  MessageTemplate,
  TemplateCategory,
  TemplateField,
  TemplateFieldCategory,
  TemplateFieldFunc
} from '@hanzo/templates'
import templates from './plugin'

export { templatesId } from '@hanzo/templates'
export { templatesOperation } from './migration'

export const DOMAIN_TEMPLATES = 'templates' as Domain

@Model(templates.class.MessageTemplate, core.class.Doc, DOMAIN_TEMPLATES)
@UX(templates.string.Template)
export class TMessageTemplate extends TDoc implements MessageTemplate {
  @Prop(TypeString(), templates.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeMarkup(), templates.string.Message)
  @Index(IndexKind.FullText)
    message!: Markup
}

@Model(templates.class.TemplateCategory, core.class.Space)
@UX(templates.string.TemplateCategory)
export class TTemplateCategory extends TSpace implements TemplateCategory {}

@Model(templates.class.TemplateFieldCategory, core.class.Doc, DOMAIN_MODEL)
export class TTemplateFieldCategory extends TDoc implements TemplateFieldCategory {
  label!: IntlString
}

@Model(templates.class.TemplateField, core.class.Doc, DOMAIN_MODEL)
export class TTemplateField extends TDoc implements TemplateField {
  category!: Ref<TemplateFieldCategory>
  label!: IntlString
  func!: Resource<TemplateFieldFunc>
}

export function createModel (builder: Builder): void {
  builder.createModel(TMessageTemplate, TTemplateFieldCategory, TTemplateField, TTemplateCategory)

  builder.createDoc(
    setting.class.WorkspaceSettingCategory,
    core.space.Model,
    {
      name: 'message-templates',
      label: templates.string.Templates,
      icon: templates.icon.Templates,
      component: templates.component.Templates,
      group: 'settings-editor',
      role: AccountRole.User,
      order: 3500
    },
    templates.ids.Templates
  )

  builder.createDoc(
    textEditor.class.RefInputActionItem,
    core.space.Model,
    {
      label: templates.string.Templates,
      icon: templates.icon.Template,
      action: templates.action.ShowTemplates,
      order: 5000
    },
    templates.ids.TemplatePopupAction
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: templates.component.Copy,
        element: 'top',
        fillProps: {
          _object: 'value'
        }
      },
      label: templates.string.Copy,
      icon: templates.icon.Copy,
      input: 'focus',
      inline: true,
      category: templates.category.MessageTemplate,
      target: templates.class.MessageTemplate,
      context: { mode: 'context', group: 'create' }
    },
    templates.action.Copy
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        element: 'top',
        fillProps: {
          _object: 'object'
        },
        component: templates.component.EditGroup
      },
      label: view.string.Open,
      input: 'focus',
      icon: view.icon.Open,
      category: templates.category.MessageTemplate,
      target: templates.class.TemplateCategory,
      keyBinding: ['keyE'],
      context: {
        mode: ['browser', 'context'],
        group: 'create'
      },
      override: [view.action.Open]
    },
    templates.action.EditGroup
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: templates.component.Move,
        element: 'top',
        fillProps: {
          _object: 'value'
        }
      },
      keyBinding: ['keyM'],
      label: view.string.Move,
      icon: view.icon.Move,
      input: 'focus',
      inline: true,
      category: templates.category.MessageTemplate,
      target: templates.class.MessageTemplate,
      context: { mode: 'context', group: 'create' }
    },
    templates.action.Move
  )

  builder.mixin(templates.class.MessageTemplate, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open, tracker.action.NewRelatedIssue]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TEMPLATES,
    disabled: [{ _class: 1 }, { space: 1 }, { modifiedBy: 1 }, { modifiedOn: 1 }, { createdBy: 1 }, { createdOn: -1 }]
  })
}
