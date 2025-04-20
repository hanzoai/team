//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import { type Client, type Doc, type Ref } from '@hanzo/core'
import { type Resources } from '@hanzo/platform'
import { showPopup } from '@hanzo/ui'
import { type Category, type Product } from '@hanzo/inventory'

import Categories from './components/Categories.svelte'
import CategoryPresenter from './components/CategoryPresenter.svelte'
import CategoryRefPresenter from './components/CategoryRefPresenter.svelte'
import CreateCategory from './components/CreateCategory.svelte'
import EditProduct from './components/EditProduct.svelte'
import ProductPresenter from './components/ProductPresenter.svelte'
import VariantPresenter from './components/VariantPresenter.svelte'
import Variants from './components/Variants.svelte'
import CreateProduct from './components/CreateProduct.svelte'

import product from './plugin'

async function createSubcategory (object: Doc): Promise<void> {
  showPopup(CreateCategory, { attachedTo: object._id })
}
async function getProductId (client: Client, ref: Ref<Product>, doc?: Product): Promise<string> {
  const object = doc ?? (await client.findOne(product.class.Product, { _id: ref }))
  if (object === undefined) return ''
  return object.name
}

async function getCategoryId (client: Client, ref: Ref<Category>, doc?: Category): Promise<string> {
  const object = doc ?? (await client.findOne(product.class.Category, { _id: ref }))
  if (object === undefined) return ''
  return object.name
}

export default async (): Promise<Resources> => ({
  actionImpl: {
    CreateSubcategory: createSubcategory
  },
  component: {
    Categories,
    CategoryPresenter,
    CategoryRefPresenter,
    ProductPresenter,
    EditProduct,
    Variants,
    VariantPresenter,
    CreateProduct
  },
  function: {
    ProductIdProvider: getProductId,
    CategoryIdProvider: getCategoryId
  }
})
