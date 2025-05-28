
  <script lang="ts">
    import { getMetadata } from '@hcengineering/platform'
    import presentation from '@hcengineering/presentation'
    import { onMount } from 'svelte'
    import loginLogo from "../../img/logo_login.png"
    const urlFE = getMetadata(presentation.metadata.FrontUrl) || "https://hanzo.team"
    const clientId = getMetadata(presentation.metadata.IamClientId) || "unknown"
    const iamServer = getMetadata(presentation.metadata.IamServer) || "https://iam.hanzo.ai"
    const ssoDefaultRedirect = `${iamServer}/login/oauth/authorize?client_id=${clientId}&scope=openid%20email%20profile&response_type=code&redirect_uri=${urlFE}/login/authCallback`


  function loginWithSSO(): void {
    window.location.href = ssoDefaultRedirect;
  }

  onMount(() => {
    const pathname = window.location.pathname;
    if (pathname.includes('/login')) {
    sessionStorage.clear();
      setTimeout(() => {
        loginWithSSO();
      }, 2000);
    }
  });
</script>

<div class="login-container">
    <img
        src={loginLogo}
        srcset={`${loginLogo} 1x, ${loginLogo} 2x`}
        alt=""
        style="
            width: 50px;
            height: 50px;
        "
    />
    <h2>Sign in to your account</h2>
    <button class="sso-button" on:click={loginWithSSO}>Hanzo IAM</button>
    <p>
        By signing in you are agreeing to our
        <a href="/terms">Terms and Conditions</a>,
        <a href="/privacy">Privacy Policy</a>, and
        <a href="/cookies">Cookie Policy</a>.
        You also confirm that the entered data is accurate.
    </p>
</div>

<style lang="scss">
    .login-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 2rem;
        color: var(--theme-content-color);
    }

    .sso-button {
        background-color: #2c5eff;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: bold;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .sso-button:hover {
        background-color: #1d45cc;
    }

    a {
        color: var(--theme-link-color);
        text-decoration: underline;
    }

    a:hover {
        color: #1d45cc;
    }

    p {
        text-align: center;
        font-size: 0.875rem;
        margin-top: 1rem;
    }
</style>
