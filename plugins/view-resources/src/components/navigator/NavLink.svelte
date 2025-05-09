<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import { Location, location, locationStorageKeyId, locationToUrl, navigate } from '@hanzo/ui'
  import { setFilters } from '../../filter'

  export let app: string | undefined = undefined
  export let space: string | undefined = undefined
  export let special: string | undefined = undefined
  export let disabled = false
  export let shrink: number | undefined = undefined
  export let restoreLastLocation = false
  export let noUnderline = true

  $: loc = createLocation($location, app, space, special)

  $: href = locationToUrl(loc)

  function createLocation (
    loc: Location,
    app: string | undefined,
    space: string | undefined,
    special: string | undefined
  ): Location {
    if (restoreLastLocation) {
      const last = localStorage.getItem(`${locationStorageKeyId}_${app}`)
      if (last != null) {
        try {
          const newLocation: Location = JSON.parse(last)
          if (newLocation.path[1] === loc.path[1] && newLocation.path[2] === app && newLocation.path[3] != null) {
            return newLocation
          }
        } catch (e) {
          // ignore
        }
      }
    }

    const location: Location = {
      path: [...loc.path]
    }
    if (app !== undefined) {
      location.path[2] = app
      location.path.length = 3
    }
    if (space !== undefined) {
      location.path[3] = space
      location.path.length = 4
    }
    if (special !== undefined) {
      location.path[4] = special
      location.path.length = 5
    }
    return location
  }

  function clickHandler (e: MouseEvent): void {
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    setFilters([])
    navigate(loc)
  }
</script>

{#if disabled}
  <slot />
{:else}
  <a class:noUnderline class="noBold" style:flex-shrink={shrink} {href} on:click={clickHandler}>
    <slot />
  </a>
{/if}
