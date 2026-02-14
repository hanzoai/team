//
// Copyright © 2024 Hanzo AI Inc.
//

import { type Builder } from '@hanzo/model'
import core from '@hanzo/model-core'
import view, { createAction } from '@hanzo/model-view'
import presentation from '@hanzo/model-presentation'

import print from './plugin'

export { printId } from '@hanzo/print'
export * from './migration'
export default print

export function createModel (builder: Builder): void {
  createAction(
    builder,
    {
      action: print.actionImpl.Print,
      label: print.string.PrintToPDF,
      icon: print.icon.Print,
      category: view.category.General,
      input: 'any',
      target: core.class.Doc,
      context: { mode: ['context', 'browser'], group: 'tools' },
      visibilityTester: print.function.CanPrint
    },
    print.action.Print
  )

  builder.createDoc(
    presentation.class.FilePreviewExtension,
    core.space.Model,
    {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      alignment: 'float',
      component: print.component.DOCXViewer,
      extension: presentation.extension.FilePreviewExtension,
      availabilityChecker: print.function.CanConvert
    },
    print.previewExtension.DOCX
  )
}
