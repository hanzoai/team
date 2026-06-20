import { type Doc } from '@hanzoteam/core'
import { showPopup } from '@hanzoteam/ui'
import MoveApplication from './components/MoveApplication.svelte'

export async function MoveApplicant (docs: Doc | Doc[]): Promise<void> {
  showPopup(MoveApplication, { selected: Array.isArray(docs) ? docs : [docs] })
}
