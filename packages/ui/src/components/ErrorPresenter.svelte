<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { tooltip } from '../tooltips'
  import ErrorPopup from './ErrorPopup.svelte'
  export let error: any
</script>

<div use:tooltip={{ component: ErrorPopup, props: { error } }}>
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="7.275" stroke="#EE7A7A" stroke-width="1.2" />
    <path
      d="M9.51371 11.6902L9.51636 11.7875H9.61367H10.4137H10.511L10.5136 11.6902L10.6886 5.27772L10.6914 5.17499H10.5887H9.43867H9.33591L9.33871 5.27772L9.51371 11.6902ZM10.0012 14.375C10.4929 14.375 10.9012 13.9812 10.9012 13.475C10.9012 12.9687 10.4929 12.575 10.0012 12.575C9.50947 12.575 9.10117 12.9687 9.10117 13.475C9.10117 13.9812 9.50947 14.375 10.0012 14.375Z"
      fill="#EE7A7A"
      stroke="#EE7A7A"
      stroke-width="0.2"
    />
  </svg>
</div>
