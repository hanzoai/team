<script lang="ts">
  import { OK, Severity, Status } from '@hanzo/platform'
  import { Location, getCurrentLocation, navigate } from '@hanzo/ui'

  import { checkJoined, join, setLoginInfo, signUpJoin } from '../utils'
  import Form from './Form.svelte'

  import { Analytics } from '@hanzo/analytics'
  import { signupStore } from '@hanzo/analytics-providers'
  import { logIn, workbenchId } from '@hanzo/workbench'
  import { onMount } from 'svelte'
  import { loginAction, recoveryAction } from '../actions'
  import login from '../plugin'

  const location = getCurrentLocation()
  Analytics.handleEvent('invite_link_activated', { invite_id: location.query?.inviteId })
  let page = 'signUp'

  $: signupStore.setSignUpFlow(page === 'signUp')

  $: fields =
    page === 'login'
      ? [
          { id: 'email', name: 'username', i18n: login.string.Email },
          {
            id: 'current-password',
            name: 'password',
            i18n: login.string.Password,
            password: true
          }
        ]
      : [
          { id: 'given-name', name: 'first', i18n: login.string.FirstName, short: true },
          { id: 'family-name', name: 'last', i18n: login.string.LastName, short: true },
          { id: 'email', name: 'username', i18n: login.string.Email },
          { id: 'new-password', name: 'password', i18n: login.string.Password, password: true },
          { id: 'new-password', name: 'password2', i18n: login.string.PasswordRepeat, password: true }
        ]

  $: object = {
    first: '',
    last: '',
    username: '',
    password: '',
    password2: ''
  }

  let status = OK

  $: action = {
    i18n: page === 'login' ? login.string.Join : login.string.SignUp,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

      const [loginStatus, result] =
        page === 'login'
          ? await join(
            object.username,
            object.password,
            location.query?.inviteId ?? '',
            location.query?.workspace ?? ''
          )
          : await signUpJoin(
            object.username,
            object.password,
            object.first,
            object.last,
            location.query?.inviteId ?? '',
            location.query?.workspace ?? ''
          )
      status = loginStatus

      if (result != null) {
        await logIn(result)
        setLoginInfo(result)

        if (location.query?.navigateUrl != null) {
          try {
            const loc = JSON.parse(decodeURIComponent(location.query.navigateUrl)) as Location
            if (loc.path[1] === result.workspaceUrl) {
              navigate(loc)
              return
            }
          } catch (err: any) {
            // Json parse error could be ignored
          }
        }

        navigate({ path: [workbenchId, result.workspaceUrl] })
      }
    }
  }

  $: secondaryButtonLabel = page === 'login' ? login.string.SignUp : login.string.Join
  $: secondaryButtonAction =
    page === 'login'
      ? () => {
          page = 'signUp'
        }
      : () => {
          page = 'login'
        }

  onMount(() => {
    void check()
  })

  async function check (): Promise<void> {
    if (location.query?.inviteId === undefined || location.query?.inviteId === null) return
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

    const result = await checkJoined(location.query.inviteId)
    status = OK
    if (result != null) {
      setLoginInfo(result)

      if (location.query?.navigateUrl != null) {
        try {
          const loc = JSON.parse(decodeURIComponent(location.query.navigateUrl)) as Location
          if (loc.path[1] === result.workspaceUrl) {
            navigate(loc)
            return
        }


        const [status, result] = await checkJoined(location.query.inviteId)
            if (result != null) {
            setLoginInfo(result)
            navigate({ path: [result.workspaceUrl] })
            } else {
                localStorage.setItem('inviteId', location.query.inviteId)
                window.location.href = `${ssoDefaultRedirect}&inviteId=${location.query.inviteId}`
            }
    } catch (error) {
        localStorage.setItem('inviteId', location.query.inviteId)
        window.location.href = `${ssoDefaultRedirect}&inviteId=${location.query.inviteId}`
    }
  }
</script>

<style>
  .loading-container {
    text-align: center;
    margin-top: 20vh;
    font-size: 1.2em;
    color: #4a5568;
  }
</style>

<div class="loading-container">
  Loading...
</div>
