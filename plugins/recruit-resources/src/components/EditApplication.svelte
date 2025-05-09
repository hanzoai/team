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
  import { createQuery } from '@hanzo/presentation'
  import type { Applicant, Candidate, Vacancy } from '@hanzo/recruit'
  import { Scroller } from '@hanzo/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import CandidateCard from './CandidateCard.svelte'
  import VacancyCard from './VacancyCard.svelte'
  import ExpandRightDouble from './icons/ExpandRightDouble.svelte'

  import recruit from '../plugin'
  import Reviews from './review/Reviews.svelte'

  export let object: Applicant
  export let readonly: boolean = false
  let candidate: Candidate
  let vacancy: Vacancy

  const dispatch = createEventDispatcher()
  const sendOpen = () => {
    if (object !== undefined) {
      dispatch('open', {
        ignoreKeys: ['comments', 'number', 'identifier'],
        allowedCollections: ['labels'],
        title: object.identifier
      })
    }
  }

  const candidateQuery = createQuery()
  $: if (object !== undefined) {
    candidateQuery.query(recruit.mixin.Candidate, { _id: object.attachedTo }, (result) => {
      candidate = result[0]
      sendOpen()
    })
  }

  const vacancyQuery = createQuery()
  $: if (object !== undefined) {
    vacancyQuery.query(recruit.class.Vacancy, { _id: object.space }, (result) => {
      vacancy = result[0]
    })
  }

  onMount(() => {
    sendOpen()
  })
</script>

{#if object !== undefined && candidate !== undefined}
  <Scroller horizontal stickedScrollBars>
    <div class="flex-between min-w-min">
      <div class="card"><CandidateCard {candidate} disabled={readonly} on:click /></div>
      <div class="flex-center arrows"><ExpandRightDouble /></div>
      <div class="card"><VacancyCard {vacancy} disabled={readonly} /></div>
    </div>
  </Scroller>
  <div class="mt-6">
    <Reviews
      objectId={candidate._id}
      reviews={candidate.reviews ?? 0}
      label={recruit.string.TalentReviews}
      application={object?._id}
      company={vacancy?.company}
      {readonly}
    />
  </div>
{/if}

<style lang="scss">
  .card {
    flex-shrink: 0;
    align-self: stretch;
    width: calc(50% - 5rem);
    min-width: max-content;
    min-height: 16rem;
  }
  .arrows {
    flex-shrink: 0;
    width: 4rem;
  }
</style>
