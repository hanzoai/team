<script lang="ts">
  import { type Drawing } from '@hanzoteam/attachment'
  import { DateRangeMode } from '@hanzoteam/core'
  import { DatePresenter, IconScribble } from '@hanzoteam/ui'
  import { PersonIdPresenter } from '@hanzoteam/view-resources'

  export let value: Drawing
</script>

<div class="flex-presenter flex-gap-3">
  <DatePresenter value={value.createdOn} mode={DateRangeMode.DATETIME} kind="list" icon={IconScribble} />
  <PersonIdPresenter value={value.createdBy} shouldShowName={false} />
</div>
