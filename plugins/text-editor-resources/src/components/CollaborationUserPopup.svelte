<!--
//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { Component } from '@hanzo/ui'
  import view from '@hanzo/view'
  import { CollaborationUser } from '@hanzo/text-editor'

  export let user: CollaborationUser
</script>

<Component
  is={view.component.PersonIdPresenter}
  props={{
    value: user.id,
    shouldShowAvatar: true,
    shouldShowName: true
  }}
/>
