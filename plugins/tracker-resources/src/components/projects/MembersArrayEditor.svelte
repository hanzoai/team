<script lang="ts">
  import { AccountArrayEditor } from '@hanzo/contact-resources'
  import contact from '@hanzo/contact-resources/src/plugin'
  import { getClient } from '@hanzo/presentation'
  import { Project } from '@hanzo/tracker'
  export let value: Project
</script>

<AccountArrayEditor
  label={contact.string.Members}
  value={value.members}
  onChange={(evt) => {
    void getClient().diffUpdate(value, { members: evt })
  }}
/>
