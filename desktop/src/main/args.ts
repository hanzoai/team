//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { OptionValues, program } from 'commander'

program
  .name('hanzoai')
  .allowUnknownOption()
  .option('-s, --server <url>', 'Remote server URL (front). E.g. https://hanzoai.app')

let opts: OptionValues | null = null

export function getOptions (): OptionValues {
  if (opts === null) {
    program.parse(process.argv.slice(1), { from: 'user' })

    opts = program.opts()
  }

  return opts
}
