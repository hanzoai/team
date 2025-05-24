<script lang="ts">
  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { navigate } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import { StepAuthenticationSSO } from '../const'

  import {
    checkAutoJoin,
    clearSSOLogin,
    doLoginNavigate,
    exchangeCodeForToken,
    getSSOLogin,
    loginOtp,
    saveSSOLoginToLocalStorage,
    signUpOtp
  } from '../utils'
  import OtpForm from './OtpForm.svelte'

  // meda data
  const iam_server = getMetadata(presentation.metadata.IamServer) || 'https://iam.hanzo.ai'

  let step: StepAuthenticationSSO = 'authenticating'
  let email: string = ''
  let retryOn = 0
  let ssoToken: string = ''
  let team_uuid = ''
  let owner = ''
  let casdoorName = ''
  let invitedId = ''
  export let navigateUrl: string | undefined = undefined

  onMount(async () => {
    // check local storage if exist retryOn, token, userInfo
    const dataLoginSSOIfExist = getSSOLogin()
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')
    invitedId = localStorage.getItem('inviteId') || ''

    if (error) {
      alert('SSO Error: ' + error)
      navigate({ path: ['/login'] })
      return
    }

    if (!code) {
      alert('Missing code')
      navigate({ path: ['/login'] })

      return
    }

    try {
      let user, token
      try {
        const infoToken = await exchangeCodeForToken(code)
        user = infoToken.user
        token = infoToken.token
        if (dataLoginSSOIfExist && dataLoginSSOIfExist.user?.email !== user.email) {
          clearSSOLogin(true)
          invitedId = ''
          localStorage.removeItem('inviteId')
        }
        ssoToken = token
        email = user.email
        const firstName = user.firstName ?? ''
        const lastName = user.lastName ?? ''
        casdoorName = user.name
        owner = user.owner
        const [signUpStatus, signUpResult] = await signUpOtp(email, firstName, lastName)

        if (signUpResult != null) {
          retryOn = signUpResult.retryOn
          step = 'otp'
          saveSSOLoginToLocalStorage({ retryOn, user, token })
          return
        }

        const [loginStatus, loginResult] = await loginOtp(email)

        if (loginResult != null) {
          retryOn = loginResult.retryOn
          step = 'otp'
          saveSSOLoginToLocalStorage({ retryOn, user, token })
          return
        }
        throw new Error('Login failed')
      } catch (err: any) {
        if (dataLoginSSOIfExist && dataLoginSSOIfExist.user?.email === user.email) {
          retryOn = dataLoginSSOIfExist.retryOn
          ssoToken = dataLoginSSOIfExist.token
          email = user?.email
          casdoorName = user?.name
          owner = user?.owner
          step = 'otp'
          return
        }
        alert('Error occure when loggin with SSO')
      }
    } catch (err: any) {
      console.error('SSO error:', err)
      alert('SSO error: ' + err.message)
    }
  })
</script>

{#if step === 'authenticating'}
  <div>Authenticating with Hanzo IAM...</div>
{:else if step === 'otp'}
  <OtpForm
    {email}
    {retryOn}
    {navigateUrl}
    signUpDisabled={true}
    onLogin={async (event) => {
      const team_uuid = event?.account
      const token = event?.token

      if (invitedId) {
        console.log(`🛠️ Auto-Join với inviteId: ${invitedId}`)
        const [checkStatus, autoJoinResult] = await checkAutoJoin(invitedId, '', '', token)

        if (autoJoinResult && autoJoinResult.workspaceUrl) {
          clearSSOLogin()
          localStorage.removeItem('inviteId')
        }
      }

      clearSSOLogin()
      await doLoginNavigate(event, () => {}, navigateUrl)
    }}
  />
{/if}
