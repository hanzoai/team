<script lang="ts">
    import { OK, Severity, Status } from '@hanzoteam/platform'
    import { Button } from '@hanzoteam/ui'
    import login from '../plugin'

    const IAM_SERVER = 'https://iam.hanzo.ai'
    const IAM_CLIENT_ID = '53c6bc50e68466764b58'

    export let subtitle: string = 'Login with SSO'
    export let onLoginStart: (() => void) | undefined = undefined

    let status = OK

    function buildSSOUrl (): string {
      const iamServer = IAM_SERVER
      const redirectUri = `${window.location.origin}/login/authCallback`
      const params = new URLSearchParams({
        client_id: IAM_CLIENT_ID,
        scope: 'openid email profile',
        response_type: 'code',
        redirect_uri: redirectUri
      })
      return `${iamServer}/login/oauth/authorize?${params.toString()}`
    }

    const handleSSOLogin = () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
      if (onLoginStart) onLoginStart()

      window.location.href = buildSSOUrl()
    }
  </script>

  <div class="login-sso-container">
    {#if subtitle}
      <p class="subtitle">{subtitle}</p>
    {/if}
    <Button on:click={handleSSOLogin}>
      Login with SSO
    </Button>
  </div>

  <style>
    .login-sso-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
    }

    .subtitle {
      font-size: 1rem;
      color: #666;
      text-align: center;
    }
  </style>
