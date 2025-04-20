<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->
<script lang="ts">
  import { checkMyPermission, permissionsStore } from '@hanzo/contact-resources'
  import { type TrainingRequest } from '@hanzo/training'
  import type { DocumentQuery } from '@hanzo/core'
  import { type IModeSelector, navigate, rawLocation } from '@hanzo/ui'
  import { SpecialView } from '@hanzo/workbench-resources'
  import { type ComponentProps } from 'svelte'
  import training from '../plugin'
  import { sentRequestRoute, SentRequestsRouteTab } from '../routing/routes/sentRequestsRoute'
  import { getCurrentEmployeeRef } from '../utils'

  type $$Props = ComponentProps<SpecialView>
  $: ({ baseQuery, ...rest } = $$props as $$Props)

  const tabs: IModeSelector<SentRequestsRouteTab>['config'] = [
    [SentRequestsRouteTab.Active, training.string.Active, {}],
    [SentRequestsRouteTab.Canceled, training.string.Canceled, {}],
    [SentRequestsRouteTab.All, training.string.All, {}]
  ]

  let modes: IModeSelector<SentRequestsRouteTab>
  $: {
    modes = {
      config: tabs,
      mode: tabs[0][0],
      onChange: (tab) => {
        navigate(sentRequestRoute.build({ tab }))
      }
    }
  }

  $: modes.mode = sentRequestRoute.match($rawLocation)?.tab ?? modes.mode

  const queries: Record<SentRequestsRouteTab, DocumentQuery<TrainingRequest>> = {
    [SentRequestsRouteTab.Active]: { canceledOn: null },
    [SentRequestsRouteTab.Canceled]: { canceledOn: { $ne: null } },
    [SentRequestsRouteTab.All]: {}
  }

  let extendedBaseQuery: DocumentQuery<TrainingRequest>
  $: {
    const canReadAny = checkMyPermission(
      training.permission.ViewSomeoneElsesSentRequest,
      training.space.Trainings,
      $permissionsStore
    )
    extendedBaseQuery = {
      ...((baseQuery ?? {}) as DocumentQuery<TrainingRequest>),
      ...queries[modes.mode],
      ...(canReadAny ? {} : { owner: getCurrentEmployeeRef() })
    }
  }
</script>

<SpecialView {...rest} baseQuery={extendedBaseQuery} {modes} />
