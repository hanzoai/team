<script lang="ts">
    import { OK, Severity, Status } from '@hanzo/platform'
    import { Button } from '@hanzo/ui'
    import login from '../plugin'

    export let subtitle: string = "Login with SSO";
    export let redirectUrl: string = "https://iam.hanzo.ai/login/oauth/authorize?client_id=53c6bc50e68466764b58&scope=openid%20email%20profile&response_type=code&redirect_uri=http://localhost:8081/login/authCallback";
    export let onLoginStart: (() => void) | undefined = undefined;

    let status = OK;

    const handleSSOLogin = () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {});
      if (onLoginStart) onLoginStart();

      // Redirect to SSO
      window.location.href = redirectUrl;
    };
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
