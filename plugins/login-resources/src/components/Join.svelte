<script lang="ts">
  import { OK, getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { getCurrentLocation, navigate } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import { checkJoined, setLoginInfo } from '../utils'

  // IAM server và client ID
    const urlFE = getMetadata(presentation.metadata.FrontUrl) || "https://hanzo.team"
    const clientId = getMetadata(presentation.metadata.IamClientId) || "unknown"
    const iamServer = getMetadata(presentation.metadata.IamServer) || "https://iam.hanzo.ai"
    const ssoDefaultRedirect = `${iamServer}/signup/oauth/authorize?client_id=${clientId}&scope=openid%20email%20profile&response_type=code&redirect_uri=${urlFE}/login/authCallback`

  let status = OK

  // Lấy thông tin location
  const location = getCurrentLocation()

  onMount(() => {
    void check()
  })

  async function check(): Promise<void> {
    try {
        if (location.query?.inviteId === undefined || location.query?.inviteId === null) {
            alert('Missing inviteId')
            navigate({ path: ["/login"] })
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
