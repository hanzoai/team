<!--
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
-->

<script lang="ts">
  import { type Data, reduceCalls, type WithLookup } from '@hanzo/core'
  import { AvatarInfo, getAvatarColorForId, getAvatarDisplayName, getAvatarUrlInfo } from '@hanzo/contact'
  import { themeStore } from '@hanzo/theme'
  import { ColorDefinition, getPlatformAvatarColorByName, getPlatformAvatarColorForTextDef } from '@hanzo/ui'
  import { getClient, sizeToWidth } from '@hanzo/presentation'

  import { AvatarShape, AvatarSize } from '../types'

  export let avatar: Data<AvatarInfo> | undefined
  export let name: string | undefined = undefined
  export let size: AvatarSize = AvatarSize.Small
  export let shape: AvatarShape = AvatarShape.Circle

  let url: string | undefined
  let srcSet: string | undefined
  let color: ColorDefinition | undefined = undefined

  const update = reduceCalls(async function (
    size: AvatarSize,
    avatar?: Data<WithLookup<AvatarInfo>>,
    name?: string | null
  ) {
    const client = getClient()

    ;({ url, srcSet, color } = await getAvatarUrlInfo(client, avatar, sizeToWidth(size), name))

    if (url === undefined && color === undefined && name != null && name !== '') {
      const displayName = getAvatarDisplayName(name)
      if (avatar != null) {
        color = getPlatformAvatarColorByName(
          avatar.avatarProps?.color ?? getAvatarColorForId(displayName),
          $themeStore.dark
        )
      } else {
        color = getPlatformAvatarColorForTextDef(name, $themeStore.dark)
      }
    }
  })
  $: void update(size, avatar, name)
</script>

<div class="avatar {size} {shape}" style:background-color={color && !url ? color.icon : 'var(--theme-button-default)'}>
  {#if url}
    <img src={url} srcset={srcSet} alt="avatar" />
  {:else}
    <div
      class="ava-text"
      style:color={color ? color.iconText : 'var(--primary-button-color)'}
      data-name={getAvatarDisplayName(name).toLocaleUpperCase()}
    />
  {/if}
</div>

<style lang="scss">
  .avatar {
    position: relative;
    display: inline-flex;
    overflow: hidden;
    flex-shrink: 0;
    aspect-ratio: 1;
    pointer-events: none;
    align-items: center;
    justify-content: center;

    &.circle {
      border-radius: 100%;
    }

    &.x-small {
      width: var(--next-avatar-size-xsmall);
      height: var(--next-avatar-size-xsmall);
    }

    &.small {
      width: var(--next-avatar-size-small);
      height: var(--next-avatar-size-small);
    }

    &.regular {
      width: var(--next-avatar-size-regular);
      height: var(--next-avatar-size-regular);
    }

    &.medium {
      width: var(--next-avatar-size-medium);
      height: var(--next-avatar-size-medium);
    }

    &.large {
      width: var(--next-avatar-size-large);
      height: var(--next-avatar-size-large);
    }

    &.x-large {
      width: var(--next-avatar-size-xlarge);
      height: var(--next-avatar-size-xlarge);
    }

    &.xx-large {
      width: var(--next-avatar-size-xxlarge);
      height: var(--next-avatar-size-xxlarge);
    }

    &.xxx-large {
      width: var(--next-avatar-size-xxxlarge);
      height: var(--next-avatar-size-xxxlarge);
    }
  }

  .ava-text {
    font-weight: 500;
    letter-spacing: -0.05em;
    font-size: 1rem;

    &::after {
      content: attr(data-name);
      transform: translate(-50%, -50%);
    }
  }
</style>
