<script lang="ts">
    import { LoginInfo } from '@hanzo/account-client'
    import { type IntlString, type Status } from '@hanzo/platform'
    import { type BottomAction, LoginMethods } from '../index'
    import login from '../plugin'
    import BottomActionComponent from './BottomAction.svelte'
    import LoginOtpForm from './LoginOtpForm.svelte'
    import LoginPasswordForm from './LoginPasswordForm.svelte'
    let urlFE = process.env.URL_FRONTEND || "https://hanzo.team"
    export let navigateUrl: string | undefined = undefined
    export let signUpDisabled = false
    export let email: string | undefined = undefined
    export let caption: IntlString | undefined = undefined
    export let subtitle: string | undefined = undefined
    export let onLogin: ((loginInfo: LoginInfo | null, status: Status) => void | Promise<void>) | undefined = undefined
    export let ssoRedirectUrl: string | undefined = `https://iam.hanzo.ai/login/oauth/authorize?client_id=53c6bc50e68466764b58&scope=openid%20email%20profile&response_type=code&redirect_uri=${urlFE}/login/authCallback`

    let method: LoginMethods = LoginMethods.Otp

    function changeMethod(event: CustomEvent<LoginMethods>): void {
      method = event.detail
    }

    const loginWithPasswordAction: BottomAction = {
      i18n: login.string.LoginWithPassword,
      func: () => {
        method = LoginMethods.Password
      }
    }

    const loginWithCodeAction: BottomAction = {
      i18n: login.string.LoginWithCode,
      func: () => {
        method = LoginMethods.Otp
      }
    }

    function loginWithSSO(): void {
      window.location.href = ssoRedirectUrl ?? "https://iam.hanzo.ai/login/oauth/authorize"
    }
  </script>

  {#if method === LoginMethods.Otp}
    <LoginOtpForm {navigateUrl} {signUpDisabled} {email} {caption} {subtitle} {onLogin} on:change={changeMethod} />
    <div class="action">
      <BottomActionComponent action={loginWithPasswordAction} />
      <button class="sso-button" on:click={loginWithSSO}>Login with SSO</button>
    </div>
  {:else if method === LoginMethods.Password}
    <LoginPasswordForm {navigateUrl} {signUpDisabled} {email} {caption} {subtitle} {onLogin} on:change={changeMethod} />
    <div class="action">
      <BottomActionComponent action={loginWithCodeAction} />
      <button class="sso-button" on:click={loginWithSSO}>Login with SSO</button>
    </div>
  {/if}

  <style lang="scss">
    .action {
      margin-left: 5rem;
      margin-top: 1rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
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
  </style>
