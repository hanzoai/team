import { type Resources } from '@hanzo/platform'
import { type DefSeparators } from '@hanzo/ui'
import CreatePublicLink from './components/CreatePublicLink.svelte'
import GuestApp from './components/GuestApp.svelte'

export default async (): Promise<Resources> => ({
  component: {
    GuestApp,
    CreatePublicLink
  }
})

export const workbenchGuestSeparators: DefSeparators = [null, { minSize: 20, size: 30, maxSize: 50, float: 'aside' }]
