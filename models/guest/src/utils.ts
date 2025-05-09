import { type Class, type Doc, type Ref } from '@hanzo/core'
import { type Builder } from '@hanzo/model'
import view, { createAction } from '@hanzo/model-view'
import { type Action } from '@hanzo/view'
import guest from './plugin'

export function createPublicLinkAction (builder: Builder, _class: Ref<Class<Doc>>, _id: Ref<Action<Doc, any>>): void {
  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: guest.component.CreatePublicLink,
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: guest.string.PublicLink,
      icon: guest.icon.Link,
      input: 'focus',
      category: guest.category.Guest,
      target: _class,
      context: {
        mode: ['context', 'browser']
      }
    },
    _id
  )
}
