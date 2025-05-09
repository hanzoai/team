<script lang="ts">
  import {
    BitrixEntityMapping,
    BitrixFieldMapping,
    CreateHRApplication,
    Fields,
    MappingOperation,
    getAllAttributes
  } from '@hanzo/bitrix'
  import { AnyAttribute, Status } from '@hanzo/core'
  import { getEmbeddedLabel } from '@hanzo/platform'
  import { getClient } from '@hanzo/presentation'
  import InlineAttributeBarEditor from '@hanzo/presentation/src/components/InlineAttributeBarEditor.svelte'
  import recruit from '@hanzo/recruit'
  import task from '@hanzo/task'
  import { Button, DropdownLabels, DropdownLabelsIntl, DropdownTextItem, IconAdd } from '@hanzo/ui'
  import { ObjectBox } from '@hanzo/view-resources'
  import bitrix from '../../plugin'

  export let mapping: BitrixEntityMapping
  export let fields: Fields = {}
  export let attribute: AnyAttribute
  export let field: BitrixFieldMapping | undefined

  let stateField = (field?.operation as CreateHRApplication)?.stateField
  let vacancyField = (field?.operation as CreateHRApplication)?.vacancyField
  let defaultTemplate = (field?.operation as CreateHRApplication)?.defaultTemplate
  let copyTalentFields = (field?.operation as CreateHRApplication)?.copyTalentFields ?? []
  let stateMapping = (field?.operation as CreateHRApplication)?.stateMapping ?? []

  const client = getClient()

  export async function save (): Promise<void> {
    if (field !== undefined) {
      await client.update(field, {
        operation: {
          kind: MappingOperation.CreateHRApplication,
          stateField,
          vacancyField,
          defaultTemplate,
          copyTalentFields,
          stateMapping
        }
      })
    } else {
      await client.addCollection(bitrix.class.FieldMapping, mapping.space, mapping._id, mapping._class, 'fields', {
        ofClass: attribute.attributeOf,
        attributeName: attribute.name,
        operation: {
          kind: MappingOperation.CreateHRApplication,
          stateField,
          vacancyField,
          defaultTemplate,
          copyTalentFields,
          stateMapping
        }
      })
    }
  }

  function getItems (fields: Fields): DropdownTextItem[] {
    return Object.entries(fields).map((it) => ({
      id: it[0],
      label: `${it[1].formLabel ?? it[1].title}${it[0].startsWith('UF_') ? ' *' : ''}`
    }))
  }
  $: items = getItems(fields)

  $: allAttrs = Array.from(getAllAttributes(client, recruit.mixin.Candidate).values())
  $: attrs = allAttrs.map((it) => ({ id: it.name, label: it.label }))

  $: applicantAllAttrs = Array.from(client.getHierarchy().getAllAttributes(recruit.class.Applicant).values())
  $: applicantAttrs = applicantAllAttrs.map((it) => ({ id: it.name, label: it.label }))

  $: sourceStates = Array.from(mapping.bitrixFields[stateField].items?.values() ?? []).map((it) => ({
    id: it.VALUE,
    label: it.VALUE
  }))

  const states: Status[] = []

  $: stateTitles = [{ id: '', label: 'None' }, ...states.map((it) => ({ id: it.name, label: it.name }))]
</script>

<div class="flex-col flex-wrap">
  <div class="flex-row-center gap-2">
    <div class="flex-col w-120">
      <div class="flex-row-center p-1">
        <span class="w-22"> Vacancy: </span>
        <DropdownLabels
          width={'10rem'}
          label={getEmbeddedLabel('Vacancy field')}
          {items}
          bind:selected={vacancyField}
        />
      </div>
      <div class="flex-row-center p-1">
        <span class="w-22"> State: </span>
        <DropdownLabels width={'10rem'} label={getEmbeddedLabel('State field')} {items} bind:selected={stateField} />
      </div>
      <div class="flex-row-center p-1">
        <span class="w-22"> Template: </span>
        <ObjectBox
          width={'10rem'}
          label={getEmbeddedLabel('Template')}
          searchField={'title'}
          _class={task.class.ProjectType}
          docQuery={{ category: recruit.category.VacancyTypeCategories }}
          bind:value={defaultTemplate}
        />
      </div>

      <div class="mt-2 mb-1 flex-row-center p-1">
        <span class="mr-2"> Copy following fields: </span>
        <Button
          icon={IconAdd}
          size={'small'}
          on:click={() => {
            copyTalentFields = [
              ...copyTalentFields,
              { candidate: allAttrs[0]._id, applicant: applicantAllAttrs[0]._id }
            ]
          }}
        />
      </div>
      <div class="flex-col flex-wrap">
        {#each copyTalentFields as f, i}
          <div class="flex-row-center pattern">
            <DropdownLabelsIntl
              width={'10rem'}
              label={getEmbeddedLabel('Copy field')}
              items={attrs}
              bind:selected={f.candidate}
            /> =>
            <DropdownLabelsIntl
              width={'10rem'}
              label={getEmbeddedLabel('Copy field')}
              items={applicantAttrs}
              bind:selected={f.applicant}
            />
          </div>
        {/each}
      </div>
      <div class="mt-2 mb-1 flex-row-center p-1">
        <span class="mr-2"> State mapping: </span>
        <Button
          icon={IconAdd}
          size={'small'}
          on:click={() => {
            stateMapping = [...stateMapping, { sourceName: '', targetName: '', updateCandidate: [] }]
          }}
        />
      </div>
      <div class="flex-co">
        {#each stateMapping as m}
          <div class="flex-row-center pattern flex-between flex-wrap">
            <DropdownLabels
              width={'10rem'}
              label={getEmbeddedLabel('Source state')}
              items={sourceStates}
              kind={m.sourceName !== '' ? 'primary' : 'regular'}
              bind:selected={m.sourceName}
            /> =>
            <DropdownLabels
              width={'10rem'}
              kind={m.targetName !== '' ? 'primary' : 'regular'}
              label={getEmbeddedLabel('Final state')}
              items={stateTitles}
              bind:selected={m.targetName}
            />
            {#each m.updateCandidate as c}
              {@const attribute = allAttrs.find((it) => it.name === c.attr)}
              <DropdownLabelsIntl
                width={'10rem'}
                label={getEmbeddedLabel('Field to fill')}
                items={attrs}
                bind:selected={c.attr}
              />
              {#if attribute}
                =>
                <InlineAttributeBarEditor
                  _class={recruit.mixin.Candidate}
                  key={{ key: 'value', attr: attribute }}
                  draft
                  object={c}
                />
              {/if}
            {/each}
            <Button
              icon={IconAdd}
              size={'small'}
              on:click={() => {
                m.updateCandidate = [...m.updateCandidate, { attr: allAttrs[0]._id, value: undefined }]
              }}
            />
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .pattern {
    margin: 0.5rem;
    padding: 0.5rem;
    flex-shrink: 0;
    border: 1px dashed var(--accent-color);
    border-radius: 0.25rem;

    font-weight: 500;
    font-size: 0.75rem;

    // text-transform: uppercase;
    color: var(--accent-color);
    &:hover {
      color: var(--caption-color);
    }
  }
  .scroll {
    overflow: auto;
  }
</style>
