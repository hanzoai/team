<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { RoomLanguage } from '@hanzo/love'

  import { languagesDisplayData } from '../types'

  export let lang: RoomLanguage
  export let size: 'small' | 'medium' = 'small'
</script>

<div class={size}>
  {languagesDisplayData[lang]?.emoji}
</div>

<style lang="scss">
  .small {
    font-size: 1rem;
  }

  .medium {
    font-size: 2rem;
  }
</style>
