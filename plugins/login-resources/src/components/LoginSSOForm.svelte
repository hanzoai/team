<script lang="ts">
    import { onMount } from 'svelte';
    import { Status, Severity, OK } from '@hcengineering/platform';
    import { Button } from '@hcengineering/ui';
    import login from '../plugin';

    export let caption: string = 'Login with SSO';
    export let subtitle: string = "Login with SSO";
    export let redirectUrl: string = "https://iam.hanzo.ai/login/oauth/authorize?client_id=ce89cf9741eccb80367f&scope=openid%20email%20profile&response_type=code&redirect_uri=http://localhost:8081/api/auth/callback/hanzo-iam";
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
