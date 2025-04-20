//
// Copyright © 2024 Hardcore Engineering Inc.
//
//

import type { Plugin } from '@hanzo/platform'
import products from '@hanzo/products'

import core from '@hanzo/core'
import { type Builder } from '@hanzo/model'
import serverCore from '@hanzo/server-core'

export const serverProductsId = 'server-products' as Plugin

export function createModel (builder: Builder): void {
  builder.mixin(products.class.Product, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: products.component.ProductSearchIcon,
      fields: [['icon'], ['color']]
    },
    title: [['name']]
  })
}
