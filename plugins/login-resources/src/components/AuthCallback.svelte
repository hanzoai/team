<script lang="ts">
    import { onMount } from 'svelte';

    onMount(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');

      if (token) {
        localStorage.setItem('access_token', token);
        window.location.href = '/'; // Redirect to dashboard or home
      } else if (error) {
        alert('SSO Error: ' + error);
        window.location.href = '/login/signup';
      }
    });
  </script>

  <p>Authenticating...</p>
