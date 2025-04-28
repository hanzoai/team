<script lang="ts">
    import { setMetadata } from '@hanzo/platform'
    import presentation from '@hanzo/presentation'
    import { navigate, setMetadataLocalStorage } from '@hanzo/ui'
    import { onMount } from 'svelte'
    import login from '../plugin'
    import {
      doLogin,
      getWorkspaces,
      navigateToWorkspace,
      selectWorkspace,
      setLoginInfo,
      signUp,
    } from '../utils'


    let domainFE = process.env.URL_FRONTEND || "https://hanzo.team"

    async function exchangeCodeForToken(code: string): Promise<{ token: string, user: any }> {
      const response = await fetch('https://iam.hanzo.ai/api/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: '53c6bc50e68466764b58',
          client_secret: '9d2a2711fd4ce3927dd083e846524bc5c6a8c0c3',
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${domainFE}/login/callback`,
        }),
      })
      const data = await response.json()
      if (!data.access_token) throw new Error('No token returned')

      const userInfo = await fetch(`https://iam.hanzo.ai/api/get-account?access_token=${data.access_token}`)
        .then(res => res.json())

      return { token: data.access_token, user: userInfo }
    }

    onMount(async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')

      if (error) {
        alert('SSO Error: ' + error)
        navigate({ path: ['login'] })
        return
      }

      if (!code) {
        navigate({ path: ['login'] })
        return
      }

      try {
        const { token: iamToken, user } = await exchangeCodeForToken(code)

        const email = user.data.email
        const password = user.data.password || "1234"
        const firstName = user.data.firstName ?? ''
        const lastName = user.data.lastName ?? ''

        let loginInfo = null

        // 👉 B1. Thử signUp
        const [signUpStatus, signUpResult] = await signUp(email, password, firstName, lastName)

        if (signUpResult != null) {
          loginInfo = signUpResult
        } else {
          // 👉 B2. Nếu signUp fail, fallback login
          const [loginStatus, loginResult] = await doLogin(email, password)

          if (loginResult != null) {
            loginInfo = loginResult
          } else {
            throw new Error('Login after SSO failed')
          }
        }

        if (!loginInfo?.token) {
          throw new Error('No platform token')
        }

        // ✅ Gán token vào Platform
        setMetadata(presentation.metadata.Token, loginInfo.token)
        setMetadataLocalStorage('sso.isIAM', 'true')
        setMetadataLocalStorage(login.metadata.LoginAccount, email)
        setMetadataLocalStorage(login.metadata.LastAccount, email)

        // 👉 Tiếp tục flow chọn workspace
        const workspaces = await getWorkspaces()

        if (workspaces.length === 0) {
          navigate({ path: ['login', 'createWorkspace'] })
        } else if (workspaces.length === 1) {
          const selected = workspaces[0]
          const [status, workspaceLoginInfo] = await selectWorkspace(selected.url)

          if (status.code === 'OK' && workspaceLoginInfo) {
            setLoginInfo(workspaceLoginInfo)
            navigateToWorkspace(selected.url, workspaceLoginInfo)
          } else {
            navigate({ path: ['login', 'selectWorkspace'] })
          }
        } else {
          navigate({ path: ['login', 'selectWorkspace'] })
        }
      } catch (err: any) {
        console.error('SSO exchange error:', err)
        alert('SSO error: ' + err.message)
        navigate({ path: ['login'] })
      }
    })
    </script>

    <p>Authenticating with Hanzo IAM...</p>
