<script lang="ts">
    import { Status, Severity, OK } from '@hcengineering/platform'
    import { Button } from '@hcengineering/ui'
    import login from '../plugin'

    export let redirectUrl: string
    export let caption: string = 'Login with SSO'
    export let subtitle: string = "Login with SSO"
    export let onLoginStart: (() => void) | undefined = undefined

    let status = OK

    const handleSSOLogin = () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
      if (onLoginStart) onLoginStart()

      // redirect
      window.location.href = redirectUrl
    }
  </script>

  <div class="login-sso-container">
    {#if subtitle}
      <p class="subtitle">Login With SSO</p>
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
