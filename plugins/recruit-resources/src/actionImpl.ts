import { type Doc } from '@hanzo/core'
import { showPopup } from '@hanzo/ui'
import MoveApplication from './components/MoveApplication.svelte'

export async function MoveApplicant (docs: Doc | Doc[]): Promise<void> {
  showPopup(MoveApplication, { selected: Array.isArray(docs) ? docs : [docs] })
}
