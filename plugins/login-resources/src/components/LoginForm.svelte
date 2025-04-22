<script lang="ts">
    import { type IntlString, type Status } from '@hcengineering/platform'

    import { LoginInfo } from '@hcengineering/account-client'
    import { type BottomAction, LoginMethods } from '../index'
    import login from '../plugin'
    import BottomActionComponent from './BottomAction.svelte'
    import LoginOtpForm from './LoginOtpForm.svelte'
    import LoginPasswordForm from './LoginPasswordForm.svelte'
    import LoginSSOForm from './LoginSSOForm.svelte'

    export let navigateUrl: string | undefined = undefined
    export let signUpDisabled = false
    export let email: string | undefined = undefined
    export let caption: IntlString | undefined = undefined
    export let subtitle: string | undefined = undefined
    export let onLogin: ((loginInfo: LoginInfo | null, status: Status) => void | Promise<void>) | undefined = undefined
    export let ssoRedirectUrl: string | undefined = undefined

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

    const loginWithSSOAction: BottomAction = {
      i18n: login.string.LoginWithSSO ?? 'Login with SSO',
      func: () => {
        method = LoginMethods.SSO
      }
    }
  </script>

  {#if method === LoginMethods.Otp}
    <LoginOtpForm {navigateUrl} {signUpDisabled} {email} {caption} {subtitle} {onLogin} on:change={changeMethod} />
    <div class="action">
      <BottomActionComponent action={loginWithPasswordAction} />
      <BottomActionComponent action={loginWithSSOAction} />
    </div>
  {:else if method === LoginMethods.Password}
    <LoginPasswordForm {navigateUrl} {signUpDisabled} {email} {caption} {subtitle} {onLogin} on:change={changeMethod} />
    <div class="action">
      <BottomActionComponent action={loginWithCodeAction} />
      <BottomActionComponent action={loginWithSSOAction} />
    </div>
  {:else if method === LoginMethods.SSO}
    <LoginSSOForm redirectUrl={ssoRedirectUrl} caption="Đăng nhập với SSO" />
    <div class="action">
      <BottomActionComponent action={loginWithPasswordAction} />
      <BottomActionComponent action={loginWithCodeAction} />
    </div>
  {/if}

  <style lang="scss">
    .action {
      margin-left: 5rem;
      margin-top: 1rem;
      display: flex;
      gap: 1rem;
    }
  </style>
