<!--
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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
  import {
    type AvatarInfo,
    AvatarProvider,
    getAvatarColorForId,
    getAvatarDisplayName,
    getAvatarProvider,
    getAvatarProviderId,
    Person
  } from '@hanzo/contact'
  import { Asset, getResource } from '@hanzo/platform'
  import { getBlobURL, getClient, reduceCalls, sizeToWidth } from '@hanzo/presentation'
  import {
    AnySvelteComponent,
    ColorDefinition,
    getPlatformAvatarColorByName,
    getPlatformAvatarColorForTextDef,
    getPlatformColor,
    IconSize,
    themeStore
  } from '@hanzo/ui'
  import { onMount } from 'svelte'
  import { AccountUuid, type Data, PersonUuid, Ref, type WithLookup } from '@hanzo/core'

  import { loadUsersStatus, statusByUserStore } from '../utils'
  import AvatarInstance from './AvatarInstance.svelte'

  export let person: (Data<WithLookup<AvatarInfo>> & { _id?: Ref<Person>, personUuid?: PersonUuid }) | undefined =
    undefined
  export let name: string | null | undefined = undefined
  export let direct: Blob | undefined = undefined
  export let size: IconSize
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let variant: 'circle' | 'roundedRect' | 'none' = 'roundedRect'
  export let borderColor: number | undefined = undefined
  export let showStatus: boolean = false
  export let adaptiveName: boolean = false

  export function pulse (): void {
    avatarInst.pulse()
  }

  let url: string | undefined
  let srcSet: string | undefined

  let avatarProvider: AvatarProvider | undefined
  let color: ColorDefinition | undefined = undefined
  let element: HTMLElement
  let avatarInst: AvatarInstance

  $: displayName = getAvatarDisplayName(name)
  $: bColor = borderColor !== undefined ? getPlatformColor(borderColor, $themeStore.dark) : undefined

  const update = reduceCalls(async function (
    size: IconSize,
    avatar?: Data<WithLookup<AvatarInfo>>,
    direct?: Blob,
    name?: string | null
  ) {
    const width = sizeToWidth(size)
    if (direct !== undefined) {
      const blobURL = await getBlobURL(direct)
      url = blobURL
      avatarProvider = undefined
      srcSet = undefined
    } else if (avatar != null) {
      const client = getClient()
      const avatarProviderId = getAvatarProviderId(avatar.avatarType)
      avatarProvider = avatarProviderId !== undefined ? await getAvatarProvider(client, avatarProviderId) : undefined

      if (avatarProvider === undefined) {
        url = undefined
        color = getPlatformAvatarColorByName(
          avatar.avatarProps?.color ?? getAvatarColorForId(displayName),
          $themeStore.dark
        )
      } else {
        const getUrlHandler = await getResource(avatarProvider.getUrl)
        ;({ url, srcSet, color } = await getUrlHandler(avatar, displayName, width))
      }
    } else if (name != null) {
      color = getPlatformAvatarColorForTextDef(name, $themeStore.dark)
      url = undefined
      avatarProvider = undefined
    } else {
      url = undefined
      avatarProvider = undefined
    }
  })
  $: void update(size, person, direct, name)

  onMount(() => {
    loadUsersStatus()
  })

  $: isOnline =
    person?.personUuid !== undefined && $statusByUserStore.get(person.personUuid as AccountUuid)?.online === true
</script>

{#if showStatus && person}
  <div class="relative">
    <AvatarInstance
      bind:this={avatarInst}
      {url}
      srcset={srcSet}
      {displayName}
      {size}
      {icon}
      {variant}
      {color}
      {bColor}
      bind:element
      withStatus
      {adaptiveName}
    />
    <div class="hanzoaiAvatar-statusMarker {size}" class:online={isOnline} class:offline={!isOnline} />
  </div>
{:else}
  <AvatarInstance
    bind:this={avatarInst}
    {url}
    srcset={srcSet}
    {displayName}
    {size}
    {icon}
    {variant}
    {color}
    {bColor}
    bind:element
    {adaptiveName}
  />
{/if}
