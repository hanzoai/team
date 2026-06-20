//
// Copyright © 2024 Hanzo AI Inc.
//
//

import type { Plugin } from '@hanzoteam/platform'
import products from '@hanzoteam/products'

import core from '@hanzoteam/core'
import { type Builder } from '@hanzoteam/model'
import serverCore from '@hanzoteam/server-core'

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
