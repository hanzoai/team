<script lang="ts">
  import {
    BitrixEntityMapping,
    BitrixFieldMapping,
    DownloadAttachmentOperation,
    Fields,
    MappingOperation
  } from '@hanzo/bitrix'
  import { AnyAttribute } from '@hanzo/core'
  import { getClient } from '@hanzo/presentation'
  import { Button, DropdownTextItem, IconAdd, IconDelete, DropdownLabels } from '@hanzo/ui'
  import bitrix from '../../plugin'

  export let mapping: BitrixEntityMapping
  export let fields: Fields = {}
  export let attribute: AnyAttribute
  export let field: BitrixFieldMapping | undefined

  let downloadFields: { field: string }[] = [...((field?.operation as DownloadAttachmentOperation)?.fields ?? [])]

  const client = getClient()

  export async function save (): Promise<void> {
    if (field !== undefined) {
      await client.update(field, {
        operation: {
          kind: MappingOperation.DownloadAttachment,
          fields: downloadFields
        }
      })
    } else {
      await client.addCollection(bitrix.class.FieldMapping, mapping.space, mapping._id, mapping._class, 'fields', {
        ofClass: attribute.attributeOf,
        attributeName: attribute.name,
        operation: {
          kind: MappingOperation.DownloadAttachment,
          fields: downloadFields
        }
      })
    }
  }

  function getItems (fields: Fields): DropdownTextItem[] {
    return Object.entries(fields)
      .filter((it) => it[1].type === 'file')
      .map((it) => ({
        id: it[0],
        label: `${it[1].formLabel ?? it[1].title}${it[0].startsWith('UF_') ? ' *' : ''} - ${it[0]}`
      }))
  }
  $: items = getItems(fields)
</script>

<div class="flex-col flex-wrap">
  {#each downloadFields as p, i}
    <div class="pattern flex-row-center gap-2">
      <DropdownLabels minW0={false} label={bitrix.string.FieldMapping} {items} bind:selected={p.field} />

      <div class="ml-1">
        <Button
          icon={IconDelete}
          size={'small'}
          on:click={() => {
            downloadFields.splice(i, 1)
            downloadFields = downloadFields
          }}
        />
      </div>
    </div>
  {/each}
  <div class="ml-2">
    <Button
      icon={IconAdd}
      size={'small'}
      on:click={() => {
        downloadFields = [...downloadFields, { field: items[0].id }]
      }}
    />
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
</style>
