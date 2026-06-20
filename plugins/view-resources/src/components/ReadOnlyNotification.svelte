<script lang="ts">
  import { getMetadata } from '@hanzoteam/platform'
  import { Button, navigate, Notification, NotificationToast } from '@hanzoteam/ui'
  import view from '@hanzoteam/view'
  import presentation, { getCurrentWorkspaceUrl } from '@hanzoteam/presentation'
  import { allowGuestSignUpStore } from '../utils'

  export let onRemove: () => void
  export let notification: Notification

  function joinWorkspace (e: MouseEvent): void {
    navigate({ path: ['login', 'join'], query: { workspace: getCurrentWorkspaceUrl() } })
  }
</script>

<NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
  <svelte:fragment slot="content">
    {notification.subTitle}
  </svelte:fragment>
  <svelte:fragment slot="buttons">
    <div style="width: auto" />
    <div class="flex-between gap-2">
      {#if $allowGuestSignUpStore}
        <Button label={view.string.ReadOnlyJoinWorkspace} stopPropagation={false} on:click={joinWorkspace} />
      {/if}
      <a href={getMetadata(presentation.metadata.SignupUrl)} target="_blank">
        <Button label={view.string.ReadOnlySignUp} stopPropagation={false} kind="primary" />
      </a>
    </div>
  </svelte:fragment>
</NotificationToast>
