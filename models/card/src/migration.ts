//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { cardId, DOMAIN_CARD } from '@hanzo/card'
import core, { TxOperations, type Client, type Data, type Doc } from '@hanzo/core'
import {
  tryMigrate,
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  createOrUpdate
} from '@hanzo/model'
import view from '@hanzo/view'
import card from '.'
import tags from '@hanzo/tags'

export const cardOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, cardId, [
      {
        state: 'set-parent-info',
        mode: 'upgrade',
        func: setParentInfo
      },
      {
        state: 'migrate-spaces',
        mode: 'upgrade',
        func: migrateSpaces
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, cardId, [
      {
        state: 'migrateViewlets-v2',
        func: migrateViewlets
      },
      {
        state: 'removeVariantViewlets',
        func: removeVariantViewlets
      },
      {
        state: 'create-defaults',
        func: async (client) => {
          const tx = new TxOperations(client, core.account.System)
          await createDefaultProject(tx)
        }
      },
      {
        state: 'default-labels',
        func: defaultLabels
      }
    ])
  }
}

async function removeVariantViewlets (client: Client): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  const desc = client
    .getHierarchy()
    .getDescendants(card.class.Card)
    .filter((c) => c !== card.class.Card)
  const viewlets = await client.findAll(view.class.Viewlet, { attachTo: { $in: desc }, variant: { $exists: true } })
  for (const viewlet of viewlets) {
    await txOp.remove(viewlet)
  }
}

async function setParentInfo (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_CARD,
    {
      parentInfo: { $exists: false }
    },
    {
      parentInfo: []
    }
  )
}

function extractObjectProps<T extends Doc> (doc: T): Data<T> {
  const data: any = {}
  for (const key in doc) {
    if (key === '_id') {
      continue
    }
    data[key] = doc[key]
  }
  return data as Data<T>
}

async function migrateViewlets (client: Client): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  const viewlets = await client.findAll(view.class.Viewlet, { attachTo: card.class.Card, variant: { $exists: false } })
  const masterTags = await client.findAll(card.class.MasterTag, {})
  const currentViewlets = await client.findAll(view.class.Viewlet, { attachTo: { $in: masterTags.map((p) => p._id) } })
  for (const masterTag of masterTags) {
    for (const viewlet of viewlets) {
      const base = extractObjectProps(viewlet)
      const resConfig = base.config
      let index = -1
      if (viewlet.descriptor === view.viewlet.List) {
        index = viewlet.config.findIndex((p) => typeof p !== 'string' && p.displayProps?.grow === true)
      }
      const attributes = client.getHierarchy().getOwnAttributes(masterTag._id)
      for (const attr of attributes) {
        // let push it after grow for the list
        if (index !== -1) {
          resConfig.splice(index + 1, 0, attr[1].name)
        } else {
          resConfig.push(attr[1].name)
        }
      }
      const current = currentViewlets.find(
        (p) => p.attachTo === masterTag._id && p.variant === viewlet.variant && p.descriptor === viewlet.descriptor
      )
      if (current === undefined) {
        await txOp.createDoc(view.class.Viewlet, core.space.Model, {
          ...base,
          config: resConfig,
          attachTo: masterTag._id
        })
      } else {
        await txOp.diffUpdate(current, {
          ...base,
          config: resConfig,
          attachTo: masterTag._id
        })
      }
    }
  }
}

async function createDefaultProject (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(card.class.CardSpace, {
    _id: card.space.Default
  })

  const currentDeleted = await tx.findOne(core.class.TxRemoveDoc, {
    objectId: card.space.Default
  })

  // Create new if not deleted by customers.
  if (current === undefined && currentDeleted === undefined) {
    const topLevelTypes = await tx.findAll(card.class.MasterTag, {
      extends: card.class.Card
    })
    await tx.createDoc(
      card.class.CardSpace,
      core.space.Space,
      {
        name: 'Default',
        description: 'Default',
        private: false,
        members: [],
        archived: false,
        autoJoin: true,
        types: topLevelTypes.map((it) => it._id)
      },
      card.space.Default
    )
  }
}

async function migrateSpaces (client: MigrationClient): Promise<void> {
  await client.update(DOMAIN_CARD, { space: core.space.Workspace }, { space: card.space.Default })
}

async function defaultLabels (client: Client): Promise<void> {
  const ops = new TxOperations(client, core.account.System)
  await createOrUpdate(
    ops,
    tags.class.TagCategory,
    core.space.Workspace,
    {
      icon: tags.icon.Tags,
      label: 'Labels',
      targetClass: card.class.Card,
      tags: [],
      default: true
    },
    card.category.Labels
  )

  await createOrUpdate(
    ops,
    tags.class.TagElement,
    core.space.Workspace,
    {
      title: 'Subscribed',
      targetClass: card.class.Card,
      description: '',
      color: 17, // green
      category: card.category.Labels
    },
    card.label.Subscribed
  )

  await createOrUpdate(
    ops,
    tags.class.TagElement,
    core.space.Workspace,
    {
      title: 'New messages',
      targetClass: card.class.Card,
      description: '',
      color: 19, // orange
      category: card.category.Labels
    },
    card.label.NewMessages
  )
}
