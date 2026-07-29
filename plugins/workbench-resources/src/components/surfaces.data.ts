//
// Copyright © 2026 Hanzo AI Inc.
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

// MIRROR of the canonical hanzoai/ui `pkg/ui/src/product/surfaces.data.ts` — keep
// byte-identical (data only). This Svelte Huly-fork cannot resolve @hanzo/ui (its
// own `@hanzo/ui` is the workbench UI framework, a name clash), so the ONE canonical
// cross-surface app-switcher list is mirrored here. Update BOTH in the same change.
//
// `id` is the stable key AND the SurfaceIcon glyph key (see SurfaceIcon.svelte).

export type SurfaceId = 'ai' | 'console' | 'app' | 'chat' | 'bot' | 'team' | 'billing'

/** One Hanzo surface the app switcher offers. */
export interface Surface {
  id: SurfaceId
  label: string
  href: string
  hint: string
}

/** The seven Hanzo surfaces (`console` opens the cloud AI console). */
export const SURFACES: Surface[] = [
  { id: 'ai', label: 'Hanzo AI', href: 'https://hanzo.ai', hint: 'hanzo.ai' },
  { id: 'console', label: 'Console', href: 'https://console.hanzo.ai', hint: 'console.hanzo.ai' },
  { id: 'app', label: 'App', href: 'https://hanzo.app', hint: 'hanzo.app' },
  { id: 'chat', label: 'Chat', href: 'https://hanzo.chat', hint: 'hanzo.chat' },
  { id: 'bot', label: 'Bot', href: 'https://hanzo.bot', hint: 'hanzo.bot' },
  { id: 'team', label: 'Team', href: 'https://hanzo.team', hint: 'hanzo.team' },
  { id: 'billing', label: 'Billing', href: 'https://billing.hanzo.ai', hint: 'billing.hanzo.ai' }
]

/** Every surface except `current` — a launcher never links to itself. */
export function otherSurfaces (current?: SurfaceId): Surface[] {
  return current !== undefined ? SURFACES.filter((s) => s.id !== current) : SURFACES
}
