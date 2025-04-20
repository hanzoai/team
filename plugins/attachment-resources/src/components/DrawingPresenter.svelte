<script lang="ts">
  import { type Drawing } from '@hanzo/attachment'
  import { DateRangeMode } from '@hanzo/core'
  import { DatePresenter, IconScribble } from '@hanzo/ui'
  import { PersonIdPresenter } from '@hanzo/view-resources'

  export let value: Drawing
</script>

<div class="flex-presenter flex-gap-3">
  <DatePresenter value={value.createdOn} mode={DateRangeMode.DATETIME} kind="list" icon={IconScribble} />
  <PersonIdPresenter value={value.createdBy} shouldShowName={false} />
</div>
