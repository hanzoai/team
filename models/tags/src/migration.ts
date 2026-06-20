import core, { type Ref, type Space } from '@hanzoteam/core'
import {
  migrateSpace,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hanzoteam/model'
import { tagsId } from '@hanzoteam/tags'
import { DOMAIN_TAGS } from '.'

export const tagsOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, tagsId, [
      {
        state: 'removeDeprecatedSpace',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'tags:space:Tags' as Ref<Space>, core.space.Workspace, [DOMAIN_TAGS])
        }
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
