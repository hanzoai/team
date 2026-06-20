<script lang="ts">
  import { AccountArrayEditor } from '@hanzoteam/contact-resources'
  import contact from '@hanzoteam/contact-resources/src/plugin'
  import { getClient } from '@hanzoteam/presentation'
  import { Project } from '@hanzoteam/tracker'
  export let value: Project
</script>

<AccountArrayEditor
  label={contact.string.Members}
  value={value.members}
  onChange={(evt) => {
    void getClient().diffUpdate(value, { members: evt })
  }}
/>
